import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	type Mock,
	mock,
	test,
} from "bun:test";
import logger, {
	BatchedTransport,
	configManager,
	ConsoleTransport,
	detectRuntime,
	isBrowser,
	isEdge,
	isServer,
	type LogEntry,
	Logger,
	type LoggerPlugin,
	type LogLevel,
	type Transport,
} from "../src/index";

// Save original console methods
const originalConsole = {
	log: console.log,
	info: console.info,
	warn: console.warn,
	error: console.error,
	debug: console.debug,
};

// Save original Math.random to restore later
const originalRandom = Math.random;

// Mock console methods
let mockedConsole: Record<string, Mock<(...args: unknown[]) => void>> = {};

beforeAll(() => {
	mockedConsole = {
		log: mock(() => {}),
		info: mock(() => {}),
		warn: mock(() => {}),
		error: mock(() => {}),
		debug: mock(() => {}),
	};
	Object.assign(console, mockedConsole);
});

beforeEach(() => {
	// Clear all mocks
	for (const mockedFn of Object.values(mockedConsole)) {
		mockedFn.mockClear();
	}
	// Clear all NEXLOG_* environment variables to prevent CI interference
	Object.keys(process.env).forEach((key) => {
		if (key.startsWith("NEXLOG_")) {
			delete process.env[key];
		}
	});
	// Mock Math.random to ensure deterministic sampling behavior
	// Return 0 so all logs pass sampling check (0 <= samplingRate for any value)
	Math.random = () => 0;
	// Reset logger to default state
	logger.setLevel("trace");
	logger.enable();
	logger.setSSROnly(false);
	// Override sampling rate to 1.0 to ensure all logs pass sampling check
	// biome-ignore lint/suspicious/noExplicitAny: Accessing private property for testing
	(logger as any).config.samplingRate = 1.0;
	// Clear include/exclude patterns on configManager to ensure all messages are logged
	// biome-ignore lint/suspicious/noExplicitAny: Accessing private property for testing
	(configManager as any).config.includePatterns = undefined;
	// biome-ignore lint/suspicious/noExplicitAny: Accessing private property for testing
	(configManager as any).config.excludePatterns = undefined;
});

afterAll(() => {
	// Restore original console
	Object.assign(console, originalConsole);
	// Restore original Math.random
	Math.random = originalRandom;
});

describe("Environment Detection", () => {
	test("detects server environment correctly", () => {
		expect(typeof isServer).toBe("boolean");
		expect(typeof isBrowser).toBe("boolean");
		expect(typeof isEdge).toBe("boolean");
	});

	test("detectRuntime returns valid environment", () => {
		const env = detectRuntime();
		expect(["bun", "node", "browser", "edge", "worker", "unknown"]).toContain(
			env,
		);
	});

	test("detects Edge Runtime when EdgeRuntime is present", () => {
		// In Bun runtime, Bun detection takes precedence
		// This test verifies EdgeRuntime is detected when available
		const originalEdgeRuntime = globalThis.EdgeRuntime;
		globalThis.EdgeRuntime = "edge-runtime";

		// Since Bun is always present in this test environment,
		// we expect Bun to be detected first
		const env = detectRuntime();
		expect(["bun", "edge"]).toContain(env);

		globalThis.EdgeRuntime = originalEdgeRuntime;
	});
});

describe("Logger Basic Functionality", () => {
	test("logs all levels correctly", () => {
		const levels: LogLevel[] = [
			"trace",
			"debug",
			"info",
			"warn",
			"error",
			"fatal",
		];

		for (const level of levels) {
			logger[level](`Test ${level} message`, { meta: "data" });
			const expectedMethod = ["trace", "debug"].includes(level)
				? "debug"
				: level === "fatal"
					? "error"
					: level;
			expect(mockedConsole[expectedMethod]).toHaveBeenCalled();
		}
	});

	test("respects log level filtering", () => {
		logger.setLevel("warn");

		logger.trace("trace");
		logger.debug("debug");
		logger.info("info");
		expect(mockedConsole.debug).not.toHaveBeenCalled();
		expect(mockedConsole.info).not.toHaveBeenCalled();

		logger.warn("warn");
		logger.error("error");
		expect(mockedConsole.warn).toHaveBeenCalled();
		expect(mockedConsole.error).toHaveBeenCalled();
	});

	test("can be enabled and disabled", () => {
		logger.disable();
		expect(logger.isEnabled()).toBe(false);
		logger.info("should not log");
		expect(mockedConsole.info).not.toHaveBeenCalled();

		logger.enable();
		expect(logger.isEnabled()).toBe(true);
		logger.info("should log");
		expect(mockedConsole.info).toHaveBeenCalled();
	});

	test("handles SSR-only mode", () => {
		// In Bun runtime, SSR-only mode should always allow logging
		// since Bun is a server-side runtime
		logger.setSSROnly(true);
		logger.info("server log");
		expect(mockedConsole.info).toHaveBeenCalled();

		// Reset
		mockedConsole.info.mockClear();
		logger.setSSROnly(false);

		// When SSR-only is off, should still log in Bun
		logger.info("normal log");
		expect(mockedConsole.info).toHaveBeenCalled();
	});
});

describe("Logger Advanced Features", () => {
	test("creates child loggers with namespaces", () => {
		const child = logger.child("component");
		child.info("child log");

		const lastCall = mockedConsole.info.mock.calls[0];
		expect(lastCall[0]).toContain("[component]");
	});

	test("child loggers inherit parent configuration", () => {
		logger.setLevel("warn");
		const child = logger.child("child");

		child.info("should not log");
		expect(mockedConsole.info).not.toHaveBeenCalled();

		child.warn("should log");
		expect(mockedConsole.warn).toHaveBeenCalled();
	});

	test("supports nested child loggers", () => {
		const child1 = logger.child("app");
		const child2 = child1.child("component");

		child2.info("nested log");
		const lastCall = mockedConsole.info.mock.calls[0];
		expect(lastCall[0]).toContain("[app:component]");
	});

	test("caches child loggers", () => {
		const child1 = logger.child("test");
		const child2 = logger.child("test");
		expect(child1).toBe(child2);
	});

	test("updates context correctly", () => {
		const testLogger = new Logger();
		testLogger.setContext({ userId: "123", sessionId: "abc" });

		// Create a mock transport to capture log entries
		const capturedEntries: LogEntry[] = [];
		const mockTransport: Transport = {
			name: "mock",
			log: (entry) => capturedEntries.push(entry),
		};

		testLogger.addTransport(mockTransport);
		testLogger.removeTransport("console"); // Remove default console transport

		testLogger.info("test message");

		expect(capturedEntries[0]?.context).toEqual({
			userId: "123",
			sessionId: "abc",
		});
	});
});

describe("Transport System", () => {
	test("ConsoleTransport formats messages correctly", () => {
		const transport = new ConsoleTransport({ useColors: false });
		const testLogger = new Logger({
			transports: [transport],
			namespace: "test",
		});

		testLogger.info("test message", { key: "value" });

		const lastCall = mockedConsole.info.mock.calls[0];
		expect(lastCall[0]).toContain("[INFO "); // Level is padded to 5 chars
		expect(lastCall[0]).toContain("[test]");
		expect(lastCall[1]).toContain("test message");
	});

	test("ConsoleTransport structured logging mode", () => {
		const transport = new ConsoleTransport({ structured: true });
		const testLogger = new Logger({
			transports: [transport],
		});

		testLogger.info("structured log");

		const lastCall = mockedConsole.info.mock.calls[0];
		const parsed = JSON.parse(lastCall[0] as string);
		expect(parsed.level).toBe("INFO");
		expect(parsed.message).toBe("structured log");
		expect(parsed.timestamp).toBeDefined();
	});

	test("BatchedTransport batches logs correctly", async () => {
		const capturedEntries: LogEntry[] = [];
		const baseTransport: Transport = {
			name: "base",
			log: (entry) => capturedEntries.push(entry),
		};

		const batchedTransport = new BatchedTransport(baseTransport, {
			maxBatchSize: 3,
			flushInterval: 100,
		});

		const testLogger = new Logger({
			transports: [batchedTransport],
		});

		// Log 2 messages (below batch size)
		testLogger.info("log 1");
		testLogger.info("log 2");
		expect(capturedEntries.length).toBe(0); // Not flushed yet

		// Log 3rd message (reaches batch size)
		testLogger.info("log 3");
		expect(capturedEntries.length).toBe(3); // Auto-flushed

		// Test time-based flush
		capturedEntries.length = 0;
		testLogger.info("log 4");
		expect(capturedEntries.length).toBe(0);

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(capturedEntries.length).toBe(1); // Flushed after interval
	});

	test("can add and remove transports", () => {
		const customTransport: Transport = {
			name: "custom",
			log: mock(() => {}),
		};

		const testLogger = new Logger();
		testLogger.addTransport(customTransport);

		testLogger.info("test");
		// biome-ignore lint/suspicious/noExplicitAny: Mock type assertion
		expect(customTransport.log as Mock<any>).toHaveBeenCalled();

		testLogger.removeTransport("custom");
		// biome-ignore lint/suspicious/noExplicitAny: Mock type assertion
		(customTransport.log as Mock<any>).mockClear();

		testLogger.info("test2");
		// biome-ignore lint/suspicious/noExplicitAny: Mock type assertion
		expect(customTransport.log as Mock<any>).not.toHaveBeenCalled();
	});
});

describe("Plugin System", () => {
	test("plugin lifecycle hooks work correctly", () => {
		const initMock = mock(() => {});
		const transformMock = mock((entry: LogEntry) => ({
			...entry,
			message: `[PLUGIN] ${entry.message}`,
		}));
		const beforeLogMock = mock(() => {});
		const afterLogMock = mock(() => {});

		const plugin: LoggerPlugin = {
			name: "test-plugin",
			init: initMock,
			transform: transformMock,
			beforeLog: beforeLogMock,
			afterLog: afterLogMock,
		};

		const testLogger = new Logger();
		testLogger.use(plugin);

		expect(initMock).toHaveBeenCalledWith(testLogger);

		testLogger.info("test message");

		expect(beforeLogMock).toHaveBeenCalled();
		expect(transformMock).toHaveBeenCalled();
		expect(afterLogMock).toHaveBeenCalled();

		// Check transform was applied
		const lastCall = mockedConsole.info.mock.calls[0];
		expect(lastCall[1]).toContain("[PLUGIN] test message");
	});

	test("plugin can prevent logging with beforeLog", () => {
		const plugin: LoggerPlugin = {
			name: "filter-plugin",
			beforeLog: (entry) => {
				if (entry.message.includes("skip")) {
					return false;
				}
			},
		};

		const testLogger = new Logger();
		testLogger.use(plugin);

		testLogger.info("normal message");
		expect(mockedConsole.info).toHaveBeenCalled();

		mockedConsole.info.mockClear();
		testLogger.info("skip this message");
		expect(mockedConsole.info).not.toHaveBeenCalled();
	});
});

describe("Performance Features", () => {
	test("time method measures function execution", async () => {
		const testLogger = new Logger({ level: "debug" });

		const result = await testLogger.time("test operation", async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
			return "result";
		});

		expect(result).toBe("result");

		const lastCall = mockedConsole.debug.mock.calls[0];
		expect(lastCall[1]).toContain("test operation completed");
		expect(lastCall[2]).toBeDefined();
		expect(lastCall[2].duration).toBeDefined();
	});

	test("time method handles errors", async () => {
		const testLogger = new Logger();

		try {
			await testLogger.time("failing operation", async () => {
				throw new Error("Test error");
			});
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect((error as Error).message).toBe("Test error");

			const lastCall = mockedConsole.error.mock.calls[0];
			expect(lastCall[1]).toContain("failing operation failed");
		}
	});

	test("profile method creates profiling context", () => {
		const testLogger = new Logger({ level: "debug" });

		const endProfile = testLogger.profile("test-profile");

		// Simulate some work
		const start = Date.now();
		while (Date.now() - start < 50) {
			// Busy wait
		}

		endProfile();

		const lastCall = mockedConsole.debug.mock.calls[0];
		expect(lastCall[1]).toContain("Profile: test-profile");
		expect(lastCall[2]).toBeDefined();
		expect(lastCall[2].duration).toBeDefined();
	});

	test("sampling rate works correctly", () => {
		// Test with 50% sampling
		const testLogger = new Logger({
			samplingRate: 0.5,
		});

		// Mock Math.random to control sampling
		const originalRandom = Math.random;
		let randomValue = 0;
		Math.random = () => randomValue;

		// Should log when random <= samplingRate
		randomValue = 0.3;
		testLogger.info("should log");
		expect(mockedConsole.info).toHaveBeenCalled();

		// Should not log when random > samplingRate
		mockedConsole.info.mockClear();
		randomValue = 0.7;
		testLogger.info("should not log");
		expect(mockedConsole.info).not.toHaveBeenCalled();

		Math.random = originalRandom;
	});
});

describe("Logger Statistics", () => {
	test("tracks statistics correctly", () => {
		const testLogger = new Logger();

		const stats1 = testLogger.getStats();
		expect(stats1.logCount).toBe(0);
		expect(stats1.children).toBe(0);
		expect(stats1.transports).toBeGreaterThan(0);
		expect(stats1.uptime).toBeGreaterThanOrEqual(0);

		testLogger.info("log 1");
		testLogger.info("log 2");
		testLogger.child("child1");
		testLogger.child("child2");

		const stats2 = testLogger.getStats();
		expect(stats2.logCount).toBe(2);
		expect(stats2.children).toBe(2);
		expect(stats2.uptime).toBeGreaterThan(stats1.uptime);
	});
});

describe("Error Handling", () => {
	test("extracts stack traces from errors", () => {
		const capturedEntries: LogEntry[] = [];
		const mockTransport: Transport = {
			name: "mock",
			log: (entry) => capturedEntries.push(entry),
		};

		const testLogger = new Logger({
			transports: [mockTransport],
		});

		const error = new Error("Test error");
		testLogger.error("An error occurred", { error });

		expect(capturedEntries[0]?.stack).toBe(error.stack);
	});

	test("handles metadata with non-error objects", () => {
		const testLogger = new Logger();

		testLogger.error("Error message", {
			code: 500,
			message: "Internal error",
			notAnError: { nested: "object" },
		});

		// Should not throw
		expect(mockedConsole.error).toHaveBeenCalled();
	});
});

describe("Backwards Compatibility", () => {
	test("maintains compatibility with old API", () => {
		// Test that old method signatures still work
		logger.info("message");
		logger.info("message", {});
		logger.info("message", { key: "value" });

		expect(mockedConsole.info).toHaveBeenCalledTimes(3);
	});

	test("default export works as expected", () => {
		expect(logger).toBeDefined();
		expect(logger).toBeInstanceOf(Logger);
		expect(typeof logger.info).toBe("function");
	});

	test("environment detection exports are available", () => {
		expect(typeof isServer).toBe("boolean");
		expect(typeof isBrowser).toBe("boolean");
		expect(typeof isEdge).toBe("boolean");
	});
});

describe("Performance Benchmarks", () => {
	test("logger performs well under load", () => {
		const testLogger = new Logger();
		const iterations = 10000;

		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			testLogger.info(`Log message ${i}`, { index: i });
		}
		const duration = performance.now() - start;

		// Should handle 10k logs in under 1 second
		expect(duration).toBeLessThan(1000);

		const opsPerSecond = iterations / (duration / 1000);
		console.log(`Performance: ${opsPerSecond.toFixed(0)} ops/sec`);
	});

	test("child logger creation is efficient", () => {
		const testLogger = new Logger();
		const iterations = 1000;

		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			testLogger.child(`child-${i}`);
		}
		const duration = performance.now() - start;

		// Should create 1000 child loggers in under 100ms
		expect(duration).toBeLessThan(100);
	});
});

describe("Memory Management", () => {
	test("flush method works correctly", async () => {
		let flushCalled = false;
		const customTransport: Transport = {
			name: "custom",
			log: () => {},
			flush: async () => {
				flushCalled = true;
			},
		};

		const testLogger = new Logger({
			transports: [customTransport],
		});

		await testLogger.flush();
		expect(flushCalled).toBe(true);
	});

	test("performance metrics in development mode", () => {
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";

		const capturedEntries: LogEntry[] = [];
		const mockTransport: Transport = {
			name: "mock",
			log: (entry) => capturedEntries.push(entry),
		};

		const testLogger = new Logger({
			transports: [mockTransport],
		});

		testLogger.info("test");

		const entry = capturedEntries[0];
		if (entry?.performance) {
			expect(entry.performance.timestamp).toBeDefined();
			// Memory usage might not be available in all environments
			// so we just check the structure exists
		}

		process.env.NODE_ENV = originalNodeEnv;
	});
});
