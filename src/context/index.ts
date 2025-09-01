/**
 * Context management for nexlog
 * Provides persistent context across async operations
 */

import { CAPABILITIES, HAS_PROCESS } from "../runtime/detector.js";

export interface LogContext {
	requestId?: string;
	userId?: string;
	sessionId?: string;
	traceId?: string;
	spanId?: string;
	parentSpanId?: string;
	[key: string]: unknown;
}

/**
 * Abstract context manager interface
 */
export interface ContextManager {
	run<T>(context: LogContext, fn: () => T): T;
	runAsync<T>(context: LogContext, fn: () => Promise<T>): Promise<T>;
	get(): LogContext | undefined;
	set(context: LogContext): void;
	update(context: Partial<LogContext>): void;
	clear(): void;
}

/**
 * Node.js AsyncLocalStorage-based context manager
 */
class AsyncLocalStorageContextManager implements ContextManager {
	private storage: {
		run<T>(context: LogContext, fn: () => T): T;
		getStore(): LogContext | undefined;
	} | null = null;

	constructor() {
		if (HAS_PROCESS) {
			try {
				// Dynamic import to avoid Edge Runtime issues
				const { AsyncLocalStorage } = require("node:async_hooks");
				this.storage = new AsyncLocalStorage();
			} catch {
				// Fallback if async_hooks is not available
				this.storage = null;
			}
		}
	}

	run<T>(context: LogContext, fn: () => T): T {
		if (!this.storage) {
			// Fallback: run without context
			return fn();
		}
		return this.storage.run(context, fn);
	}

	async runAsync<T>(context: LogContext, fn: () => Promise<T>): Promise<T> {
		if (!this.storage) {
			// Fallback: run without context
			return fn();
		}
		return this.storage.run(context, fn);
	}

	get(): LogContext | undefined {
		if (!this.storage) return undefined;
		return this.storage.getStore();
	}

	set(context: LogContext): void {
		if (!this.storage) return;
		const store = this.storage.getStore();
		if (store) {
			Object.assign(store, context);
		}
	}

	update(context: Partial<LogContext>): void {
		if (!this.storage) return;
		const store = this.storage.getStore();
		if (store) {
			Object.assign(store, context);
		}
	}

	clear(): void {
		if (!this.storage) return;
		const store = this.storage.getStore();
		if (store) {
			for (const key in store) {
				delete store[key];
			}
		}
	}
}

/**
 * Edge Runtime / Browser context manager using a global WeakMap
 */
class GlobalContextManager implements ContextManager {
	private static instance: GlobalContextManager;
	private currentContext: LogContext | undefined;
	private contextStack: LogContext[] = [];

	static getInstance(): GlobalContextManager {
		if (!GlobalContextManager.instance) {
			GlobalContextManager.instance = new GlobalContextManager();
		}
		return GlobalContextManager.instance;
	}

	run<T>(context: LogContext, fn: () => T): T {
		const previousContext = this.currentContext;
		this.currentContext = { ...previousContext, ...context };
		this.contextStack.push(this.currentContext);

		try {
			return fn();
		} finally {
			this.contextStack.pop();
			this.currentContext = previousContext;
		}
	}

	async runAsync<T>(context: LogContext, fn: () => Promise<T>): Promise<T> {
		const previousContext = this.currentContext;
		this.currentContext = { ...previousContext, ...context };
		this.contextStack.push(this.currentContext);

		try {
			return await fn();
		} finally {
			this.contextStack.pop();
			this.currentContext = previousContext;
		}
	}

	get(): LogContext | undefined {
		return this.currentContext;
	}

	set(context: LogContext): void {
		this.currentContext = context;
	}

	update(context: Partial<LogContext>): void {
		if (this.currentContext) {
			Object.assign(this.currentContext, context);
		} else {
			this.currentContext = context as LogContext;
		}
	}

	clear(): void {
		this.currentContext = undefined;
		this.contextStack = [];
	}
}

/**
 * Context manager factory
 */
export function createContextManager(): ContextManager {
	if (HAS_PROCESS && CAPABILITIES.hasAsyncLocalStorage) {
		return new AsyncLocalStorageContextManager();
	}
	return GlobalContextManager.getInstance();
}

/**
 * Default context manager instance
 */
export const contextManager = createContextManager();

/**
 * Context builder for creating structured contexts
 */
export class ContextBuilder {
	private context: LogContext = {};

	withRequestId(requestId: string): this {
		this.context.requestId = requestId;
		return this;
	}

	withUserId(userId: string): this {
		this.context.userId = userId;
		return this;
	}

	withSessionId(sessionId: string): this {
		this.context.sessionId = sessionId;
		return this;
	}

	withTraceId(traceId: string): this {
		this.context.traceId = traceId;
		return this;
	}

	withSpanId(spanId: string): this {
		this.context.spanId = spanId;
		return this;
	}

	withParentSpanId(parentSpanId: string): this {
		this.context.parentSpanId = parentSpanId;
		return this;
	}

	with(key: string, value: unknown): this {
		this.context[key] = value;
		return this;
	}

	withMultiple(context: LogContext): this {
		Object.assign(this.context, context);
		return this;
	}

	build(): LogContext {
		return { ...this.context };
	}

	run<T>(fn: () => T): T {
		return contextManager.run(this.context, fn);
	}

	async runAsync<T>(fn: () => Promise<T>): Promise<T> {
		return contextManager.runAsync(this.context, fn);
	}
}

/**
 * Convenience function to create a new context builder
 */
export function context(): ContextBuilder {
	return new ContextBuilder();
}

/**
 * Decorator for adding context to class methods
 */
export function withContext(context: LogContext | (() => LogContext)) {
	return (
		_target: unknown,
		_propertyKey: string,
		descriptor: PropertyDescriptor,
	) => {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: unknown[]) {
			const ctx = typeof context === "function" ? context() : context;

			if (originalMethod.constructor.name === "AsyncFunction") {
				return contextManager.runAsync(ctx, () =>
					originalMethod.apply(this, args),
				);
			} else {
				return contextManager.run(ctx, () => originalMethod.apply(this, args));
			}
		};

		return descriptor;
	};
}

interface ExpressRequest {
	id?: string;
	headers: Record<string, string | string[] | undefined>;
	user?: { id?: string };
	session?: { id?: string };
	method?: string;
	path?: string;
	url?: string;
	ip?: string;
	connection?: { remoteAddress?: string };
}

interface NextJsRequest {
	headers: { get(name: string): string | null };
	method: string;
	url: string;
}

function extractHeader(
	headers: Record<string, string | string[] | undefined>,
	name: string,
): string | undefined {
	const value = headers[name];
	return Array.isArray(value) ? value[0] : value;
}

/**
 * Express/Koa middleware for automatic context injection
 */
export function contextMiddleware(
	generateContext?: (req: ExpressRequest) => LogContext,
) {
	return async (
		req: ExpressRequest,
		_res: Record<string, unknown>,
		next: () => void,
	) => {
		const context: LogContext = generateContext
			? generateContext(req)
			: {
					requestId:
						req.id ||
						extractHeader(req.headers, "x-request-id") ||
						crypto.randomUUID(),
					userId: req.user?.id,
					sessionId: req.session?.id,
					traceId: extractHeader(req.headers, "x-trace-id"),
					method: req.method,
					path: req.path || req.url,
					ip: req.ip || req.connection?.remoteAddress,
				};

		await contextManager.runAsync(context, async () => {
			next();
		});
	};
}

/**
 * Next.js middleware for automatic context injection
 */
export function nextContextMiddleware(
	generateContext?: (req: NextJsRequest) => LogContext,
) {
	return async (
		req: NextJsRequest,
		_event: Record<string, unknown>,
		next: () => void,
	) => {
		const context: LogContext = generateContext
			? generateContext(req)
			: {
					requestId: req.headers.get("x-request-id") ?? crypto.randomUUID(),
					traceId: req.headers.get("x-trace-id") ?? undefined,
					method: req.method,
					path: new URL(req.url).pathname,
					ip:
						req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
				};

		return contextManager.runAsync(context, async () => {
			return next();
		});
	};
}
