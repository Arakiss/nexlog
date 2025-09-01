/**
 * Browser entry point for nexlog
 * Compatible with browser environments
 */

export * from "./constants.js";
export {
	ContextBuilder,
	type ContextManager,
	context,
	contextManager,
	type LogContext,
	withContext,
} from "./context/index.js";
export {
	EdgeConsoleTransport,
	EdgeLogger as Logger,
} from "./logger/edge-logger.js";
export {
	CAPABILITIES,
	detectRuntime,
	getRuntimeCapabilities,
	hasCapability,
	IS_BROWSER,
	RUNTIME,
	type RuntimeEnvironment,
} from "./runtime/detector.js";
export { defaultSanitizer, Sanitizer, sanitize } from "./sanitizer/index.js";

export * from "./types.js";
export { CircularBuffer } from "./utils/circular-buffer.js";

// Browser-specific logger configuration
import { EdgeLogger } from "./logger/edge-logger.js";

const defaultLogger = new EdgeLogger({
	structured: false, // Use formatted logging in browser console
	useColors: true, // Browser console supports colors
	sanitize: true, // Always sanitize in browser for security
});

// Make logger available globally in browser
if (typeof window !== "undefined") {
	(window as unknown as Record<string, unknown>).nexlog = defaultLogger;
}

export default defaultLogger;
