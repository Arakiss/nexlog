import {
	expect,
	test,
	mock,
	beforeAll,
	afterEach,
	afterAll,
	type Mock,
} from "bun:test";
import logger, { isServer, isNextEdgeRuntime, type LogLevel } from "./index";

// Mock console methods
const originalConsole = global.console;
beforeAll(() => {
	global.console = Object.assign({}, global.console, {
		trace: mock(() => {}),
		debug: mock(() => {}),
		info: mock(() => {}),
		warn: mock(() => {}),
		error: mock(() => {}),
		log: mock(() => {}),
	});
});

afterEach(() => {
	// Restore all mocks after each test
	mock.restore();
});

// Helper function to get the last call arguments of a mocked function
const getLastCallArgs = (mockedFn: Mock<(...args: unknown[]) => void>) =>
	mockedFn.mock.calls[mockedFn.mock.calls.length - 1];

// Test suite for logger functionality
test("Logger functionality", () => {
	// Test all log levels
	const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
	for (const level of levels) {
		const logMethod = logger[level];
		logMethod("Test message", { additionalInfo: "test" });

		const consoleMethod =
			level === "fatal" ? console.error : console[level as keyof Console];
		const mockedConsoleMethod = consoleMethod as unknown as Mock<
			(...args: unknown[]) => void
		>;

		const lastCallArgs = getLastCallArgs(mockedConsoleMethod);
		expect(lastCallArgs[0]).toContain(`[${level.toUpperCase()}] Test message`);
		expect(lastCallArgs[1]).toBe('{"additionalInfo":"test"}');
	}

	// Test log level filtering
	logger.setLogLevel("warn");
	(console.info as Mock<(...args: unknown[]) => void>).mockClear();
	logger.info("This should not be logged");
	expect(console.info).not.toHaveBeenCalled();

	logger.warn("This should be logged");
	expect(console.warn).toHaveBeenCalled();

	// Test empty additional info
	logger.error("Error message");
	const errorLastCallArgs = getLastCallArgs(
		console.error as unknown as Mock<(...args: unknown[]) => void>,
	);
	expect(errorLastCallArgs[0]).toContain("[ERROR] Error message");
	expect(errorLastCallArgs[1]).toBe("");
});

// Test environment detection
test("Environment detection", () => {
	// Since we can't easily mock global objects, we'll just ensure the functions exist
	expect(typeof isServer).toBe("boolean");
	expect(typeof isNextEdgeRuntime).toBe("boolean");
});

// Test logger strategy selection
test("Logger strategy selection", () => {
	// This test is environment-dependent, so we'll just ensure no errors are thrown
	expect(() => logger.info("Test strategy selection")).not.toThrow();
});

// Test error handling
test("Error handling", () => {
	// Test with invalid log level (should default to lowest level)
	logger.setLogLevel("invalid" as unknown as LogLevel);
	logger.trace("This should still be logged");
	expect(console.trace).toHaveBeenCalled();

	// Reset log level to default
	logger.setLogLevel("info");

	// Test with undefined message
	logger.info(undefined as unknown as string);

	// Verificar que se haya llamado a algún método de consola
	const consoleMethods = ["log", "info", "warn", "error", "debug", "trace"];
	const anyConsoleMethodCalled = consoleMethods.some(
		(method) =>
			(console[method as keyof Console] as Mock<(...args: unknown[]) => void>)
				.mock.calls.length > 0,
	);
	expect(anyConsoleMethodCalled).toBe(true);

	// Encontrar el método de consola que fue llamado
	const calledMethod = consoleMethods.find(
		(method) =>
			(console[method as keyof Console] as Mock<(...args: unknown[]) => void>)
				.mock.calls.length > 0,
	);

	if (calledMethod) {
		const lastCallArgs = getLastCallArgs(
			console[calledMethod as keyof Console] as Mock<
				(...args: unknown[]) => void
			>,
		);
		expect(lastCallArgs).toBeTruthy();
		if (lastCallArgs) {
			const [undefinedMessage] = lastCallArgs;
			expect(undefinedMessage).toMatch(/\[(INFO|WARN)\]/);
			expect(undefinedMessage).toContain("undefined");
		}
	} else {
		expect(false).toBe(true); // Forzar un fallo si no se llamó a ningún método de consola
	}
});

// Test performance (basic)
test("Logger performance", async () => {
	const start = performance.now();
	for (let i = 0; i < 1000; i++) {
		logger.info(`Performance test ${i}`);
	}
	const end = performance.now();
	console.log(`Logged 1000 messages in ${end - start} ms`);
	// This is not a strict test, but it helps to identify significant performance regressions
	expect(end - start).toBeLessThan(1000); // Assuming it should take less than 1 second for 1000 logs
});

// Restore original console after all tests
afterAll(() => {
	global.console = originalConsole;
});
