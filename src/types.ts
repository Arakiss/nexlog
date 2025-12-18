/**
 * Type definitions for nexlog
 */

/**
 * Available log levels from least to most severe
 */
export type LogLevel =
	| "trace"
	| "debug"
	| "info"
	| "success"
	| "warn"
	| "error"
	| "fatal";

/**
 * Runtime environment types
 */
export type Environment =
	| "bun"
	| "node"
	| "edge"
	| "browser"
	| "worker"
	| "unknown";

/**
 * Metadata that can be attached to log messages
 */
export type LogMetadata = Record<string, unknown>;

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
	/** Plugin version */
	version?: string;
	/** Called when logger is initialized */
	init?(logger: unknown): void;
	/** Transform log entry before output */
	transform?(entry: LogEntry): LogEntry | null;
	/** Called before log is written */
	beforeLog?(entry: LogEntry): false | undefined | Promise<false | undefined>;
	/** Called after log is written */
	afterLog?(entry: LogEntry): void | Promise<void>;
}

/**
 * Base configuration for loggers
 */
export interface BaseLoggerConfig {
	/** Initial log level */
	level?: LogLevel;
	/** Whether the logger is enabled */
	enabled?: boolean;
	/** Custom namespace for the logger */
	namespace?: string;
	/** Context to be included with every log */
	context?: LogMetadata;
	/** Custom transports for log output */
	transports?: Transport[];
	/** Whether to use structured logging format */
	structured?: boolean;
	/** Performance sampling rate (0-1) */
	samplingRate?: number;
}

/**
 * Strict log level type with better TypeScript support
 */
export const LogLevels = {
	trace: "trace",
	debug: "debug",
	info: "info",
	success: "success",
	warn: "warn",
	error: "error",
	fatal: "fatal",
} as const;

export type LogLevelValue = (typeof LogLevels)[keyof typeof LogLevels];

/**
 * Generic logger interface for type safety
 */
export interface Logger {
	// All logging methods support both traditional (message, metadata) and console.log-style variadic args
	trace(message: string, metadata?: LogMetadata): void;
	trace(...args: unknown[]): void;
	debug(message: string, metadata?: LogMetadata): void;
	debug(...args: unknown[]): void;
	info(message: string, metadata?: LogMetadata): void;
	info(...args: unknown[]): void;
	success(message: string, metadata?: LogMetadata): void;
	success(...args: unknown[]): void;
	warn(message: string, metadata?: LogMetadata): void;
	warn(...args: unknown[]): void;
	error(message: string, metadata?: LogMetadata): void;
	error(...args: unknown[]): void;
	fatal(message: string, metadata?: LogMetadata): void;
	fatal(...args: unknown[]): void;

	setLevel(level: LogLevel): void;
	getLevel(): LogLevel;
	enable(): void;
	disable(): void;
	isEnabled(): boolean;

	child(namespace: string, config?: unknown): Logger;
	withContext(context: LogMetadata): Logger;

	flush(): Promise<void>;
	getStats(): Record<string, unknown>;
}

/**
 * Performance measurement result
 */
export interface PerformanceResult<T> {
	result: T;
	duration: number;
	success: boolean;
	error?: Error;
}

/**
 * Batch configuration
 */
export interface BatchConfig {
	maxSize: number;
	flushInterval: number;
	onFlush?: (entries: LogEntry[]) => void | Promise<void>;
	enableBackpressure?: boolean;
	backpressureThreshold?: number;
}
