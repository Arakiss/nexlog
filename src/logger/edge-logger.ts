/**
 * Edge Runtime compatible logger implementation
 * No Node.js specific APIs, works in Vercel Edge, Cloudflare Workers, etc.
 */

import { COLORS, LEVEL_COLORS, LOG_LEVELS } from "../constants.js";
import { contextManager } from "../context/index.js";
import { IS_EDGE, RUNTIME } from "../runtime/detector.js";
import { Sanitizer } from "../sanitizer/index.js";
import type {
	LogEntry,
	LoggerPlugin,
	LogLevel,
	LogMetadata,
	Transport,
} from "../types.js";
import { CircularBuffer } from "../utils/circular-buffer.js";

export interface EdgeLoggerConfig {
	level?: LogLevel;
	enabled?: boolean;
	namespace?: string;
	context?: LogMetadata;
	transports?: Transport[];
	structured?: boolean;
	samplingRate?: number;
	sanitize?: boolean;
	sanitizeOptions?: Record<string, unknown>;
	bufferSize?: number;
	useColors?: boolean;
}

/**
 * Edge-compatible console transport
 */
export class EdgeConsoleTransport implements Transport {
	name = "edge-console";
	enabled = true;
	level: LogLevel = "trace";

	private readonly useColors: boolean;
	private readonly structured: boolean;

	constructor(options?: { useColors?: boolean; structured?: boolean }) {
		this.useColors = options?.useColors ?? false;
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

		if (this.useColors && !IS_EDGE) {
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
 * Edge Runtime compatible logger
 */
export class EdgeLogger {
	private config: Required<EdgeLoggerConfig>;
	private readonly transports: Transport[] = [];
	private readonly plugins: LoggerPlugin[] = [];
	private readonly children = new Map<string, EdgeLogger>();
	private readonly startTime = performance.now();
	private logCount = 0;
	private readonly buffer: CircularBuffer<LogEntry>;
	private readonly sanitizer?: Sanitizer;

	constructor(config?: EdgeLoggerConfig) {
		this.config = {
			level: config?.level ?? "info",
			enabled: config?.enabled ?? true,
			namespace: config?.namespace ?? "",
			context: config?.context ?? {},
			transports: config?.transports ?? [new EdgeConsoleTransport()],
			structured: config?.structured ?? false,
			samplingRate: config?.samplingRate ?? 1,
			sanitize: config?.sanitize ?? true,
			sanitizeOptions: config?.sanitizeOptions ?? {},
			bufferSize: config?.bufferSize ?? 1000,
			useColors: config?.useColors ?? false,
		};

		this.transports = this.config.transports;
		this.buffer = new CircularBuffer(this.config.bufferSize);

		if (this.config.sanitize) {
			this.sanitizer = new Sanitizer(this.config.sanitizeOptions);
		}
	}

	/**
	 * Creates a child logger
	 */
	child(namespace: string, config?: Partial<EdgeLoggerConfig>): EdgeLogger {
		const childNamespace = this.config.namespace
			? `${this.config.namespace}:${namespace}`
			: namespace;

		const cached = this.children.get(childNamespace);
		if (cached) return cached;

		const child = new EdgeLogger({
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
	withContext(context: LogMetadata): EdgeLogger {
		return new EdgeLogger({
			...this.config,
			context: {
				...this.config.context,
				...context,
			},
		});
	}

	/**
	 * Adds a transport
	 */
	addTransport(transport: Transport): void {
		this.transports.push(transport);
	}

	/**
	 * Removes a transport
	 */
	removeTransport(name: string): void {
		const index = this.transports.findIndex((t) => t.name === name);
		if (index !== -1) {
			this.transports.splice(index, 1);
		}
	}

	/**
	 * Adds a plugin
	 */
	use(plugin: LoggerPlugin): void {
		this.plugins.push(plugin);
		// biome-ignore lint/suspicious/noExplicitAny: Plugin init accepts unknown type for logger interface compatibility
		plugin.init?.(this as any);
	}

	/**
	 * Sets the log level
	 */
	setLevel(level: LogLevel): void {
		this.config.level = level;
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
	 * Updates the context
	 */
	setContext(context: LogMetadata): void {
		this.config.context = { ...this.config.context, ...context };
	}

	/**
	 * Core logging method
	 */
	private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
		if (!this.shouldLog(level)) return;

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
			environment: RUNTIME,
		};

		// Extract stack trace for errors
		if (metadata && metadata.error instanceof Error) {
			entry.stack = metadata.error.stack;
		}

		// Add performance metrics (Edge-compatible)
		entry.performance = {
			timestamp: performance.now() - this.startTime,
		};

		// Apply plugin transforms
		for (const plugin of this.plugins) {
			if (plugin.beforeLog && plugin.beforeLog(entry) === false) {
				return;
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
		return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
	}

	/**
	 * Log methods
	 */
	trace(message: string, metadata?: LogMetadata): void {
		this.log("trace", message, metadata);
	}

	debug(message: string, metadata?: LogMetadata): void {
		this.log("debug", message, metadata);
	}

	info(message: string, metadata?: LogMetadata): void {
		this.log("info", message, metadata);
	}

	warn(message: string, metadata?: LogMetadata): void {
		this.log("warn", message, metadata);
	}

	error(message: string, metadata?: LogMetadata): void {
		this.log("error", message, metadata);
	}

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
		bufferStats: ReturnType<CircularBuffer<LogEntry>["getStats"]>;
	} {
		return {
			logCount: this.logCount,
			uptime: performance.now() - this.startTime,
			children: this.children.size,
			transports: this.transports.length,
			bufferStats: this.buffer.getStats(),
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
