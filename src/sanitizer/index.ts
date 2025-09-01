/**
 * Data sanitization system for nexlog
 * Automatically masks sensitive information in logs
 */

export interface SanitizationOptions {
	/** Fields to always mask */
	maskFields?: string[];
	/** Custom sanitization patterns */
	patterns?: Record<string, SanitizationPattern>;
	/** Replacement string for masked values */
	maskString?: string;
	/** Enable auto-detection of sensitive fields */
	autoDetect?: boolean;
	/** Deep sanitization (traverse nested objects) */
	deep?: boolean;
	/** Maximum depth for deep sanitization */
	maxDepth?: number;
}

export interface SanitizationPattern {
	/** Regex pattern to match */
	pattern?: RegExp;
	/** Replacement function or string */
	replacement: string | ((value: string) => string);
	/** Apply only to specific field names */
	fields?: string[];
}

// Common sensitive field names
const SENSITIVE_FIELD_PATTERNS = [
	/^password$/i,
	/^pass$/i,
	/^pwd$/i,
	/^secret$/i,
	/^token$/i,
	/^api[_-]?key$/i,
	/^access[_-]?token$/i,
	/^refresh[_-]?token$/i,
	/^private[_-]?key$/i,
	/^credit[_-]?card$/i,
	/^card[_-]?number$/i,
	/^cvv$/i,
	/^ssn$/i,
	/^social[_-]?security$/i,
	/^auth$/i,
	/^authorization$/i,
	/^bearer$/i,
	/^session[_-]?id$/i,
	/^cookie$/i,
];

// Built-in sanitization patterns
const BUILT_IN_PATTERNS: Record<string, SanitizationPattern> = {
	email: {
		pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
		replacement: (value: string) => {
			const parts = value.split("@");
			const localPart = parts[0];
			const domain = parts[1];
			if (!localPart || !domain) {
				return "***@***";
			}
			if (localPart.length <= 2) {
				return `***@${domain}`;
			}
			return `${localPart.slice(0, 2)}***@${domain}`;
		},
	},
	creditCard: {
		pattern: /^\d{13,19}$/,
		replacement: (value: string) => {
			if (value.length < 8) return "****";
			return `****${value.slice(-4)}`;
		},
	},
	phone: {
		pattern:
			/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/,
		replacement: (value: string) => {
			const digits = value.replace(/\D/g, "");
			if (digits.length < 4) return "****";
			return `****${digits.slice(-4)}`;
		},
	},
	ipAddress: {
		pattern:
			/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
		replacement: (value: string) => {
			const parts = value.split(".");
			return `${parts[0]}.***.***.***`;
		},
	},
	jwt: {
		pattern: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
		replacement: "[JWT_REDACTED]",
	},
	uuid: {
		pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		replacement: (value: string) => {
			return `${value.slice(0, 8)}-****-****-****-************`;
		},
	},
};

/**
 * Sanitizer class for masking sensitive data
 */
export class Sanitizer {
	private options: Required<SanitizationOptions>;
	private compiledPatterns: Map<string, SanitizationPattern>;

	constructor(options: SanitizationOptions = {}) {
		this.options = {
			maskFields: options.maskFields || [],
			patterns: { ...BUILT_IN_PATTERNS, ...options.patterns },
			maskString: options.maskString || "[REDACTED]",
			autoDetect: options.autoDetect !== false,
			deep: options.deep !== false,
			maxDepth: options.maxDepth || 10,
		};

		this.compiledPatterns = new Map(Object.entries(this.options.patterns));
	}

	/**
	 * Sanitize a value based on field name and content
	 */
	sanitizeValue(value: unknown, fieldName?: string, depth = 0): unknown {
		if (depth > this.options.maxDepth) {
			return value;
		}

		// Handle null/undefined
		if (value === null || value === undefined) {
			return value;
		}

		// Handle arrays
		if (Array.isArray(value)) {
			return this.options.deep
				? value.map((item) => this.sanitizeValue(item, fieldName, depth + 1))
				: value;
		}

		// Handle objects
		if (typeof value === "object" && value !== null) {
			return this.sanitizeObject(value as Record<string, unknown>, depth);
		}

		// Handle strings
		if (typeof value === "string") {
			return this.sanitizeString(value, fieldName);
		}

		return value;
	}

	/**
	 * Sanitize an object recursively
	 */
	private sanitizeObject(
		obj: Record<string, unknown>,
		depth: number,
	): Record<string, unknown> {
		const sanitized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(obj)) {
			// Check if field should be completely masked
			if (this.shouldMaskField(key)) {
				sanitized[key] = this.options.maskString;
				continue;
			}

			// Recursively sanitize value
			sanitized[key] = this.options.deep
				? this.sanitizeValue(value, key, depth + 1)
				: value;
		}

		return sanitized;
	}

	/**
	 * Sanitize a string value
	 */
	private sanitizeString(value: string, fieldName?: string): string {
		// Check if field should be masked
		if (fieldName && this.shouldMaskField(fieldName)) {
			return this.options.maskString;
		}

		// Apply patterns
		for (const [_name, pattern] of this.compiledPatterns) {
			// Skip if pattern is field-specific and doesn't match
			if (pattern.fields && fieldName && !pattern.fields.includes(fieldName)) {
				continue;
			}

			// Test pattern
			if (pattern.pattern?.test(value)) {
				if (typeof pattern.replacement === "function") {
					return pattern.replacement(value);
				}
				return pattern.replacement;
			}
		}

		return value;
	}

	/**
	 * Check if a field name should be masked
	 */
	private shouldMaskField(fieldName: string): boolean {
		// Check explicit mask fields
		if (this.options.maskFields.includes(fieldName)) {
			return true;
		}

		// Check auto-detection
		if (this.options.autoDetect) {
			for (const pattern of SENSITIVE_FIELD_PATTERNS) {
				if (pattern.test(fieldName)) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Add a custom field to mask
	 */
	addMaskField(field: string): void {
		if (!this.options.maskFields.includes(field)) {
			this.options.maskFields.push(field);
		}
	}

	/**
	 * Remove a field from masking
	 */
	removeMaskField(field: string): void {
		const index = this.options.maskFields.indexOf(field);
		if (index !== -1) {
			this.options.maskFields.splice(index, 1);
		}
	}

	/**
	 * Add a custom sanitization pattern
	 */
	addPattern(name: string, pattern: SanitizationPattern): void {
		this.compiledPatterns.set(name, pattern);
		this.options.patterns[name] = pattern;
	}

	/**
	 * Remove a sanitization pattern
	 */
	removePattern(name: string): void {
		this.compiledPatterns.delete(name);
		delete this.options.patterns[name];
	}

	/**
	 * Update options
	 */
	updateOptions(options: Partial<SanitizationOptions>): void {
		Object.assign(this.options, options);
		if (options.patterns) {
			this.compiledPatterns = new Map(Object.entries(this.options.patterns));
		}
	}

	/**
	 * Get current options
	 */
	getOptions(): Readonly<Required<SanitizationOptions>> {
		return { ...this.options };
	}
}

// Export a default sanitizer instance
export const defaultSanitizer = new Sanitizer();

/**
 * Convenience function for quick sanitization
 */
export function sanitize(
	data: unknown,
	options?: SanitizationOptions,
): unknown {
	const sanitizer = options ? new Sanitizer(options) : defaultSanitizer;
	return sanitizer.sanitizeValue(data);
}
