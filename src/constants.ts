/**
 * Constants for nexlog
 */

import type { LogLevel } from "./types.js";

/**
 * Numeric representation of log levels for comparison
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
	trace: 0,
	debug: 1,
	info: 2,
	success: 3,
	warn: 4,
	error: 5,
	fatal: 6,
} as const;

/**
 * ANSI color codes for terminal output
 */
export const COLORS = {
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
export const LEVEL_COLORS: Record<LogLevel, string> = {
	trace: COLORS.gray,
	debug: COLORS.cyan,
	info: COLORS.green,
	success: `${COLORS.bright}${COLORS.green}`,
	warn: COLORS.yellow,
	error: COLORS.red,
	fatal: `${COLORS.bright}${COLORS.red}`,
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
	logLevel: "info" as LogLevel,
	batchSize: 100,
	flushInterval: 1000,
	bufferSize: 1000,
	samplingRate: 1,
	maxDepth: 10,
	circularBufferSize: 5000,
} as const;

/**
 * Environment variable prefixes
 */
export const ENV_PREFIX = "NEXLOG_" as const;

/**
 * Transport names
 */
export const TRANSPORT_NAMES = {
	console: "console",
	edgeConsole: "edge-console",
	batched: "batched",
	http: "http",
	file: "file",
} as const;
