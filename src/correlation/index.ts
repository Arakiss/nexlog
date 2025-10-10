/**
 * Correlation ID and request tracing system for nexlog
 * Tracks requests across distributed systems
 */

/**
 * Correlation context for distributed tracing
 */
export interface CorrelationContext {
	/** Unique request identifier */
	requestId?: string;
	/** Distributed trace identifier */
	traceId?: string;
	/** Current span identifier */
	spanId?: string;
	/** Parent span identifier */
	parentSpanId?: string;
	/** User identifier */
	userId?: string;
	/** Session identifier */
	sessionId?: string;
	/** Service name */
	service?: string;
	/** Service version */
	version?: string;
	/** Additional custom context */
	[key: string]: string | undefined;
}

/**
 * Correlation ID generator
 */
export class CorrelationManager {
	private static instance: CorrelationManager;
	private context: CorrelationContext = {};
	private readonly prefix: string;
	private readonly generateId: () => string;

	constructor(options?: {
		prefix?: string;
		generateId?: () => string;
	}) {
		this.prefix = options?.prefix || "";
		this.generateId = options?.generateId || this.defaultIdGenerator;
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(): CorrelationManager {
		if (!CorrelationManager.instance) {
			CorrelationManager.instance = new CorrelationManager();
		}
		return CorrelationManager.instance;
	}

	/**
	 * Default ID generator
	 */
	private defaultIdGenerator(): string {
		// Use crypto.randomUUID if available, fallback to timestamp + random
		if (typeof crypto !== "undefined" && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		// Fallback for environments without crypto.randomUUID
		return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
	}

	/**
	 * Generate a new request ID
	 */
	generateRequestId(): string {
		const id = this.generateId();
		return this.prefix ? `${this.prefix}_${id}` : id;
	}

	/**
	 * Generate a new trace ID
	 */
	generateTraceId(): string {
		// Standard 32-character hex trace ID
		if (typeof crypto !== "undefined" && crypto.getRandomValues) {
			const buffer = new Uint8Array(16);
			crypto.getRandomValues(buffer);
			return Array.from(buffer)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
		}
		// Fallback
		return this.generateId().replace(/-/g, "");
	}

	/**
	 * Generate a new span ID
	 */
	generateSpanId(): string {
		// Standard 16-character hex span ID
		if (typeof crypto !== "undefined" && crypto.getRandomValues) {
			const buffer = new Uint8Array(8);
			crypto.getRandomValues(buffer);
			return Array.from(buffer)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
		}
		// Fallback
		return this.generateId().substring(0, 16).replace(/-/g, "");
	}

	/**
	 * Set correlation context
	 */
	setContext(context: CorrelationContext): void {
		this.context = { ...this.context, ...context };
	}

	/**
	 * Get current correlation context
	 */
	getContext(): CorrelationContext {
		return { ...this.context };
	}

	/**
	 * Clear correlation context
	 */
	clearContext(): void {
		this.context = {};
	}

	/**
	 * Create a new child span
	 */
	createChildSpan(): CorrelationContext {
		const parentSpanId = this.context.spanId;
		const spanId = this.generateSpanId();

		return {
			...this.context,
			parentSpanId,
			spanId,
		};
	}

	/**
	 * Extract correlation IDs from HTTP headers
	 */
	extractFromHeaders(
		headers: Record<string, string | string[] | undefined>,
	): CorrelationContext {
		const context: CorrelationContext = {};

		// Standard headers
		const requestId = headers["x-request-id"] || headers["x-correlation-id"];
		const traceId = headers["x-trace-id"] || headers.traceparent;
		const spanId = headers["x-span-id"];
		const userId = headers["x-user-id"];
		const sessionId = headers["x-session-id"];

		if (requestId)
			context.requestId = Array.isArray(requestId) ? requestId[0] : requestId;
		if (traceId)
			context.traceId = Array.isArray(traceId) ? traceId[0] : traceId;
		if (spanId) context.spanId = Array.isArray(spanId) ? spanId[0] : spanId;
		if (userId) context.userId = Array.isArray(userId) ? userId[0] : userId;
		if (sessionId)
			context.sessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;

		// Handle W3C Trace Context format
		if (typeof context.traceId === "string" && context.traceId.includes("-")) {
			const parts = context.traceId.split("-");
			if (parts.length >= 3) {
				context.traceId = parts[1];
				context.spanId = parts[2];
			}
		}

		return context;
	}

	/**
	 * Inject correlation IDs into HTTP headers
	 */
	injectIntoHeaders(
		headers: Record<string, string> = {},
	): Record<string, string> {
		const context = this.getContext();

		if (context.requestId) headers["x-request-id"] = context.requestId;
		if (context.traceId) headers["x-trace-id"] = context.traceId;
		if (context.spanId) headers["x-span-id"] = context.spanId;
		if (context.userId) headers["x-user-id"] = context.userId;
		if (context.sessionId) headers["x-session-id"] = context.sessionId;

		// Add W3C Trace Context header
		if (context.traceId && context.spanId) {
			headers.traceparent = `00-${context.traceId}-${context.spanId}-01`;
		}

		return headers;
	}

	/**
	 * Create a middleware for Express/Koa style frameworks
	 */
	middleware() {
		return (
			req: {
				headers: Record<string, string | string[] | undefined>;
				correlationContext?: CorrelationContext;
			},
			res: { setHeader: (name: string, value: string) => void },
			next: () => void,
		) => {
			// Extract existing context from headers
			const context = this.extractFromHeaders(req.headers);

			// Generate missing IDs
			if (!context.requestId) {
				context.requestId = this.generateRequestId();
			}
			if (!context.traceId) {
				context.traceId = this.generateTraceId();
			}
			if (!context.spanId) {
				context.spanId = this.generateSpanId();
			}

			// Set context
			this.setContext(context);

			// Add to request object
			req.correlationContext = context;

			// Add response headers
			res.setHeader("x-request-id", context.requestId);
			if (context.traceId) res.setHeader("x-trace-id", context.traceId);

			next();
		};
	}
}

// Export singleton instance
export const correlationManager = CorrelationManager.getInstance();

/**
 * Decorators for correlation tracking
 */
export function withCorrelation(
	_target: unknown,
	_propertyKey: string,
	descriptor: PropertyDescriptor,
) {
	const originalMethod = descriptor.value;

	descriptor.value = async function (...args: unknown[]) {
		const manager = CorrelationManager.getInstance();
		const childContext = manager.createChildSpan();

		// Store original context
		const originalContext = manager.getContext();

		try {
			// Set child context
			manager.setContext(childContext);

			// Execute original method
			return await originalMethod.apply(this, args);
		} finally {
			// Restore original context
			manager.setContext(originalContext);
		}
	};

	return descriptor;
}

/**
 * Helper to generate correlation IDs
 */
export function generateCorrelationIds(): CorrelationContext {
	const manager = CorrelationManager.getInstance();
	return {
		requestId: manager.generateRequestId(),
		traceId: manager.generateTraceId(),
		spanId: manager.generateSpanId(),
	};
}
