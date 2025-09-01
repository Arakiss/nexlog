/**
 * Pretty print formatter for development mode
 * Makes logs beautiful and readable in development
 */

import { COLORS, LEVEL_COLORS } from "../constants.js";
import type { LogEntry, LogLevel } from "../types.js";

export interface PrettyPrintOptions {
	/** Use colors in output */
	colors?: boolean;
	/** Timestamp format: 'iso', 'relative', 'none' */
	timestamps?: "iso" | "relative" | "none";
	/** Group metadata in collapsed state */
	groupCollapsed?: boolean;
	/** Use emoji icons for log levels */
	emoji?: boolean;
	/** Show milliseconds in relative timestamps */
	showMilliseconds?: boolean;
	/** Indent size for nested data */
	indentSize?: number;
	/** Max depth for object inspection */
	maxDepth?: number;
}

const LEVEL_EMOJI: Record<LogLevel, string> = {
	trace: "🔍",
	debug: "🐛",
	info: "ℹ️",
	success: "✅",
	warn: "⚠️",
	error: "❌",
	fatal: "💀",
};

const LEVEL_LABELS: Record<LogLevel, string> = {
	trace: "TRACE",
	debug: "DEBUG",
	info: "INFO",
	success: "SUCCESS",
	warn: "WARN",
	error: "ERROR",
	fatal: "FATAL",
};

export class PrettyFormatter {
	private options: Required<PrettyPrintOptions>;

	constructor(options: PrettyPrintOptions = {}) {
		this.options = {
			colors: options.colors ?? true,
			timestamps: options.timestamps ?? "relative",
			groupCollapsed: options.groupCollapsed ?? true,
			emoji: options.emoji ?? true,
			showMilliseconds: options.showMilliseconds ?? true,
			indentSize: options.indentSize ?? 2,
			maxDepth: options.maxDepth ?? 10,
		};
	}

	format(entry: LogEntry): string {
		const parts: string[] = [];

		// Add timestamp
		const timestamp = this.formatTimestamp(entry.timestamp);
		if (timestamp) {
			parts.push(timestamp);
		}

		// Add level with emoji or label
		const level = this.formatLevel(entry.level);
		parts.push(level);

		// Add namespace if present
		if (entry.namespace) {
			const namespace = this.formatNamespace(entry.namespace);
			parts.push(namespace);
		}

		// Add message
		parts.push(entry.message);

		return parts.join(" ");
	}

	formatConsole(entry: LogEntry): void {
		const prefix = this.format(entry);
		const method = this.getConsoleMethod(entry.level);

		// Log main message
		if (this.options.colors) {
			console[method](`%c${prefix}`, this.getStyles(entry.level));
		} else {
			console[method](prefix);
		}

		// Log metadata if present
		if (entry.metadata && Object.keys(entry.metadata).length > 0) {
			this.logMetadata(entry.metadata, method);
		}

		// Log stack trace if present
		if (entry.stack) {
			console[method](
				this.options.colors ? `%c${entry.stack}` : entry.stack,
				this.options.colors ? `color: ${COLORS.dim}` : "",
			);
		}
	}

	private formatTimestamp(timestamp: string): string {
		if (this.options.timestamps === "none") {
			return "";
		}

		if (this.options.timestamps === "relative") {
			const now = Date.now();
			const then = new Date(timestamp).getTime();
			const diff = now - then;

			if (diff < 1000) {
				return this.colorize(`${diff}ms`, COLORS.gray);
			} else if (diff < 60000) {
				const seconds = Math.floor(diff / 1000);
				const ms = diff % 1000;
				if (this.options.showMilliseconds) {
					return this.colorize(`${seconds}.${ms}s`, COLORS.gray);
				}
				return this.colorize(`${seconds}s`, COLORS.gray);
			} else if (diff < 3600000) {
				const minutes = Math.floor(diff / 60000);
				return this.colorize(`${minutes}m`, COLORS.gray);
			} else {
				const hours = Math.floor(diff / 3600000);
				return this.colorize(`${hours}h`, COLORS.gray);
			}
		}

		// ISO timestamp
		return this.colorize(timestamp, COLORS.gray);
	}

	private formatLevel(level: LogLevel): string {
		if (this.options.emoji) {
			return LEVEL_EMOJI[level];
		}

		const label = `[${LEVEL_LABELS[level]}]`;
		return this.colorize(label, LEVEL_COLORS[level]);
	}

	private formatNamespace(namespace: string): string {
		return this.colorize(`[${namespace}]`, COLORS.cyan);
	}

	private logMetadata(
		metadata: unknown,
		method: "log" | "info" | "warn" | "error" | "debug",
	): void {
		if (
			this.options.groupCollapsed &&
			typeof console.groupCollapsed === "function"
		) {
			console.groupCollapsed(this.colorize("📦 Metadata", COLORS.dim));
			this.prettyPrintObject(metadata, 0);
			console.groupEnd();
		} else {
			console[method](this.colorize("├─ Metadata:", COLORS.dim), metadata);
		}
	}

	private prettyPrintObject(obj: unknown, depth: number): void {
		if (depth >= this.options.maxDepth) {
			console.log(this.colorize("[Max Depth Reached]", COLORS.dim));
			return;
		}

		const indent = " ".repeat(depth * this.options.indentSize);

		if (obj === null) {
			console.log(`${indent}null`);
		} else if (obj === undefined) {
			console.log(`${indent}undefined`);
		} else if (typeof obj === "object") {
			if (Array.isArray(obj)) {
				obj.forEach((item, index) => {
					console.log(`${indent}[${index}]:`);
					this.prettyPrintObject(item, depth + 1);
				});
			} else {
				for (const [key, value] of Object.entries(obj)) {
					if (typeof value === "object" && value !== null) {
						console.log(`${indent}${this.colorize(key, COLORS.blue)}:`);
						this.prettyPrintObject(value, depth + 1);
					} else {
						const formattedValue = this.formatValue(value);
						console.log(
							`${indent}${this.colorize(key, COLORS.blue)}: ${formattedValue}`,
						);
					}
				}
			}
		} else {
			console.log(`${indent}${this.formatValue(obj)}`);
		}
	}

	private formatValue(value: any): string {
		if (typeof value === "string") {
			return this.colorize(`"${value}"`, COLORS.green);
		} else if (typeof value === "number") {
			return this.colorize(String(value), COLORS.yellow);
		} else if (typeof value === "boolean") {
			return this.colorize(String(value), COLORS.magenta);
		} else if (value === null) {
			return this.colorize("null", COLORS.gray);
		} else if (value === undefined) {
			return this.colorize("undefined", COLORS.gray);
		} else {
			return String(value);
		}
	}

	private colorize(text: string, color: string): string {
		if (!this.options.colors) {
			return text;
		}
		return `${color}${text}${COLORS.reset}`;
	}

	private getStyles(level: LogLevel): string {
		const color = LEVEL_COLORS[level];
		// Convert ANSI to CSS colors
		const cssColors: Record<string, string> = {
			[COLORS.gray]: "color: gray",
			[COLORS.cyan]: "color: cyan",
			[COLORS.green]: "color: green",
			[`${COLORS.bright}${COLORS.green}`]:
				"color: limegreen; font-weight: bold",
			[COLORS.yellow]: "color: orange",
			[COLORS.red]: "color: red",
			[`${COLORS.bright}${COLORS.red}`]: "color: red; font-weight: bold",
		};
		return cssColors[color] || "color: inherit";
	}

	private getConsoleMethod(
		level: LogLevel,
	): "log" | "info" | "warn" | "error" | "debug" {
		switch (level) {
			case "trace":
			case "debug":
				return "debug";
			case "info":
			case "success":
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

	updateOptions(options: Partial<PrettyPrintOptions>): void {
		Object.assign(this.options, options);
	}
}
