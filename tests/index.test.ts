import {
	expect,
	test,
	mock,
	beforeAll,
	beforeEach,
	afterAll,
	type Mock,
	describe,
} from "bun:test";
import logger, {
	isServer,
	isNextEdgeRuntime,
	ConfigurableLogger,
	loggerStrategies,
	type LogLevel,
} from "../src/index";

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
	for (const mockedFn of Object.values(mockedConsole)) {
		mockedFn.mockClear();
	}
	logger.setLevel("trace");
	logger.enable();
	logger.setSSROnly(false);
});

describe("Logger Functionality", () => {
	test("All log levels work", () => {
		const levels: LogLevel[] = [
			"trace",
			"debug",
			"info",
			"warn",
			"error",
			"fatal",
		];

		for (const level of levels) {
			logger[level]("Test message", { additionalInfo: "test" });
			const consoleMethod =
				level === "fatal" ? mockedConsole.error : mockedConsole[level];
			expect(consoleMethod).toHaveBeenCalled();
			const lastCall =
				consoleMethod.mock.calls[consoleMethod.mock.calls.length - 1];
			expect(lastCall[0]).toContain(`[${level.toUpperCase()}]`);
			expect(lastCall[0]).toContain("Test message");
			expect(lastCall[1]).toBe('{"additionalInfo":"test"}');
		}
	});

	test("Log level filtering works", () => {
		logger.setLevel("warn");
		logger.info("This should not be logged");
		expect(mockedConsole.info).not.toHaveBeenCalled();
		logger.warn("This should be logged");
		expect(mockedConsole.warn).toHaveBeenCalled();
	});
});

test("Environment detection", () => {
	expect(typeof isServer).toBe("boolean");
	expect(typeof isNextEdgeRuntime).toBe("boolean");
});

describe("Logger Configuration", () => {
	test("Log level management", () => {
		expect(logger.getLevel()).toBe("trace");
		logger.setLevel("warn");
		expect(logger.getLevel()).toBe("warn");
	});

	test("Logger enable/disable", () => {
		logger.enable();
		expect(logger.isEnabled()).toBe(true);
		logger.info("This should be logged");
		expect(mockedConsole.info).toHaveBeenCalled();

		logger.disable();
		expect(logger.isEnabled()).toBe(false);
		logger.info("This should not be logged");
		expect(mockedConsole.info).toHaveBeenCalledTimes(1); // Still 1 from previous call
	});

	test("SSR-only logging", () => {
		const originalWindow = global.window;
		delete (global as Partial<typeof globalThis>).window; // Simulate server environment

		logger.setSSROnly(true);
		logger.info("SSR-only log");
		expect(mockedConsole.info).toHaveBeenCalled();

		(global as typeof globalThis).window = {} as Window & typeof globalThis; // Simulate browser environment
		mockedConsole.info.mockClear();
		logger.info("This should not be logged in browser");
		expect(mockedConsole.info).not.toHaveBeenCalled();

		(global as typeof globalThis).window = originalWindow;
	});
});

test("Logger performance", () => {
	const start = performance.now();
	for (let i = 0; i < 1000; i++) {
		logger.info(`Performance test ${i}`);
	}
	const end = performance.now();
	expect(end - start).toBeLessThan(1000);
});

describe("Logger Strategies", () => {
	test("ServerLogger uses colors", () => {
		const originalWindow = global.window;
		delete (global as Partial<typeof globalThis>).window; // Simulate server environment

		const serverLogger = new ConfigurableLogger(
			loggerStrategies.server,
			"trace",
			true,
			false,
		);

		serverLogger.info("Colored log");
		const lastCall =
			mockedConsole.info.mock.calls[mockedConsole.info.mock.calls.length - 1];
		expect(lastCall[0]).toMatch(/\x1b\[32m/); // Check for green color code

		(global as typeof globalThis).window = originalWindow;
	});

	test("BrowserLogger doesn't use colors", () => {
		const originalWindow = global.window;
		(global as typeof globalThis).window = {} as Window & typeof globalThis;

		const browserLogger = new ConfigurableLogger(
			loggerStrategies.browser,
			"trace",
			true,
			false,
		);

		browserLogger.info("Non-colored log");
		const lastCall =
			mockedConsole.info.mock.calls[mockedConsole.info.mock.calls.length - 1];
		expect(lastCall[0]).not.toMatch(/\x1b\[32m/);

		(global as typeof globalThis).window = originalWindow;
	});
});

afterAll(() => {
	global.console = originalConsole;
});
