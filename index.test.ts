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
		const mockedConsoleMethod = consoleMethod as Mock<
			(...args: unknown[]) => void
		>;

		expect(mockedConsoleMethod).toHaveBeenCalled();
		const lastCall = getLastCallArgs(mockedConsoleMethod);
		expect(lastCall).toBeDefined();
		if (lastCall) {
			expect(lastCall[0]).toContain(`[${level.toUpperCase()}]`);
			expect(lastCall[0]).toContain("Test message");
			expect(lastCall[1]).toBe('{"additionalInfo":"test"}');
		}

		mockedConsoleMethod.mockClear();
	}

	logger.setConfig({ level: "warn" }); // Ensure the level is set to "warn"
	console.log("Logger config after setting to warn:", logger.getConfig()); // Debugging line

	(global.console.info as Mock<(...args: unknown[]) => void>).mockClear();

	logger.info("This should not be logged");
	console.log(
		"Info log should not be called, calls length:",
		(global.console.info as Mock<(...args: unknown[]) => void>).mock.calls
			.length,
	); // Debugging line
	expect(
		(global.console.info as Mock<(...args: unknown[]) => void>).mock.calls
			.length,
	).toBe(0);

	logger.warn("This should be logged");
	expect(global.console.warn).toHaveBeenCalled();

	logger.error("Error message");
	const errorLastCallArgs = getLastCallArgs(
		global.console.error as Mock<(...args: unknown[]) => void>,
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

	const lastCallArgs = getLastCallArgs(infoMethod);
	expect(lastCallArgs).toBeDefined();
	expect(lastCallArgs?.[0]).toContain("[INFO]");
	expect(lastCallArgs?.[0]).toContain("undefined");
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
		const mockedConsoleMethod = consoleMethod as Mock<
			(...args: unknown[]) => void
		>;

		expect(mockedConsoleMethod).toHaveBeenCalled();
		const lastCall = getLastCallArgs(mockedConsoleMethod);
		expect(lastCall?.[0]).toContain(emojis[index]);

		mockedConsoleMethod.mockClear();
	});
});

test("Timestamp format in log messages", () => {
	logger.info("Test message");
	const infoMethod = global.console.info as Mock<(...args: unknown[]) => void>;
	expect(infoMethod).toHaveBeenCalled();
	const lastCallArgs = getLastCallArgs(infoMethod);
	expect(lastCallArgs?.[0] ?? "").toMatch(
		/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/,
	);
});

test("Meta object handling", () => {
	const meta = { key1: "value1", key2: 2 };
	logger.info("Test message", meta);
	const infoMethod = global.console.info as Mock<(...args: unknown[]) => void>;
	expect(infoMethod).toHaveBeenCalled();
	const lastCallArgs = getLastCallArgs(infoMethod);
	expect(lastCallArgs?.[1]).toBe(JSON.stringify(meta));
});

test("Environment-specific logger behavior", () => {
	setEnvironment("server");
	logger.info("Server log");
	const serverInfoMethod = global.console.info as Mock<
		(...args: unknown[]) => void
	>;
	expect(serverInfoMethod).toHaveBeenCalled();
	const serverLastCallArgs = getLastCallArgs(serverInfoMethod);
	expect(serverLastCallArgs).toBeDefined();
	if (serverLastCallArgs) {
		expect(serverLastCallArgs[0]).toContain("\x1b[32m");
	}

	setEnvironment("browser");
	logger.info("Browser log");
	const browserInfoMethod = global.console.info as Mock<
		(...args: unknown[]) => void
	>;
	expect(browserInfoMethod).toHaveBeenCalled();
	const browserLastCallArgs = getLastCallArgs(browserInfoMethod);
	expect(browserLastCallArgs?.[0]).not.toContain("\x1b[32m");

	setEnvironment("edge");
	logger.info("Edge log");
	const edgeInfoMethod = global.console.info as Mock<
		(...args: unknown[]) => void
	>;
	expect(edgeInfoMethod).toHaveBeenCalled();
	const edgeLastCallArgs = getLastCallArgs(edgeInfoMethod);
	expect(edgeLastCallArgs?.[0]).not.toContain("\x1b[32m");
});

test("Async config initialization", async () => {
	mock.module("./index", () => {
		const originalModule = require("./index");
		return {
			...originalModule,
			loadConfigFile: async () => ({ level: "debug" }),
			setConfig: originalModule.setConfig,
			initConfig: async () => {
				const fileConfig = await originalModule.loadConfigFile();
				originalModule.setConfig(fileConfig);
				return originalModule.getConfig();
			},
		};
	});

	const { initConfig, resetConfig, default: logger } = await import("./index");

	resetConfig();

	const updatedConfig = await initConfig();

	expect(updatedConfig.level).toBe("debug");
	expect(logger.getConfig().level).toBe("debug");
});

afterAll(() => {
	global.console = originalConsole;
});
