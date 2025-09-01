/**
 * Environment configuration for nexlog
 * @module config
 */

import type { LoggerConfig, LogLevel, Transport } from "./index.js";

/**
 * Environment variable names for nexlog configuration
 */
export const ENV_VARS = {
	// Core settings
	NEXLOG_LEVEL: "NEXLOG_LEVEL",
	NEXLOG_ENABLED: "NEXLOG_ENABLED",
	NEXLOG_SSR_ONLY: "NEXLOG_SSR_ONLY",
	NEXLOG_CLIENT_ENABLED: "NEXLOG_CLIENT_ENABLED",
	NEXLOG_EDGE_ENABLED: "NEXLOG_EDGE_ENABLED",

	// Output settings
	NEXLOG_STRUCTURED: "NEXLOG_STRUCTURED",
	NEXLOG_COLORS: "NEXLOG_COLORS",
	NEXLOG_NAMESPACE: "NEXLOG_NAMESPACE",
	NEXLOG_PREFIX: "NEXLOG_PREFIX",

	// Performance settings
	NEXLOG_SAMPLING_RATE: "NEXLOG_SAMPLING_RATE",
	NEXLOG_BATCH_SIZE: "NEXLOG_BATCH_SIZE",
	NEXLOG_FLUSH_INTERVAL: "NEXLOG_FLUSH_INTERVAL",
	NEXLOG_MAX_QUEUE_SIZE: "NEXLOG_MAX_QUEUE_SIZE",

	// Feature flags
	NEXLOG_DEV_TOOLS: "NEXLOG_DEV_TOOLS",
	NEXLOG_LIFECYCLE: "NEXLOG_LIFECYCLE",
	NEXLOG_PERFORMANCE: "NEXLOG_PERFORMANCE",
	NEXLOG_STACK_TRACES: "NEXLOG_STACK_TRACES",

	// Transport settings
	NEXLOG_TRANSPORTS: "NEXLOG_TRANSPORTS",
	NEXLOG_CONSOLE_ENABLED: "NEXLOG_CONSOLE_ENABLED",
	NEXLOG_FILE_ENABLED: "NEXLOG_FILE_ENABLED",
	NEXLOG_HTTP_ENABLED: "NEXLOG_HTTP_ENABLED",
	NEXLOG_HTTP_ENDPOINT: "NEXLOG_HTTP_ENDPOINT",

	// Context prefix for dynamic context
	NEXLOG_CONTEXT_PREFIX: "NEXLOG_CONTEXT_",

	// Filtering
	NEXLOG_INCLUDE_PATTERNS: "NEXLOG_INCLUDE_PATTERNS",
	NEXLOG_EXCLUDE_PATTERNS: "NEXLOG_EXCLUDE_PATTERNS",

	// Development
	NEXLOG_DEBUG: "NEXLOG_DEBUG",
	NEXLOG_VERBOSE: "NEXLOG_VERBOSE",
} as const;

/**
 * Configuration source priority (higher = more priority)
 */
export enum ConfigPriority {
	DEFAULT = 0,
	FILE = 1,
	CODE = 2,
	ENV = 3,
	RUNTIME = 4,
}

/**
 * Extended configuration with all possible options
 */
export interface ExtendedLoggerConfig extends LoggerConfig {
	/** Enable logging on client side */
	clientEnabled?: boolean;
	/** Enable logging on edge runtime */
	edgeEnabled?: boolean;
	/** Use colors in console output */
	useColors?: boolean;
	/** Default prefix for all logs */
	prefix?: string;
	/** Maximum queue size for batching */
	maxQueueSize?: number;
	/** Enable dev tools in production */
	devTools?: boolean;
	/** Log lifecycle events */
	lifecycle?: boolean;
	/** Include performance metrics */
	performance?: boolean;
	/** Include stack traces in errors */
	stackTraces?: boolean;
	/** HTTP endpoint for remote logging */
	httpEndpoint?: string;
	/** Include patterns (regex) */
	includePatterns?: string[];
	/** Exclude patterns (regex) */
	excludePatterns?: string[];
	/** Debug mode */
	debug?: boolean;
	/** Verbose output */
	verbose?: boolean;
}

/**
 * Parse boolean environment variable
 */
function parseBoolean(
	value: string | undefined,
	defaultValue = false,
): boolean {
	if (value === undefined) return defaultValue;
	const v = value.toLowerCase().trim();
	return v === "true" || v === "1" || v === "yes" || v === "on";
}

/**
 * Parse number environment variable
 */
function parseNumber(
	value: string | undefined,
	defaultValue?: number,
): number | undefined {
	if (value === undefined) return defaultValue;
	const num = Number(value);
	return Number.isNaN(num) ? defaultValue : num;
}

/**
 * Parse log level environment variable
 */
function parseLogLevel(
	value: string | undefined,
	defaultValue: LogLevel = "info",
): LogLevel {
	if (!value) return defaultValue;
	const level = value.toLowerCase().trim();
	const validLevels: LogLevel[] = [
		"trace",
		"debug",
		"info",
		"warn",
		"error",
		"fatal",
	];
	return validLevels.includes(level as LogLevel)
		? (level as LogLevel)
		: defaultValue;
}

/**
 * Parse comma-separated string into array
 */
function parseArray(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * Get context from environment variables
 */
function getContextFromEnv(): Record<string, unknown> {
	const context: Record<string, unknown> = {};
	const prefix = ENV_VARS.NEXLOG_CONTEXT_PREFIX;

	if (typeof process === "undefined") return context;

	for (const [key, value] of Object.entries(process.env || {})) {
		if (key.startsWith(prefix) && value !== undefined) {
			const contextKey = key.slice(prefix.length).toLowerCase();
			// Try to parse as JSON, otherwise use as string
			try {
				context[contextKey] = JSON.parse(value);
			} catch {
				context[contextKey] = value;
			}
		}
	}

	return context;
}

/**
 * Configuration manager for environment-based settings
 */
export class ConfigManager {
	private static instance: ConfigManager;
	private config: ExtendedLoggerConfig = {};
	private priorities: Map<keyof ExtendedLoggerConfig, ConfigPriority> =
		new Map();

	private constructor() {
		this.loadFromEnvironment();
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager();
		}
		return ConfigManager.instance;
	}

	/**
	 * Load configuration from environment variables
	 */
	private loadFromEnvironment(): void {
		if (typeof process === "undefined") return;

		const env = process.env || {};

		// Core settings
		if (env[ENV_VARS.NEXLOG_LEVEL]) {
			this.setWithPriority(
				"level",
				parseLogLevel(env[ENV_VARS.NEXLOG_LEVEL]),
				ConfigPriority.ENV,
			);
		}
		this.setWithPriority(
			"enabled",
			parseBoolean(env[ENV_VARS.NEXLOG_ENABLED], true),
			ConfigPriority.ENV,
		);
		this.setWithPriority(
			"ssrOnly",
			parseBoolean(env[ENV_VARS.NEXLOG_SSR_ONLY]),
			ConfigPriority.ENV,
		);
		this.setWithPriority(
			"clientEnabled",
			parseBoolean(env[ENV_VARS.NEXLOG_CLIENT_ENABLED], true),
			ConfigPriority.ENV,
		);
		this.setWithPriority(
			"edgeEnabled",
			parseBoolean(env[ENV_VARS.NEXLOG_EDGE_ENABLED], true),
			ConfigPriority.ENV,
		);

		// Output settings
		this.setWithPriority(
			"structured",
			parseBoolean(env[ENV_VARS.NEXLOG_STRUCTURED]),
			ConfigPriority.ENV,
		);
		this.setWithPriority(
			"useColors",
			parseBoolean(env[ENV_VARS.NEXLOG_COLORS], true),
			ConfigPriority.ENV,
		);
		if (env[ENV_VARS.NEXLOG_NAMESPACE]) {
			this.setWithPriority(
				"namespace",
				env[ENV_VARS.NEXLOG_NAMESPACE],
				ConfigPriority.ENV,
			);
		}
		if (env[ENV_VARS.NEXLOG_PREFIX]) {
			this.setWithPriority(
				"prefix",
				env[ENV_VARS.NEXLOG_PREFIX],
				ConfigPriority.ENV,
			);
		}

		// Performance settings
		const samplingRate = parseNumber(env[ENV_VARS.NEXLOG_SAMPLING_RATE]);
		if (samplingRate !== undefined) {
			this.setWithPriority(
				"samplingRate",
				Math.max(0, Math.min(1, samplingRate)),
				ConfigPriority.ENV,
			);
		}
		const batchSize = parseNumber(env[ENV_VARS.NEXLOG_BATCH_SIZE]);
		if (batchSize !== undefined) {
			this.setWithPriority("batchSize", batchSize, ConfigPriority.ENV);
		}
		const flushInterval = parseNumber(env[ENV_VARS.NEXLOG_FLUSH_INTERVAL]);
		if (flushInterval !== undefined) {
			this.setWithPriority("flushInterval", flushInterval, ConfigPriority.ENV);
		}
		const maxQueueSize = parseNumber(env[ENV_VARS.NEXLOG_MAX_QUEUE_SIZE]);
		if (maxQueueSize !== undefined) {
			this.setWithPriority("maxQueueSize", maxQueueSize, ConfigPriority.ENV);
		}

		// Feature flags
		this.setWithPriority(
			"devTools",
			parseBoolean(env[ENV_VARS.NEXLOG_DEV_TOOLS]),
			ConfigPriority.ENV,
		);
		this.setWithPriority(
			"lifecycle",
			parseBoolean(env[ENV_VARS.NEXLOG_LIFECYCLE], true),
			ConfigPriority.ENV,
		);
		this.setWithPriority(
			"performance",
			parseBoolean(env[ENV_VARS.NEXLOG_PERFORMANCE]),
			ConfigPriority.ENV,
		);
		this.setWithPriority(
			"stackTraces",
			parseBoolean(env[ENV_VARS.NEXLOG_STACK_TRACES], true),
			ConfigPriority.ENV,
		);

		// HTTP endpoint
		if (env[ENV_VARS.NEXLOG_HTTP_ENDPOINT]) {
			this.setWithPriority(
				"httpEndpoint",
				env[ENV_VARS.NEXLOG_HTTP_ENDPOINT],
				ConfigPriority.ENV,
			);
		}

		// Filtering
		const includePatterns = parseArray(env[ENV_VARS.NEXLOG_INCLUDE_PATTERNS]);
		if (includePatterns.length > 0) {
			this.setWithPriority(
				"includePatterns",
				includePatterns,
				ConfigPriority.ENV,
			);
		}
		const excludePatterns = parseArray(env[ENV_VARS.NEXLOG_EXCLUDE_PATTERNS]);
		if (excludePatterns.length > 0) {
			this.setWithPriority(
				"excludePatterns",
				excludePatterns,
				ConfigPriority.ENV,
			);
		}

		// Development
		this.setWithPriority(
			"debug",
			parseBoolean(env[ENV_VARS.NEXLOG_DEBUG]),
			ConfigPriority.ENV,
		);
		this.setWithPriority(
			"verbose",
			parseBoolean(env[ENV_VARS.NEXLOG_VERBOSE]),
			ConfigPriority.ENV,
		);

		// Context from environment
		const context = getContextFromEnv();
		if (Object.keys(context).length > 0) {
			this.setWithPriority("context", context, ConfigPriority.ENV);
		}

		// Auto-detect production optimizations
		if (env.NODE_ENV === "production" && !env[ENV_VARS.NEXLOG_LEVEL]) {
			this.setWithPriority("level", "warn", ConfigPriority.DEFAULT);
			this.setWithPriority("structured", true, ConfigPriority.DEFAULT);
		}

		// Debug output
		if (this.config.debug) {
			console.log(
				"[nexlog] Configuration loaded from environment:",
				this.config,
			);
		}
	}

	/**
	 * Set configuration value with priority
	 */
	private setWithPriority<K extends keyof ExtendedLoggerConfig>(
		key: K,
		value: ExtendedLoggerConfig[K],
		priority: ConfigPriority,
	): void {
		const currentPriority = this.priorities.get(key) || ConfigPriority.DEFAULT;
		if (priority >= currentPriority) {
			this.config[key] = value;
			this.priorities.set(key, priority);
		}
	}

	/**
	 * Get configuration value
	 */
	get<K extends keyof ExtendedLoggerConfig>(
		key: K,
	): ExtendedLoggerConfig[K] | undefined {
		return this.config[key];
	}

	/**
	 * Set configuration value (runtime priority)
	 */
	set<K extends keyof ExtendedLoggerConfig>(
		key: K,
		value: ExtendedLoggerConfig[K],
	): void {
		this.setWithPriority(key, value, ConfigPriority.RUNTIME);
	}

	/**
	 * Merge configuration with priority
	 */
	merge(
		config: Partial<ExtendedLoggerConfig>,
		priority = ConfigPriority.CODE,
	): void {
		for (const [key, value] of Object.entries(config)) {
			if (value !== undefined) {
				this.setWithPriority(
					key as keyof ExtendedLoggerConfig,
					// biome-ignore lint/suspicious/noExplicitAny: Dynamic config value
					value as any,
					priority,
				);
			}
		}
	}

	/**
	 * Get full configuration
	 */
	getConfig(): ExtendedLoggerConfig {
		return { ...this.config };
	}

	/**
	 * Check if logging should be enabled for current environment
	 */
	shouldLog(
		environment: "bun" | "node" | "browser" | "edge" | "worker" | "unknown",
	): boolean {
		// Check global enabled flag first
		if (!this.config.enabled) return false;

		// Check SSR-only mode (Bun, node, and edge count as server-side)
		if (
			this.config.ssrOnly &&
			environment !== "node" &&
			environment !== "bun" &&
			environment !== "edge"
		)
			return false;

		// Check environment-specific flags
		switch (environment) {
			case "bun":
				return true; // Bun is always enabled unless globally disabled
			case "browser":
				return this.config.clientEnabled !== false;
			case "edge":
				return this.config.edgeEnabled !== false;
			case "node":
				return true; // Node is always enabled unless globally disabled
			case "worker":
				return this.config.clientEnabled !== false;
			default:
				return true;
		}
	}

	/**
	 * Check if message should be logged based on patterns
	 */
	shouldLogMessage(message: string): boolean {
		// Check exclude patterns first
		if (this.config.excludePatterns?.length) {
			for (const pattern of this.config.excludePatterns) {
				if (new RegExp(pattern).test(message)) {
					return false;
				}
			}
		}

		// Check include patterns (if defined, message must match at least one)
		if (this.config.includePatterns?.length) {
			for (const pattern of this.config.includePatterns) {
				if (new RegExp(pattern).test(message)) {
					return true;
				}
			}
			return false; // Didn't match any include pattern
		}

		return true; // No patterns defined, log everything
	}

	/**
	 * Create transports based on environment configuration
	 */
	createTransports(): Transport[] {
		const transports: Transport[] = [];

		// Import dynamically to avoid circular dependency
		const { ConsoleTransport, BatchedTransport } = require("./index.js");

		// Console transport (default)
		if (this.config.enabled !== false) {
			const consoleTransport = new ConsoleTransport({
				useColors: this.config.useColors,
				structured: this.config.structured,
			});

			// Wrap in batched transport if configured
			if (this.config.batchSize || this.config.flushInterval) {
				transports.push(
					new BatchedTransport(consoleTransport, {
						maxBatchSize: this.config.batchSize,
						flushInterval: this.config.flushInterval,
					}),
				);
			} else {
				transports.push(consoleTransport);
			}
		}

		// HTTP transport if configured
		if (this.config.httpEndpoint) {
			// You would implement HTTPTransport here
			// transports.push(new HTTPTransport({ endpoint: this.config.httpEndpoint }));
		}

		return transports;
	}

	/**
	 * Reset configuration (mainly for testing)
	 */
	reset(): void {
		this.config = {};
		this.priorities.clear();
		this.loadFromEnvironment();
	}

	/**
	 * Get environment variable documentation
	 */
	static getDocumentation(): string {
		return `
# nexlog Environment Variables

## Core Settings
- NEXLOG_LEVEL: Log level (trace|debug|info|warn|error|fatal) [default: info]
- NEXLOG_ENABLED: Enable/disable all logging (true|false) [default: true]
- NEXLOG_SSR_ONLY: Only log on server-side rendering (true|false) [default: false]
- NEXLOG_CLIENT_ENABLED: Enable client-side logging (true|false) [default: true]
- NEXLOG_EDGE_ENABLED: Enable edge runtime logging (true|false) [default: true]

## Output Settings
- NEXLOG_STRUCTURED: Use JSON structured logging (true|false) [default: false]
- NEXLOG_COLORS: Use colors in console output (true|false) [default: true]
- NEXLOG_NAMESPACE: Default namespace for all loggers
- NEXLOG_PREFIX: Prefix for all log messages

## Performance Settings
- NEXLOG_SAMPLING_RATE: Sampling rate 0-1 (e.g., 0.5 = 50% of logs) [default: 1]
- NEXLOG_BATCH_SIZE: Batch size for batched transport [default: 100]
- NEXLOG_FLUSH_INTERVAL: Flush interval in ms [default: 1000]
- NEXLOG_MAX_QUEUE_SIZE: Maximum queue size for batching [default: 1000]

## Feature Flags
- NEXLOG_DEV_TOOLS: Enable dev tools in production (true|false) [default: false]
- NEXLOG_LIFECYCLE: Log lifecycle events (true|false) [default: true]
- NEXLOG_PERFORMANCE: Include performance metrics (true|false) [default: false]
- NEXLOG_STACK_TRACES: Include stack traces in errors (true|false) [default: true]

## Transport Settings
- NEXLOG_TRANSPORTS: Comma-separated list of transports (console,file,http)
- NEXLOG_CONSOLE_ENABLED: Enable console transport (true|false) [default: true]
- NEXLOG_HTTP_ENDPOINT: HTTP endpoint for remote logging

## Filtering
- NEXLOG_INCLUDE_PATTERNS: Comma-separated regex patterns to include
- NEXLOG_EXCLUDE_PATTERNS: Comma-separated regex patterns to exclude

## Context
- NEXLOG_CONTEXT_*: Any variable starting with NEXLOG_CONTEXT_ will be added to context
  Example: NEXLOG_CONTEXT_VERSION=1.0.0 adds {version: "1.0.0"} to context

## Development
- NEXLOG_DEBUG: Enable debug output (true|false) [default: false]
- NEXLOG_VERBOSE: Enable verbose output (true|false) [default: false]

## Examples

# Production configuration
NEXLOG_LEVEL=warn
NEXLOG_STRUCTURED=true
NEXLOG_SSR_ONLY=true
NEXLOG_SAMPLING_RATE=0.1

# Development configuration
NEXLOG_LEVEL=trace
NEXLOG_COLORS=true
NEXLOG_DEV_TOOLS=true
NEXLOG_PERFORMANCE=true

# Disable client logging
NEXLOG_CLIENT_ENABLED=false
NEXLOG_SSR_ONLY=true

# Add context
NEXLOG_CONTEXT_VERSION=1.0.0
NEXLOG_CONTEXT_ENVIRONMENT=production
NEXLOG_CONTEXT_REGION=us-west-2
`;
	}
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
