/**
 * Runtime detection utilities for nexlog
 * Safely detects the current runtime environment
 */

export type RuntimeEnvironment =
	| "edge"
	| "node"
	| "bun"
	| "browser"
	| "worker"
	| "unknown";

interface RuntimeCapabilities {
	hasProcess: boolean;
	hasMemoryUsage: boolean;
	hasAsyncLocalStorage: boolean;
	hasPerformance: boolean;
	hasConsole: boolean;
	hasCrypto: boolean;
	hasBuffer: boolean;
	hasFileSystem: boolean;
}

/**
 * Detects the current runtime environment with high accuracy
 */
export function detectRuntime(): RuntimeEnvironment {
	// Check for Bun runtime first (highest priority)
	if (
		typeof (globalThis as Record<string, unknown>).Bun !== "undefined" &&
		typeof (
			(globalThis as Record<string, unknown>).Bun as { version?: unknown }
		)?.version === "string"
	) {
		return "bun";
	}

	// Enhanced Edge Runtime detection
	const isEdgeRuntime =
		// Vercel Edge Runtime
		typeof (globalThis as Record<string, unknown>).EdgeRuntime !==
			"undefined" ||
		// Next.js Edge Runtime
		(typeof process !== "undefined" && process.env?.NEXT_RUNTIME === "edge") ||
		// Cloudflare Workers
		(typeof (globalThis as Record<string, unknown>).caches !== "undefined" &&
			typeof (globalThis as Record<string, unknown>).Request !== "undefined" &&
			typeof (globalThis as Record<string, unknown>).Response !== "undefined" &&
			!globalThis.window) ||
		// Deno Deploy
		(typeof (globalThis as Record<string, unknown>).Deno !== "undefined" &&
			(
				(globalThis as Record<string, unknown>).Deno as {
					env?: { get?: (key: string) => unknown };
				}
			)?.env?.get?.("DENO_DEPLOYMENT_ID")) ||
		// Auto-detect: No Node.js APIs available
		(typeof globalThis !== "undefined" &&
			!globalThis.process?.versions?.node &&
			typeof globalThis.fetch !== "undefined" &&
			typeof globalThis.crypto !== "undefined" &&
			typeof globalThis.TextEncoder !== "undefined");

	if (isEdgeRuntime) {
		return "edge";
	}

	// Check for Node.js
	if (
		typeof process !== "undefined" &&
		process.versions?.node &&
		typeof window === "undefined"
	) {
		return "node";
	}

	// Check for browser environment
	if (typeof window !== "undefined" && typeof document !== "undefined") {
		return "browser";
	}

	// Check for Web Workers
	if (
		typeof self !== "undefined" &&
		typeof (self as unknown as Record<string, unknown>).importScripts ===
			"function"
	) {
		return "worker";
	}

	return "unknown";
}

/**
 * Gets the capabilities of the current runtime
 */
export function getRuntimeCapabilities(): RuntimeCapabilities {
	const runtime = detectRuntime();

	switch (runtime) {
		case "node":
		case "bun":
			return {
				hasProcess: true,
				hasMemoryUsage: true,
				hasAsyncLocalStorage: true,
				hasPerformance: true,
				hasConsole: true,
				hasCrypto: true,
				hasBuffer: true,
				hasFileSystem: true,
			};

		case "edge":
			return {
				hasProcess: false,
				hasMemoryUsage: false,
				hasAsyncLocalStorage: false,
				hasPerformance: true,
				hasConsole: true,
				hasCrypto: true,
				hasBuffer: false,
				hasFileSystem: false,
			};

		case "browser":
		case "worker":
			return {
				hasProcess: false,
				hasMemoryUsage: false,
				hasAsyncLocalStorage: false,
				hasPerformance: true,
				hasConsole: true,
				hasCrypto: true,
				hasBuffer: false,
				hasFileSystem: false,
			};

		default:
			return {
				hasProcess: typeof process !== "undefined",
				hasMemoryUsage:
					typeof process !== "undefined" &&
					typeof process.memoryUsage === "function",
				hasAsyncLocalStorage: false,
				hasPerformance: typeof performance !== "undefined",
				hasConsole: typeof console !== "undefined",
				hasCrypto: typeof crypto !== "undefined",
				hasBuffer: typeof Buffer !== "undefined",
				hasFileSystem: false,
			};
	}
}

/**
 * Checks if a specific capability is available
 */
export function hasCapability(capability: keyof RuntimeCapabilities): boolean {
	return getRuntimeCapabilities()[capability];
}

// Export singleton values for performance
export const RUNTIME = detectRuntime();
export const CAPABILITIES = getRuntimeCapabilities();
export const IS_EDGE = RUNTIME === "edge";
export const IS_NODE = RUNTIME === "node";
export const IS_BUN = RUNTIME === "bun";
export const IS_BROWSER = RUNTIME === "browser";
export const IS_WORKER = RUNTIME === "worker";
export const IS_SERVER = IS_NODE || IS_BUN || IS_EDGE;
export const HAS_PROCESS = CAPABILITIES.hasProcess;
export const HAS_MEMORY_USAGE = CAPABILITIES.hasMemoryUsage;
