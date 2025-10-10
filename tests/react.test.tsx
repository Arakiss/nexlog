/**
 * @jest-environment jsdom
 */

import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import logger, { Logger } from "../src/index";
import {
	LoggerDevTools,
	LoggerProvider,
	useChildLogger,
	useLogger,
	usePerformanceLogger,
	withLogger,
} from "../src/react/logger-provider";

// Mock console for testing
const originalConsole = {
	info: console.info,
	warn: console.warn,
	error: console.error,
	debug: console.debug,
};

// Save original Math.random to restore later
const originalRandom = Math.random;

const mockedConsole = {
	info: mock(() => {}),
	warn: mock(() => {}),
	error: mock(() => {}),
	debug: mock(() => {}),
};

beforeEach(() => {
	Object.assign(console, mockedConsole);
	for (const fn of Object.values(mockedConsole)) {
		fn.mockClear();
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
	// Override sampling rate to 1.0 to ensure all logs pass sampling check
	// biome-ignore lint/suspicious/noExplicitAny: Accessing private property for testing
	(logger as any).config.samplingRate = 1.0;
	// Clear include/exclude patterns to ensure all messages are logged
	// biome-ignore lint/suspicious/noExplicitAny: Accessing private property for testing
	(logger as any).config.includePatterns = undefined;
	// biome-ignore lint/suspicious/noExplicitAny: Accessing private property for testing
	(logger as any).config.excludePatterns = undefined;
});

// Test component that uses the logger
const TestComponent: React.FC<{ message?: string }> = ({
	message = "test",
}) => {
	const { logger } = useLogger();
	logger.info(message);
	return <div>Test Component</div>;
};

// Test component with child logger
const ChildLoggerComponent: React.FC = () => {
	const childLogger = useChildLogger("child");
	childLogger.info("from child");
	return <div>Child Logger Component</div>;
};

// Test component with performance logger
const _PerformanceComponent: React.FC = () => {
	const { start, end } = usePerformanceLogger("test-perf");

	React.useEffect(() => {
		start();
		setTimeout(() => end(), 10);
	}, [start, end]);

	return <div>Performance Component</div>;
};

// Test component with HOC
interface WithLoggerProps {
	logger?: Logger;
}

const ComponentWithHoc: React.FC<WithLoggerProps> = ({ logger }) => {
	logger?.info("from HOC");
	return <div>HOC Component</div>;
};

const WrappedComponent = withLogger(ComponentWithHoc, "hoc-namespace");

describe("LoggerProvider", () => {
	test("provides logger context to children", () => {
		const element = (
			<LoggerProvider>
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);
		expect(mockedConsole.info).toHaveBeenCalled();
	});

	test("throws error when useLogger is used outside provider", () => {
		const ComponentOutsideProvider = () => {
			try {
				// biome-ignore lint/correctness/useHookAtTopLevel: Testing error case
				useLogger();
				return <div>Should not render</div>;
			} catch (error) {
				return <div>Error: {(error as Error).message}</div>;
			}
		};

		const html = renderToString(<ComponentOutsideProvider />);
		expect(html).toContain("useLogger must be used within a LoggerProvider");
	});

	test("respects initialLevel prop", () => {
		const element = (
			<LoggerProvider initialLevel="error">
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);
		// Info level should not log when level is set to error
		expect(mockedConsole.info).not.toHaveBeenCalled();
	});

	test("respects disabled prop", () => {
		const element = (
			<LoggerProvider disabled={true}>
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);
		expect(mockedConsole.info).not.toHaveBeenCalled();
	});

	test("respects ssrOnly prop in server environment", () => {
		const element = (
			<LoggerProvider ssrOnly={true}>
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);
		// Should log in server environment
		expect(mockedConsole.info).toHaveBeenCalled();
	});

	test("accepts custom logger instance", () => {
		const customLogger = new Logger({ level: "debug" });
		const customLogSpy = mock(() => {});
		customLogger.info = customLogSpy;

		const element = (
			<LoggerProvider customLogger={customLogger}>
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);
		expect(customLogSpy).toHaveBeenCalled();
	});

	test("accepts logger configuration", () => {
		const config = {
			level: "warn" as const,
			namespace: "app",
			context: { version: "1.0.0" },
		};

		const element = (
			<LoggerProvider config={config}>
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);
		// Info should not log when level is warn
		expect(mockedConsole.info).not.toHaveBeenCalled();
	});

	test.skip("logs lifecycle events when enabled", () => {
		// TODO: Implement lifecycle logging feature
		// The logLifecycle prop is defined but not yet implemented
		const element = (
			<LoggerProvider logLifecycle={true}>
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);

		// Should log app started once implemented
		const calls = mockedConsole.info.mock.calls;
		const hasLifecycleLog = calls.some(
			(call) =>
				// Check both call[0] and call[1] as the format might vary
				(typeof call[0] === "string" && call[0].includes("App started")) ||
				(typeof call[1] === "string" && call[1].includes("App started")),
		);
		expect(hasLifecycleLog).toBe(true);
	});

	test.skip("doesn't log lifecycle events when disabled", () => {
		// TODO: Implement lifecycle logging feature
		const element = (
			<LoggerProvider logLifecycle={false}>
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);

		const calls = mockedConsole.info.mock.calls;
		const hasLifecycleLog = calls.some(
			(call) =>
				(typeof call[0] === "string" && call[0].includes("App started")) ||
				(typeof call[1] === "string" && call[1].includes("App started")),
		);
		expect(hasLifecycleLog).toBe(false);
	});

	test("creates namespaced logger", () => {
		const element = (
			<LoggerProvider namespace="test-namespace">
				<TestComponent />
			</LoggerProvider>
		);

		renderToString(element);

		const calls = mockedConsole.info.mock.calls;
		const hasNamespace = calls.some((call) =>
			call[0]?.includes("[test-namespace]"),
		);
		expect(hasNamespace).toBe(true);
	});
});

describe("useChildLogger", () => {
	test("creates child logger with namespace", () => {
		const element = (
			<LoggerProvider>
				<ChildLoggerComponent />
			</LoggerProvider>
		);

		renderToString(element);

		const calls = mockedConsole.info.mock.calls;
		const hasChildNamespace = calls.some((call) =>
			call[0]?.includes("[child]"),
		);
		expect(hasChildNamespace).toBe(true);
	});

	test("child logger inherits parent config", () => {
		const element = (
			<LoggerProvider initialLevel="error">
				<ChildLoggerComponent />
			</LoggerProvider>
		);

		renderToString(element);
		// Child logger should respect parent's error level
		expect(mockedConsole.info).not.toHaveBeenCalled();
	});
});

describe("usePerformanceLogger", () => {
	test("creates performance logging functions", () => {
		const TestPerf = () => {
			const { start, end } = usePerformanceLogger("operation");

			// Just verify the hooks return functions
			expect(typeof start).toBe("function");
			expect(typeof end).toBe("function");

			return <div>Perf Test</div>;
		};

		const element = (
			<LoggerProvider>
				<TestPerf />
			</LoggerProvider>
		);

		renderToString(element);
	});
});

describe("withLogger HOC", () => {
	test("injects logger prop into component", () => {
		const element = (
			<LoggerProvider>
				<WrappedComponent />
			</LoggerProvider>
		);

		renderToString(element);

		const calls = mockedConsole.info.mock.calls;
		const hasHocLog = calls.some((call) => call[1]?.includes("from HOC"));
		expect(hasHocLog).toBe(true);
	});

	test("creates namespaced logger when namespace provided", () => {
		const element = (
			<LoggerProvider>
				<WrappedComponent />
			</LoggerProvider>
		);

		renderToString(element);

		const calls = mockedConsole.info.mock.calls;
		const hasNamespace = calls.some((call) =>
			call[0]?.includes("[hoc-namespace]"),
		);
		expect(hasNamespace).toBe(true);
	});

	test("preserves component display name", () => {
		expect(WrappedComponent.displayName).toBe("withLogger(ComponentWithHoc)");
	});
});

describe("LoggerDevTools", () => {
	test("doesn't render in production", () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		const element = (
			<LoggerProvider>
				<LoggerDevTools />
			</LoggerProvider>
		);

		const html = renderToString(element);
		expect(html).toBe(""); // Should render nothing

		process.env.NODE_ENV = originalEnv;
	});

	test("renders in development", () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";

		const element = (
			<LoggerProvider>
				<LoggerDevTools />
			</LoggerProvider>
		);

		const html = renderToString(element);
		expect(html).toContain("nexlog"); // Should contain nexlog text

		process.env.NODE_ENV = originalEnv;
	});

	test("accepts position prop", () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";

		const positions = [
			"top-left",
			"top-right",
			"bottom-left",
			"bottom-right",
		] as const;

		for (const position of positions) {
			const element = (
				<LoggerProvider>
					<LoggerDevTools position={position} />
				</LoggerProvider>
			);

			const html = renderToString(element);
			// Check that the correct position class is applied
			if (position === "top-left") {
				expect(html).toContain("top-4 left-4");
			} else if (position === "top-right") {
				expect(html).toContain("top-4 right-4");
			} else if (position === "bottom-left") {
				expect(html).toContain("bottom-4 left-4");
			} else if (position === "bottom-right") {
				expect(html).toContain("bottom-4 right-4");
			}
		}

		process.env.NODE_ENV = originalEnv;
	});
});

describe("LoggerProvider Context Value", () => {
	test("provides all expected context methods", () => {
		const ContextTest = () => {
			const context = useLogger();

			// Verify all context properties exist
			expect(context.logger).toBeDefined();
			expect(context.level).toBeDefined();
			expect(context.enabled).toBeDefined();
			expect(typeof context.setLevel).toBe("function");
			expect(typeof context.enable).toBe("function");
			expect(typeof context.disable).toBe("function");
			expect(typeof context.addTransport).toBe("function");
			expect(typeof context.removeTransport).toBe("function");
			expect(typeof context.createChild).toBe("function");
			expect(context.stats).toBeDefined();
			expect(context.stats.logCount).toBeDefined();
			expect(context.stats.uptime).toBeDefined();
			expect(context.stats.children).toBeDefined();
			expect(context.stats.transports).toBeDefined();

			return <div>Context Test</div>;
		};

		const element = (
			<LoggerProvider>
				<ContextTest />
			</LoggerProvider>
		);

		renderToString(element);
	});
});

describe("Backwards Compatibility", () => {
	test("exports default as useLogger for backwards compatibility", async () => {
		const module = await import("../src/react/logger-provider");
		expect(module.default).toBe(module.useLogger);
	});
});

// Restore console and Math.random after all tests
afterAll(() => {
	Object.assign(console, originalConsole);
	Math.random = originalRandom;
});
