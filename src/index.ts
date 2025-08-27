/**
 * nexlog - A blazing-fast logging library for Next.js, optimized for Bun runtime
 * @packageDocumentation
 */

import { configManager } from "./config.js";

// Runtime detection
interface BunRuntime {
	version: string;
	nanoseconds(): bigint;
	sleep(ms: number): Promise<void>;
	file(path: string): { size: number; type: string };
}

declare const Bun: BunRuntime | undefined;

/**
 * Available log levels from least to most severe
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Runtime environment types
 */
export type Environment = "bun" | "server" | "edge" | "browser" | "unknown";

/**
 * Metadata that can be attached to log messages
 */
export type LogMetadata = Record<string, unknown>;

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
	/** Initial log level */
	level?: LogLevel;
	/** Whether the logger is enabled */
	enabled?: boolean;
	/** Only log on server-side rendering */
	ssrOnly?: boolean;
	/** Custom namespace for the logger */
	namespace?: string;
	/** Context to be included with every log */
	context?: LogMetadata;
	/** Maximum size of the batch queue */
	batchSize?: number;
	/** Flush interval in milliseconds */
	flushInterval?: number;
	/** Custom transports for log output */
	transports?: Transport[];
	/** Whether to use structured logging format */
	structured?: boolean;
	/** Performance sampling rate (0-1) */
	samplingRate?: number;
}

/**
 * Structure of a log entry
 */
export interface LogEntry {
	/** Timestamp of the log */
	timestamp: string;
	/** Log level */
	level: LogLevel;
	/** Log message */
	message: string;
	/** Optional namespace */
	namespace?: string;
	/** Optional metadata */
	metadata?: LogMetadata;
	/** Optional context */
	context?: LogMetadata;
	/** Environment where log was created */
	environment: Environment;
	/** Stack trace for errors */
	stack?: string;
	/** Performance metrics */
	performance?: {
		memory?: NodeJS.MemoryUsage;
		timestamp: number;
	};
}

/**
 * Transport interface for custom log outputs
 */
export interface Transport {
	/** Name of the transport */
	name: string;
	/** Whether the transport is enabled */
	enabled?: boolean;
	/** Minimum level to log */
	level?: LogLevel;
	/** Handler for log entries */
	log(entry: LogEntry): void | Promise<void>;
	/** Optional flush method for batched transports */
	flush?(): void | Promise<void>;
}

/**
 * Logger plugin interface
 */
export interface LoggerPlugin {
	/** Plugin name */
	name: string;
	/** Called when logger is initialized */
	init?(logger: Logger): void;
	/** Transform log entry before output */
	transform?(entry: LogEntry): LogEntry;
	/** Called before log is written */
	beforeLog?(entry: LogEntry): undefined | false;
	/** Called after log is written */
	afterLog?(entry: LogEntry): void;
}

/**
 * Type guards for runtime environment detection
 */
declare global {
	var EdgeRuntime: string | undefined;

	interface Window {
		// biome-ignore lint/style/useNamingConvention: External API constant
		__NEXLOG_CONFIG__?: Partial<LoggerConfig>;
	}
}

// Properly typed Node.js process environment
interface ProcessEnv {
	// biome-ignore lint/style/useNamingConvention: Environment variable names
	NODE_ENV?: "development" | "production" | "test";
	// biome-ignore lint/style/useNamingConvention: Environment variable names
	NEXT_RUNTIME?: "edge" | "nodejs";
	// biome-ignore lint/style/useNamingConvention: Environment variable names
	LOG_LEVEL?: LogLevel;
	// biome-ignore lint/style/useNamingConvention: Environment variable names
	LOG_NAMESPACE?: string;
}

/**
 * Numeric representation of log levels for comparison
 */
const LOG_LEVELS: Record<LogLevel, number> = {
	trace: 0,
	debug: 1,
	info: 2,
	warn: 3,
	error: 4,
	fatal: 5,
} as const;

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	// Foreground colors
	gray: "\x1b[90m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
	blue: "\x1b[34m",
} as const;

/**
 * Color mapping for each log level
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
	trace: COLORS.gray,
	debug: COLORS.cyan,
	info: COLORS.green,
	warn: COLORS.yellow,
	error: COLORS.red,
	fatal: `${COLORS.bright}${COLORS.red}`,
} as const;

/**
 * Detects the current runtime environment
 */
export function detectEnvironment(): Environment {
	// Check for Bun runtime first (highest priority)
	if (typeof Bun !== "undefined" && typeof Bun.version === "string") {
		return "bun";
	}

	// Check for Node.js server environment
	if (
		typeof process !== "undefined" &&
		process.versions?.node &&
		typeof window === "undefined"
	) {
		const runtime = (process.env as ProcessEnv).NEXT_RUNTIME;
		if (runtime === "edge") {
			return "edge";
		}
		return "server";
	}

	// Check for Vercel Edge Runtime
	if (typeof globalThis.EdgeRuntime === "string") {
		return "edge";
	}

	// Check for browser environment
	if (typeof window !== "undefined" && typeof document !== "undefined") {
		return "browser";
	}

	// Check for Web Workers
	if (
		typeof self !== "undefined" &&
		typeof (self as unknown as { importScripts?: () => void }).importScripts ===
			"function"
	) {
		return "browser";
	}

	return "unknown";
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
		const env = detectEnvironment();
		this.useColors = options?.useColors ?? (env === "server" || env === "bun");
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
 * Batched transport for performance optimization
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

	constructor(
		baseTransport: Transport,
		options?: { maxBatchSize?: number; flushInterval?: number },
	) {
		this.baseTransport = baseTransport;
		this.maxBatchSize = options?.maxBatchSize ?? 100;
		this.flushInterval = options?.flushInterval ?? 1000;
	}

	log(entry: LogEntry): void {
		this.queue.push(entry);

		if (this.queue.length >= this.maxBatchSize) {
			this.flush();
		} else if (!this.timer) {
			this.timer = setTimeout(() => this.flush(), this.flushInterval);
		}
	}

	flush(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		const entries = [...this.queue];
		this.queue = [];

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
export class Logger {
	private config: Required<LoggerConfig>;
	private readonly transports: Transport[] = [];
	private readonly plugins: LoggerPlugin[] = [];
	private readonly children = new Map<string, Logger>();
	private readonly startTime = performance.now();
	private logCount = 0;
	private readonly environment: Environment;

	constructor(config?: LoggerConfig) {
		this.environment = detectEnvironment();

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
		};

		this.transports = this.config.transports;

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
	// biome-ignore lint/style/useNamingConvention: SSR is a known acronym
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
	 * Core logging method
	 */
	private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
		// Check if should log
		if (!this.shouldLog(level)) return;

		// Check message patterns
		if (!configManager.shouldLogMessage(message)) return;

		// Apply sampling
		if (Math.random() > this.config.samplingRate) return;

		// Build log entry
		let entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			namespace: this.config.namespace,
			metadata,
			context: this.config.context,
			environment: detectEnvironment(),
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

		// Add performance metrics if enabled
		if (
			envConfig.performance ||
			(process?.env as ProcessEnv | undefined)?.NODE_ENV === "development"
		) {
			entry.performance = {
				memory: process?.memoryUsage?.(),
				timestamp: performance.now() - this.startTime,
			};
		}

		// Apply plugin transforms
		for (const plugin of this.plugins) {
			if (plugin.beforeLog && plugin.beforeLog(entry) === false) {
				return;
			}
			if (plugin.transform) {
				entry = plugin.transform(entry);
			}
		}

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
			this.environment !== "server" &&
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
	} {
		return {
			logCount: this.logCount,
			uptime: performance.now() - this.startTime,
			children: this.children.size,
			transports: this.transports.length,
		};
	}
}

// Environment detection exports
export const isBun = detectEnvironment() === "bun";
export const isServer = detectEnvironment() === "server";
export const isBrowser = detectEnvironment() === "browser";
export const isEdge = detectEnvironment() === "edge";
export const isNextEdgeRuntime = isEdge;

// Default logger instance with auto-configuration from environment
const defaultLogger = new Logger();

// Export default logger
export default defaultLogger;

export type { ExtendedLoggerConfig } from "./config.js";
// Export configuration utilities
export { ConfigManager, configManager, ENV_VARS } from "./config.js";
