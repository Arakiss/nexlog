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
	type NexlogConfig,
} from "./index";

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

	for (const mockedFn of Object.values(mockedConsole)) {
		mockedFn.mockClear();
	}
});

const getLastCallArgs = (mockedFn: Mock<(...args: unknown[]) => void>) => {
	const calls = mockedFn.mock.calls;
	return calls.length > 0 ? calls[calls.length - 1] : undefined;
};

test("Console mocking works", () => {
	console.info("Test mock");
	expect(console.info).toHaveBeenCalledWith("Test mock");
});

test("Logger functionality", () => {
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

		console.log(`Checking ${level}:`, mockedConsoleMethod.mock.calls);

		expect(mockedConsoleMethod).toHaveBeenCalled();
		const lastCall =
			mockedConsoleMethod.mock.calls[mockedConsoleMethod.mock.calls.length - 1];
		expect(lastCall[0]).toContain(`[${level.toUpperCase()}]`);
		expect(lastCall[0]).toContain("Test message");
		expect(lastCall[1]).toBe('{"additionalInfo":"test"}');

		mockedConsoleMethod.mockClear();
	}

	logger.setConfig({ level: "warn" });
	(global.console.info as Mock<(...args: unknown[]) => void>).mockClear();
	logger.info("This should not be logged");
	expect(global.console.info).not.toHaveBeenCalled();

	logger.warn("This should be logged");
	expect(global.console.warn).toHaveBeenCalled();

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

test("Environment detection", () => {
	expect(typeof isServer).toBe("boolean");
	expect(typeof isNextEdgeRuntime).toBe("boolean");
});

test("Logger strategy selection", () => {
	expect(() => logger.info("Test strategy selection")).not.toThrow();
});

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

test("Enabled environments", () => {
	logger.setConfig({ enabledEnvironments: ["server"] });
	logger.info("This may or may not be logged depending on the environment");
});

test("Logger performance", async () => {
	const start = performance.now();
	for (let i = 0; i < 1000; i++) {
		logger.info(`Performance test ${i}`);
	}
	const end = performance.now();
	console.log(`Logged 1000 messages in ${end - start} ms`);
	expect(end - start).toBeLessThan(1000);
});

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

		for (const mock of Object.values(mockedConsole)) {
			mock.mockClear();
		}
	}
});

test("Environment setting", () => {
	const environments: LogEnvironment[] = ["server", "browser", "edge"];
	for (const env of environments) {
		setEnvironment(env);
		logger.info("Test message");
		expect(global.console.info).toHaveBeenCalled();
		(global.console.info as Mock<(...args: unknown[]) => void>).mockClear();
	}
});

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

test("Emoji presence in log messages", () => {
	logger.setConfig({ level: "trace" });
	const levels: LogLevel[] = [
		"trace",
		"debug",
		"info",
		"warn",
		"error",
		"fatal",
	];
	const emojis = ["🔍", "🐛", "ℹ️", "⚠️", "❌", "💀"];

	levels.forEach((level, index) => {
		logger[level]("Test message");
		const consoleMethod =
			level === "fatal"
				? global.console.error
				: global.console[level as keyof Console];
		const mockedConsoleMethod = consoleMethod as unknown as Mock<
			(...args: (string | object)[]) => void
		>;

		expect(mockedConsoleMethod).toHaveBeenCalled();
		const lastCall =
			mockedConsoleMethod.mock.calls[mockedConsoleMethod.mock.calls.length - 1];
		expect(lastCall[0]).toContain(emojis[index]);

		mockedConsoleMethod.mockClear();
	});
});

test("Timestamp format in log messages", () => {
	logger.info("Test message");
	const infoMethod = global.console.info as Mock<(...args: unknown[]) => void>;
	expect(infoMethod).toHaveBeenCalled();
	const lastCallArgs = infoMethod.mock.calls[infoMethod.mock.calls.length - 1];
	expect(lastCallArgs[0]).toMatch(
		/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/,
	);
});

test("Meta object handling", () => {
	const meta = { key1: "value1", key2: 2 };
	logger.info("Test message", meta);
	const infoMethod = global.console.info as Mock<(...args: unknown[]) => void>;
	expect(infoMethod).toHaveBeenCalled();
	const lastCallArgs = infoMethod.mock.calls[infoMethod.mock.calls.length - 1];
	expect(lastCallArgs[1]).toBe(JSON.stringify(meta));
});

test("Environment-specific logger behavior", () => {
	setEnvironment("server");
	logger.info("Server log");
	const serverInfoMethod = global.console.info as Mock<
		(...args: unknown[]) => void
	>;
	expect(serverInfoMethod).toHaveBeenCalled();
	const serverLastCallArgs =
		serverInfoMethod.mock.calls[serverInfoMethod.mock.calls.length - 1];
	expect(serverLastCallArgs[0]).toContain("\x1b[32m");

	setEnvironment("browser");
	logger.info("Browser log");
	const browserInfoMethod = global.console.info as Mock<
		(...args: unknown[]) => void
	>;
	expect(browserInfoMethod).toHaveBeenCalled();
	const browserLastCallArgs =
		browserInfoMethod.mock.calls[browserInfoMethod.mock.calls.length - 1];
	expect(browserLastCallArgs[0]).not.toContain("\x1b[32m");

	setEnvironment("edge");
	logger.info("Edge log");
	const edgeInfoMethod = global.console.info as Mock<
		(...args: unknown[]) => void
	>;
	expect(edgeInfoMethod).toHaveBeenCalled();
	const edgeLastCallArgs =
		edgeInfoMethod.mock.calls[edgeInfoMethod.mock.calls.length - 1];
	expect(edgeLastCallArgs[0]).not.toContain("\x1b[32m");
});

test("Async config initialization", async () => {
	// Mock the entire module
	mock.module("./index", () => {
		const originalModule = require("./index");
		return {
			...originalModule,
			loadConfigFile: async () => ({ level: "debug" }),
			setConfig: originalModule.setConfig, // Ensure setConfig is available
			initConfig: async () => {
				const fileConfig = await originalModule.loadConfigFile();
				originalModule.setConfig(fileConfig);
				return originalModule.getConfig();
			},
		};
	});

	// Import the module after mocking
	const { initConfig, resetConfig, default: logger } = await import("./index");

	// Reset config to default
	resetConfig();

	// Log the config after reset
	console.log("Config after reset in test:", logger.getConfig());

	// Initialize config from the mocked loadConfigFile
	const updatedConfig = await initConfig();

	// Log the updated config to see what was applied
	console.log("Updated config after initConfig in test:", updatedConfig);

	// Check if the config was updated correctly
	expect(updatedConfig.level).toBe("debug");
	expect(logger.getConfig().level).toBe("debug");
});

afterAll(() => {
	global.console = originalConsole;
});
