/**
 * Edge Runtime entry point for nexlog
 * Compatible with Vercel Edge, Cloudflare Workers, and other edge environments
 */

export * from "./constants.js";
export {
	ContextBuilder,
	context,
	contextManager,
	type IContextManager,
	type LogContext,
	nextContextMiddleware,
	withContext,
} from "./context/index.js";
export {
	EdgeConsoleTransport,
	EdgeLogger,
	EdgeLogger as Logger,
} from "./logger/edge-logger.js";
export {
	CAPABILITIES,
	detectRuntime,
	getRuntimeCapabilities,
	hasCapability,
	IS_BROWSER,
	IS_BUN,
	IS_EDGE,
	IS_NODE,
	IS_SERVER,
	IS_WORKER,
	RUNTIME,
	type RuntimeEnvironment,
} from "./runtime/detector.js";
export { defaultSanitizer, Sanitizer, sanitize } from "./sanitizer/index.js";

export * from "./types.js";
export { CircularBuffer } from "./utils/circular-buffer.js";

// Default Edge logger instance
import { EdgeLogger } from "./logger/edge-logger.js";

const defaultLogger = new EdgeLogger({
	structured: true, // Use structured logging by default in edge
	useColors: false, // No colors in edge environments
});

export default defaultLogger;
