/**
 * Structured error serialization for nexlog
 * Properly serializes Error objects with cause chains and custom properties
 */

export interface SerializedError {
	name: string;
	message: string;
	stack?: ParsedStackFrame[];
	cause?: SerializedError;
	code?: string | number;
	statusCode?: number;
	syscall?: string;
	errno?: number;
	path?: string;
	hostname?: string;
	port?: number;
	address?: string;
	dest?: string;
	[key: string]: unknown;
}

export interface ParsedStackFrame {
	file: string;
	line?: number;
	column?: number;
	function?: string;
	raw: string;
}

export type ParsedStackTrace = ParsedStackFrame;

/**
 * Advanced error serializer with cause chain support
 */
export class ErrorSerializer {
	private static readonly MAX_DEPTH = 10;
	private static readonly MAX_PROPERTIES = 50;

	/**
	 * Serialize any error-like object into a structured format
	 */
	static serialize(error: unknown, depth = 0): SerializedError | undefined {
		if (depth > this.MAX_DEPTH) {
			return {
				name: "MaxDepthExceeded",
				message: `Maximum serialization depth of ${this.MAX_DEPTH} exceeded`,
			};
		}

		if (!error) {
			return undefined;
		}

		// Handle Error instances
		if (error instanceof Error) {
			return this.serializeError(error, depth);
		}

		// Handle error-like objects
		if (typeof error === "object" && error !== null) {
			return this.serializeErrorLike(error as Record<string, unknown>);
		}

		// Handle primitive values
		return {
			name: "UnknownError",
			message: String(error),
		};
	}

	/**
	 * Serialize a proper Error instance
	 */
	private static serializeError(error: Error, depth: number): SerializedError {
		const serialized: SerializedError = {
			name: error.name,
			message: error.message,
		};

		// Parse stack trace
		if (error.stack) {
			serialized.stack = this.parseStackTrace(error.stack);
		}

		// Handle Error cause chain (ES2022 feature)
		if ("cause" in error && error.cause) {
			serialized.cause = this.serialize(error.cause, depth + 1);
		}

		// Extract common Node.js error properties
		this.extractCommonProperties(error, serialized);

		// Extract custom properties
		this.extractCustomProperties(error, serialized);

		return serialized;
	}

	/**
	 * Serialize error-like objects
	 */
	private static serializeErrorLike(obj: Record<string, unknown>): SerializedError {
		const serialized: SerializedError = {
			name: String(obj.name || "Error"),
			message: String(obj.message || "Unknown error"),
		};

		// Try to parse stack if it exists
		if (typeof obj.stack === "string") {
			serialized.stack = this.parseStackTrace(obj.stack);
		}

		// Handle cause chain
		if (obj.cause) {
			serialized.cause = this.serialize(obj.cause, 1);
		}

		// Extract common properties
		this.extractCommonProperties(obj, serialized);

		return serialized;
	}

	/**
	 * Parse stack trace string into structured format
	 */
	private static parseStackTrace(stack: string): ParsedStackFrame[] {
		const frames: ParsedStackFrame[] = [];
		const lines = stack.split("\n");

		for (const line of lines) {
			const trimmed = line.trim();
			
			// Skip the error message line
			if (!trimmed.startsWith("at ")) {
				continue;
			}

			const frame = this.parseStackFrame(trimmed);
			if (frame) {
				frames.push(frame);
			}
		}

		return frames;
	}

	/**
	 * Parse a single stack frame
	 */
	private static parseStackFrame(line: string): ParsedStackFrame | null {
		// Remove "at " prefix
		const cleaned = line.slice(3);

		// Try to match different stack trace formats
		const patterns = [
			// function name with location: "functionName (file:line:col)"
			/^(.+?)\s+\((.+?):(\d+):(\d+)\)$/,
			// anonymous function: "(file:line:col)"
			/^\((.+?):(\d+):(\d+)\)$/,
			// function name only with location: "functionName file:line:col"
			/^(.+?)\s+(.+?):(\d+):(\d+)$/,
			// file only: "file:line:col"
			/^(.+?):(\d+):(\d+)$/,
		];

		for (const pattern of patterns) {
			const match = cleaned.match(pattern);
			if (match) {
				if (match.length === 5 && match[1] && match[2] && match[3] && match[4]) {
					// Has function name
					return {
						function: match[1],
						file: match[2],
						line: parseInt(match[3], 10),
						column: parseInt(match[4], 10),
						raw: line,
					};
				} else if (match.length === 4 && match[1] && match[2] && match[3]) {
					// No function name or file only
					const hasFunction = cleaned.includes(" ");
					if (hasFunction && match[4]) {
						return {
							function: match[1],
							file: match[2],
							line: parseInt(match[3], 10),
							column: parseInt(match[4], 10),
							raw: line,
						};
					} else {
						return {
							file: match[1],
							line: parseInt(match[2], 10),
							column: parseInt(match[3], 10),
							raw: line,
						};
					}
				}
			}
		}

		// Fallback: return raw line
		return {
			file: "unknown",
			raw: line,
		};
	}

	/**
	 * Extract common Node.js error properties
	 */
	private static extractCommonProperties(
		error: Error | Record<string, unknown>,
		serialized: SerializedError
	): void {
		const commonProps = [
			"code",
			"statusCode",
			"syscall",
			"errno",
			"path",
			"hostname",
			"port",
			"address",
			"dest",
		];

		for (const prop of commonProps) {
			if (prop in error && error[prop as keyof typeof error] != null) {
				serialized[prop as keyof SerializedError] = error[prop as keyof typeof error] as any;
			}
		}
	}

	/**
	 * Extract custom properties from error object
	 */
	private static extractCustomProperties(
		error: Error | Record<string, unknown>,
		serialized: SerializedError
	): void {
		const standardProps = new Set([
			"name",
			"message",
			"stack",
			"cause",
			"code",
			"statusCode",
			"syscall",
			"errno",
			"path",
			"hostname",
			"port",
			"address",
			"dest",
		]);

		let propertyCount = 0;
		for (const [key, value] of Object.entries(error)) {
			// Skip standard properties
			if (standardProps.has(key)) {
				continue;
			}

			// Limit number of custom properties
			if (propertyCount >= this.MAX_PROPERTIES) {
				serialized["_truncated"] = `Additional ${Object.keys(error).length - standardProps.size - propertyCount} properties truncated`;
				break;
			}

			// Only include serializable values
			if (this.isSerializable(value)) {
				serialized[key] = value;
				propertyCount++;
			}
		}
	}

	/**
	 * Check if a value can be safely serialized to JSON
	 */
	private static isSerializable(value: unknown): boolean {
		if (value === null || value === undefined) {
			return true;
		}

		const type = typeof value;
		if (type === "string" || type === "number" || type === "boolean") {
			return true;
		}

		if (type === "object") {
			// Avoid circular references and functions
			if (value instanceof Date || value instanceof RegExp) {
				return true;
			}

			if (Array.isArray(value)) {
				return value.length < 100; // Limit array size
			}

			// Simple object check
			try {
				JSON.stringify(value);
				return true;
			} catch {
				return false;
			}
		}

		return false;
	}

	/**
	 * Create a minimal error representation for performance-critical paths
	 */
	static serializeMinimal(error: unknown): { name: string; message: string } {
		if (error instanceof Error) {
			return {
				name: error.name,
				message: error.message,
			};
		}

		if (typeof error === "object" && error !== null) {
			const obj = error as Record<string, unknown>;
			return {
				name: String(obj.name || "Error"),
				message: String(obj.message || "Unknown error"),
			};
		}

		return {
			name: "UnknownError",
			message: String(error),
		};
	}

	/**
	 * Check if an error has a specific cause type
	 */
	static hasCauseOfType(error: SerializedError, errorName: string): boolean {
		let current: SerializedError | undefined = error;
		while (current) {
			if (current.name === errorName) {
				return true;
			}
			current = current.cause;
		}
		return false;
	}

	/**
	 * Get the root cause of an error chain
	 */
	static getRootCause(error: SerializedError): SerializedError {
		let current = error;
		while (current.cause) {
			current = current.cause;
		}
		return current;
	}

	/**
	 * Format error for display
	 */
	static formatForDisplay(error: SerializedError, includeStack = false): string {
		let output = `${error.name}: ${error.message}`;

		if (error.code) {
			output += ` (${error.code})`;
		}

		if (includeStack && error.stack && error.stack.length > 0) {
			output += "\n" + error.stack.map(frame => 
				`  at ${frame.function || "anonymous"} (${frame.file}:${frame.line || "?"}:${frame.column || "?"})`
			).join("\n");
		}

		if (error.cause) {
			output += "\n\nCaused by: " + this.formatForDisplay(error.cause, includeStack);
		}

		return output;
	}
}