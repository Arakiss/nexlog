import {
	expect,
	test,
	mock,
	beforeAll,
	beforeEach,
	afterAll,
	type Mock,
} from "bun:test";
import logger, {
	isServer,
	isNextEdgeRuntime,
	type LogLevel,
	type LogEnvironment,
	setEnvironment,
} from "./index";

// Mock console methods
const originalConsole = global.console;
let mockedConsole: { [key: string]: Mock<(...args: unknown[]) => void> } = {};

beforeAll(() => {
	mockedConsole = {
		trace: mock(() => {}),
		debug: mock(() => {}),
		info: mock(() => {}),
		warn: mock(() => {}),
		error: mock(() => {}),
		log: mock(() => {}),
	};
	global.console = Object.assign({}, global.console, mockedConsole);
});

beforeEach(() => {
	setEnvironment("server");
	logger.resetConfig();

	// Clear all mocks
	for (const mockedFn of Object.values(mockedConsole)) {
		mockedFn.mockClear();
	}
});

// Helper function to get the last call arguments of a mocked function
const getLastCallArgs = (mockedFn: Mock<(...args: unknown[]) => void>) => {
	const calls = mockedFn.mock.calls;
	return calls.length > 0 ? calls[calls.length - 1] : undefined;
};

// Test suite for logger functionality
test("Console mocking works", () => {
	console.info("Test mock");
	expect(console.info).toHaveBeenCalledWith("Test mock");
});

test("Logger functionality", () => {
	// Set the log level to the lowest possible to ensure all logs are captured
	logger.setConfig({ level: "trace" });

	const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

	for (const level of levels) {
		const logMethod = logger[level];
		logMethod("Test message", { additionalInfo: "test" });

		const consoleMethod =
			level === "fatal"
				? global.console.error
				: global.console[level as keyof Console];
		const mockedConsoleMethod = consoleMethod as unknown as Mock<
			(...args: (string | object)[]) => void
		>;

		// Add a debug log to see what's happening
		console.log(`Checking ${level}:`, mockedConsoleMethod.mock.calls);

		expect(mockedConsoleMethod).toHaveBeenCalled();
		const lastCall =
			mockedConsoleMethod.mock.calls[mockedConsoleMethod.mock.calls.length - 1];
		expect(lastCall[0]).toContain(`[${level.toUpperCase()}]`);
		expect(lastCall[0]).toContain("Test message");
		expect(lastCall[1]).toBe('{"additionalInfo":"test"}');

		mockedConsoleMethod.mockClear();
	}

	// Test log level filtering
	logger.setConfig({ level: "warn" });
	(global.console.info as Mock<(...args: unknown[]) => void>).mockClear();
	logger.info("This should not be logged");
	expect(global.console.info).not.toHaveBeenCalled();

	logger.warn("This should be logged");
	expect(global.console.warn).toHaveBeenCalled();

	// Test empty additional info
	logger.error("Error message");
	const errorLastCallArgs = getLastCallArgs(
		global.console.error as unknown as Mock<(...args: unknown[]) => void>,
	);
	expect(errorLastCallArgs).toBeDefined();
	if (errorLastCallArgs) {
		expect(errorLastCallArgs[0]).toContain("[ERROR] Error message");
		expect(errorLastCallArgs[1]).toBe("");
	}
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
	expect(() => logger.setConfig({ level: "invalid" as LogLevel })).toThrow();
	expect(() =>
		logger.setConfig({ enabledEnvironments: ["invalid" as LogEnvironment] }),
	).toThrow();

	logger.info(undefined as unknown as string);

	const infoMethod = global.console.info as Mock<(...args: unknown[]) => void>;
	expect(infoMethod).toHaveBeenCalled();

	const lastCallArgs = infoMethod.mock.calls[infoMethod.mock.calls.length - 1];
	expect(lastCallArgs[0]).toContain("[INFO]");
	expect(lastCallArgs[0]).toContain("undefined");
});

// Test config management
test("Config management", () => {
	const originalConfig = logger.getConfig();
	expect(originalConfig.level).toBe("info");
	expect(originalConfig.enabledEnvironments).toEqual([
		"server",
		"browser",
		"edge",
	]);

	logger.setConfig({ level: "debug" });
	expect(logger.getConfig().level).toBe("debug");

	logger.setConfig({ enabledEnvironments: ["server", "browser"] });
	expect(logger.getConfig().enabledEnvironments).toEqual(["server", "browser"]);

	logger.resetConfig();
	expect(logger.getConfig()).toEqual(originalConfig);
});

// Test enabled environments
test("Enabled environments", () => {
	logger.setConfig({ enabledEnvironments: ["server"] });
	logger.info("This may or may not be logged depending on the environment");
	// We can't test the actual output here as it depends on the environment,
	// but we can ensure it doesn't throw an error
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

// Prueba específica para cada nivel de log
test("Log levels", () => {
	const levels: LogLevel[] = [
		"trace",
		"debug",
		"info",
		"warn",
		"error",
		"fatal",
	];
	for (const level of levels) {
		logger.setConfig({ level });
		logger[level]("Test message");
		expect(
			global.console[level === "fatal" ? "error" : level],
		).toHaveBeenCalled();

		// Clear mock calls after each level
		for (const mock of Object.values(mockedConsole)) {
			mock.mockClear();
		}
	}
});

// Prueba más detallada de setEnvironment
test("Environment setting", () => {
	const environments: LogEnvironment[] = ["server", "browser", "edge"];
	for (const env of environments) {
		setEnvironment(env);
		logger.info("Test message");
		expect(global.console.info).toHaveBeenCalled();
		(global.console.info as Mock<(...args: unknown[]) => void>).mockClear();
	}
});

// Prueba de la interacción entre setConfig y los niveles de log
test("Config and log level interaction", () => {
	logger.setConfig({ level: "warn" });
	logger.debug("This should not be logged");
	expect(global.console.debug).not.toHaveBeenCalled();

	logger.warn("This should be logged");
	expect(global.console.warn).toHaveBeenCalled();

	logger.setConfig({ level: "trace" });
	logger.debug("This should now be logged");
	expect(global.console.debug).toHaveBeenCalled();
});

// Restore original console after all tests
afterAll(() => {
	global.console = originalConsole;
});
