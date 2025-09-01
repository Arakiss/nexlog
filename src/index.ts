/**
 * nexlog - A blazing-fast logging library for Next.js
 * Main entry point with full Node.js capabilities
 * @packageDocumentation
 */

import { configManager } from "./config.js";
import { COLORS, DEFAULTS, LEVEL_COLORS, LOG_LEVELS } from "./constants.js";
import { contextManager } from "./context/index.js";
import {
	CAPABILITIES,
	detectRuntime,
	HAS_MEMORY_USAGE,
	RUNTIME,
	type RuntimeEnvironment,
} from "./runtime/detector.js";
import { Sanitizer } from "./sanitizer/index.js";
import type {
	ILogger,
	LogEntry,
	LoggerPlugin,
	LogLevel,
	LogMetadata,
	Transport,
} from "./types.js";
import { CircularBuffer } from "./utils/circular-buffer.js";

export * from "./constants.js";
export * from "./context/index.js";
export * from "./runtime/detector.js";
export * from "./sanitizer/index.js";
// Re-export types and utilities
export * from "./types.js";
export * from "./utils/circular-buffer.js";

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
	level?: LogLevel;
	enabled?: boolean;
	ssrOnly?: boolean;
	namespace?: string;
	context?: LogMetadata;
	batchSize?: number;
	flushInterval?: number;
	transports?: Transport[];
	structured?: boolean;
	samplingRate?: number;
	bufferSize?: number;
	sanitize?: boolean;
	sanitizeOptions?: any;
	maskFields?: string[];
}

/**
 * Console transport for standard output
 */
export class ConsoleTransport implements Transport {
	name = "console";
	enabled = true;
	level: LogLevel = "trace";

	private readonly useColors: boolean;
	private readonly structured: boolean;

	constructor(options?: { useColors?: boolean; structured?: boolean }) {
		const env = detectRuntime();
		this.useColors = options?.useColors ?? (env === "node" || env === "bun");
		this.structured = options?.structured ?? false;
	}

	log(entry: LogEntry): void {
		if (!this.shouldLog(entry.level)) return;

		if (this.structured) {
			this.logStructured(entry);
		} else {
			this.logFormatted(entry);
		}
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
	}

	private logStructured(entry: LogEntry): void {
		const output = {
			...entry,
			level: entry.level.toUpperCase(),
		};

		const method = this.getConsoleMethod(entry.level);
		console[method](JSON.stringify(output));
	}

	private logFormatted(entry: LogEntry): void {
		const method = this.getConsoleMethod(entry.level);
		const prefix = this.formatPrefix(entry);
		const message = this.formatMessage(entry);

		if (entry.metadata && Object.keys(entry.metadata).length > 0) {
			console[method](prefix, message, entry.metadata);
		} else {
			console[method](prefix, message);
		}

		if (entry.stack) {
			console[method](entry.stack);
		}
	}

	private formatPrefix(entry: LogEntry): string {
		const levelStr = entry.level.toUpperCase().padEnd(5);
		const namespace = entry.namespace ? `[${entry.namespace}]` : "";

		if (this.useColors) {
			const color = LEVEL_COLORS[entry.level];
			return `${color}[${levelStr}]${COLORS.reset} ${COLORS.dim}${namespace}${COLORS.reset}`;
		}

		return `[${levelStr}] ${namespace}`.trim();
	}

	private formatMessage(entry: LogEntry): string {
		return entry.message;
	}

	private getConsoleMethod(
		level: LogLevel,
	): "log" | "info" | "warn" | "error" | "debug" {
		switch (level) {
			case "trace":
			case "debug":
				return "debug";
			case "info":
				return "info";
			case "warn":
				return "warn";
			case "error":
			case "fatal":
				return "error";
			default:
				return "log";
		}
	}
}

/**
 * Batched transport with backpressure handling
 */
export class BatchedTransport implements Transport {
	name = "batched";
	enabled = true;
	level: LogLevel = "trace";

	private queue: LogEntry[] = [];
	private timer: NodeJS.Timeout | null = null;
	private readonly maxBatchSize: number;
	private readonly flushInterval: number;
	private readonly baseTransport: Transport;
	private pressure = 0;
	private readonly backpressureThreshold = 0.8;

	constructor(
		baseTransport: Transport,
		options?: {
			maxBatchSize?: number;
			flushInterval?: number;
			enableBackpressure?: boolean;
		},
	) {
		this.baseTransport = baseTransport;
		this.maxBatchSize = options?.maxBatchSize ?? 100;
		this.flushInterval = options?.flushInterval ?? 1000;
	}

	log(entry: LogEntry): void {
		// Apply backpressure if needed
		if (this.pressure > this.backpressureThreshold) {
			// Drop low priority logs
			if (LOG_LEVELS[entry.level] < LOG_LEVELS["warn"]) {
				return;
			}
		}

		this.queue.push(entry);
		this.updatePressure();

		if (this.queue.length >= this.maxBatchSize) {
			this.flush();
		} else if (!this.timer) {
			this.timer = setTimeout(() => this.flush(), this.flushInterval);
		}
	}

	private updatePressure(): void {
		this.pressure = this.queue.length / this.maxBatchSize;
	}

	flush(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		const entries = [...this.queue];
		this.queue = [];
		this.pressure = 0;

		for (const entry of entries) {
			this.baseTransport.log(entry);
		}

		if (this.baseTransport.flush) {
			this.baseTransport.flush();
		}
	}
}

/**
 * Main Logger class with advanced features
 */
export class Logger implements ILogger {
	private config: Required<LoggerConfig>;
	private readonly transports: Transport[] = [];
	private readonly plugins: LoggerPlugin[] = [];
	private readonly children = new Map<string, Logger>();
	private readonly startTime = performance.now();
	private logCount = 0;
	private readonly environment: RuntimeEnvironment;
	private readonly buffer: CircularBuffer<LogEntry>;
	private readonly sanitizer?: Sanitizer;

	constructor(config?: LoggerConfig) {
		this.environment = detectRuntime();

		// Get configuration from environment first
		const envConfig = configManager.getConfig();

		// Merge configurations: defaults < env < explicit config
		this.config = {
			level: config?.level ?? envConfig.level ?? "info",
			enabled: config?.enabled ?? envConfig.enabled ?? true,
			ssrOnly: config?.ssrOnly ?? envConfig.ssrOnly ?? false,
			namespace: config?.namespace ?? envConfig.namespace ?? "",
			context: { ...envConfig.context, ...config?.context },
			batchSize: config?.batchSize ?? envConfig.batchSize ?? 100,
			flushInterval: config?.flushInterval ?? envConfig.flushInterval ?? 1000,
			transports:
				config?.transports ??
				(envConfig.enabled !== false ? configManager.createTransports() : []),
			structured: config?.structured ?? envConfig.structured ?? false,
			samplingRate: config?.samplingRate ?? envConfig.samplingRate ?? 1,
			bufferSize: config?.bufferSize ?? DEFAULTS.BUFFER_SIZE,
			sanitize: config?.sanitize ?? true,
			sanitizeOptions: config?.sanitizeOptions ?? {},
			maskFields: config?.maskFields ?? [],
		};

		this.transports = this.config.transports;
		this.buffer = new CircularBuffer({
			maxSize: this.config.bufferSize,
			overflowStrategy: "drop-oldest",
			onDrop: (items) => {
				if (envConfig.debug) {
					console.warn(
						`[nexlog] Dropped ${items.length} log entries due to buffer overflow`,
					);
				}
			},
		});

		// Initialize sanitizer if enabled
		if (this.config.sanitize) {
			this.sanitizer = new Sanitizer({
				...this.config.sanitizeOptions,
				maskFields: this.config.maskFields,
			});
		}

		// Debug output if configured
		if (envConfig.debug) {
			console.log("[nexlog] Logger initialized with config:", this.config);
		}
	}

	/**
	 * Creates a child logger with inherited configuration
	 */
	child(namespace: string, config?: Partial<LoggerConfig>): Logger {
		const childNamespace = this.config.namespace
			? `${this.config.namespace}:${namespace}`
			: namespace;

		const cached = this.children.get(childNamespace);
		if (cached) return cached;

		const child = new Logger({
			...this.config,
			...config,
			namespace: childNamespace,
			context: {
				...this.config.context,
				...config?.context,
			},
		});

		this.children.set(childNamespace, child);
		return child;
	}

	/**
	 * Creates a logger with additional context
	 */
	withContext(context: LogMetadata): Logger {
		return new Logger({
			...this.config,
			context: {
				...this.config.context,
				...context,
			},
		});
	}

	/**
	 * Adds a transport to the logger
	 */
	addTransport(transport: Transport): void {
		this.transports.push(transport);
	}

	/**
	 * Removes a transport by name
	 */
	removeTransport(name: string): void {
		const index = this.transports.findIndex((t) => t.name === name);
		if (index !== -1) {
			this.transports.splice(index, 1);
		}
	}

	/**
	 * Adds a plugin to the logger
	 */
	use(plugin: LoggerPlugin): void {
		this.plugins.push(plugin);
		plugin.init?.(this);
	}

	/**
	 * Sets the log level
	 */
	setLevel(level: LogLevel): void {
		this.config.level = level;
		for (const child of this.children.values()) {
			child.setLevel(level);
		}
	}

	/**
	 * Gets the current log level
	 */
	getLevel(): LogLevel {
		return this.config.level;
	}

	/**
	 * Enables the logger
	 */
	enable(): void {
		this.config.enabled = true;
	}

	/**
	 * Disables the logger
	 */
	disable(): void {
		this.config.enabled = false;
	}

	/**
	 * Checks if the logger is enabled
	 */
	isEnabled(): boolean {
		return this.config.enabled;
	}

	/**
	 * Sets SSR-only mode
	 */
	setSSROnly(ssrOnly: boolean): void {
		this.config.ssrOnly = ssrOnly;
	}

	/**
	 * Updates the logger context
	 */
	setContext(context: LogMetadata): void {
		this.config.context = { ...this.config.context, ...context };
	}

	/**
	 * Adds fields to mask
	 */
	addMaskField(field: string): void {
		if (!this.config.maskFields.includes(field)) {
			this.config.maskFields.push(field);
			this.sanitizer?.addMaskField(field);
		}
	}

	/**
	 * Core logging method
	 */
	private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
		// Check if should log
		if (!this.shouldLog(level)) return;

		// Check message patterns
		if (!configManager.shouldLogMessage(message)) return;

		// Apply sampling
		if (Math.random() > this.config.samplingRate) return;

		// Get context from context manager
		const managedContext = contextManager.get();

		// Sanitize metadata if enabled
		let sanitizedMetadata = metadata;
		if (this.sanitizer && metadata) {
			sanitizedMetadata = this.sanitizer.sanitizeValue(metadata) as LogMetadata;
		}

		// Build log entry
		let entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			namespace: this.config.namespace,
			metadata: sanitizedMetadata,
			context: {
				...this.config.context,
				...managedContext,
			},
			environment: this.environment,
		};

		// Extract stack trace for errors (if enabled)
		const envConfig = configManager.getConfig();
		if (
			metadata &&
			metadata.error instanceof Error &&
			envConfig.stackTraces !== false
		) {
			entry.stack = metadata.error.stack;
		}

		// Add performance metrics if enabled and available
		// Only add memory usage if we're in a Node.js environment with memory API
		if (
			envConfig.performance &&
			HAS_MEMORY_USAGE &&
			typeof process !== "undefined" &&
			typeof process.memoryUsage === "function"
		) {
			try {
				entry.performance = {
					memory: process.memoryUsage(),
					timestamp: performance.now() - this.startTime,
				};
			} catch {
				// Fallback if memoryUsage fails
				entry.performance = {
					timestamp: performance.now() - this.startTime,
				};
			}
		} else {
			entry.performance = {
				timestamp: performance.now() - this.startTime,
			};
		}

		// Apply plugin transforms
		for (const plugin of this.plugins) {
			if (plugin.beforeLog) {
				const result = plugin.beforeLog(entry);
				if (result === false) {
					return;
				}
			}
			if (plugin.transform) {
				const transformed = plugin.transform(entry);
				if (transformed === null) {
					return;
				}
				entry = transformed;
			}
		}

		// Add to buffer
		this.buffer.push(entry);

		// Send to transports
		for (const transport of this.transports) {
			if (transport.enabled !== false) {
				transport.log(entry);
			}
		}

		// Call plugin afterLog hooks
		for (const plugin of this.plugins) {
			plugin.afterLog?.(entry);
		}

		this.logCount++;
	}

	private shouldLog(level: LogLevel): boolean {
		if (!this.config.enabled) return false;

		// Check environment-specific configuration
		if (!configManager.shouldLog(this.environment)) {
			return false;
		}

		if (
			this.config.ssrOnly &&
			this.environment !== "node" &&
			this.environment !== "edge" &&
			this.environment !== "bun"
		) {
			return false;
		}

		return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
	}

	/**
	 * Logs a trace message
	 */
	trace(message: string, metadata?: LogMetadata): void {
		this.log("trace", message, metadata);
	}

	/**
	 * Logs a debug message
	 */
	debug(message: string, metadata?: LogMetadata): void {
		this.log("debug", message, metadata);
	}

	/**
	 * Logs an info message
	 */
	info(message: string, metadata?: LogMetadata): void {
		this.log("info", message, metadata);
	}

	/**
	 * Logs a warning message
	 */
	warn(message: string, metadata?: LogMetadata): void {
		this.log("warn", message, metadata);
	}

	/**
	 * Logs an error message
	 */
	error(message: string, metadata?: LogMetadata): void {
		this.log("error", message, metadata);
	}

	/**
	 * Logs a fatal message
	 */
	fatal(message: string, metadata?: LogMetadata): void {
		this.log("fatal", message, metadata);
	}

	/**
	 * Times a function execution
	 */
	async time<T>(
		label: string,
		fn: () => T | Promise<T>,
		metadata?: LogMetadata,
	): Promise<T> {
		const start = performance.now();
		try {
			const result = await fn();
			const duration = performance.now() - start;
			this.debug(`${label} completed`, {
				...metadata,
				duration: `${duration.toFixed(2)}ms`,
			});
			return result;
		} catch (error) {
			const duration = performance.now() - start;
			this.error(`${label} failed`, {
				...metadata,
				duration: `${duration.toFixed(2)}ms`,
				error,
			});
			throw error;
		}
	}

	/**
	 * Creates a profiling context
	 */
	profile(label: string): () => void {
		const start = performance.now();
		return () => {
			const duration = performance.now() - start;
			this.debug(`Profile: ${label}`, {
				duration: `${duration.toFixed(2)}ms`,
			});
		};
	}

	/**
	 * Performance measurement with automatic disposal
	 */
	measure(name: string): { [Symbol.dispose]: () => void } {
		const start = performance.now();
		return {
			[Symbol.dispose]: () => {
				const duration = performance.now() - start;
				this.debug(`Measure: ${name}`, {
					duration: `${duration.toFixed(2)}ms`,
				});
			},
		};
	}

	/**
	 * Flushes all transports
	 */
	async flush(): Promise<void> {
		await Promise.all(
			this.transports.map((t) => t.flush?.() ?? Promise.resolve()),
		);
	}

	/**
	 * Gets logger statistics
	 */
	getStats(): {
		logCount: number;
		uptime: number;
		children: number;
		transports: number;
		bufferStats: any;
		runtime: RuntimeEnvironment;
		capabilities: any;
	} {
		return {
			logCount: this.logCount,
			uptime: performance.now() - this.startTime,
			children: this.children.size,
			transports: this.transports.length,
			bufferStats: this.buffer.getStats(),
			runtime: this.environment,
			capabilities: CAPABILITIES,
		};
	}

	/**
	 * Gets recent logs from buffer
	 */
	getRecentLogs(count?: number): LogEntry[] {
		const logs = this.buffer.toArray();
		return count ? logs.slice(-count) : logs;
	}

	/**
	 * Clears the log buffer
	 */
	clearBuffer(): void {
		this.buffer.clear();
	}
}

// Environment detection exports
export const isBun = RUNTIME === "bun";
export const isServer = RUNTIME === "node";
export const isBrowser = RUNTIME === "browser";
export const isEdge = RUNTIME === "edge";
export const isNextEdgeRuntime = isEdge;

// Default logger instance with auto-configuration from environment
const defaultLogger = new Logger();

// Export default logger
export default defaultLogger;

export type { ExtendedLoggerConfig } from "./config.js";
// Export configuration utilities
export { ConfigManager, configManager, ENV_VARS } from "./config.js";
