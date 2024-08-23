export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

interface LogObject {
	msg: string;
	[key: string]: string | number | boolean | object;
}

interface LoggerStrategy {
	log(level: LogLevel, o: LogObject): void;
}

class ServerLogger implements LoggerStrategy {
	private levelColors: Record<LogLevel, string> = {
		trace: "\x1b[90m", // gray
		debug: "\x1b[36m", // cyan
		info: "\x1b[32m", // green
		warn: "\x1b[33m", // yellow
		error: "\x1b[31m", // red
		fatal: "\x1b[31m", // red
	};

	private resetColor = "\x1b[0m";

	log(level: LogLevel, o: LogObject): void {
		const { msg, ...rest } = o;
		const color = this.levelColors[level];
		const formattedMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
		const additionalInfo = Object.keys(rest).length ? JSON.stringify(rest) : "";

		console[level === "fatal" ? "error" : level](
			`${color}${formattedMessage}${this.resetColor}`,
			additionalInfo,
		);
	}
}

class BrowserLogger implements LoggerStrategy {
	log(level: LogLevel, o: LogObject): void {
		const { msg, ...rest } = o;
		const formattedMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
		const additionalInfo = Object.keys(rest).length ? JSON.stringify(rest) : "";

		console[level === "fatal" ? "error" : level](
			formattedMessage,
			additionalInfo,
		);
	}
}

class EdgeLogger implements LoggerStrategy {
	log(level: LogLevel, o: LogObject): void {
		const { msg, ...rest } = o;
		const formattedMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
		const additionalInfo = Object.keys(rest).length ? JSON.stringify(rest) : "";

		console[level === "fatal" ? "error" : level](
			formattedMessage,
			additionalInfo,
		);
	}
}

// Helper functions to determine the environment
const isServer = typeof window === "undefined";
const isNextEdgeRuntime =
	typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge";

// Map of strategies based on environment
const loggerStrategies: Record<string, LoggerStrategy> = {
	server: new ServerLogger(),
	edge: new EdgeLogger(),
	browser: new BrowserLogger(),
};

const getEnvironment = (): string => {
	if (isServer) return "server";
	if (isNextEdgeRuntime) return "edge";
	return "browser";
};

const logger = loggerStrategies[getEnvironment()];

const logLevelPriority: Record<LogLevel, number> = {
	trace: 0,
	debug: 1,
	info: 2,
	warn: 3,
	error: 4,
	fatal: 5,
};

let currentLogLevel: LogLevel = "trace";

const setLogLevel = (level: LogLevel) => {
	currentLogLevel = level;
};

const shouldLog = (level: LogLevel): boolean => {
	return logLevelPriority[level] >= logLevelPriority[currentLogLevel];
};

export default {
	trace: (msg: string, meta: object = {}) =>
		shouldLog("trace") && logger.log("trace", { msg, ...meta }),
	debug: (msg: string, meta: object = {}) =>
		shouldLog("debug") && logger.log("debug", { msg, ...meta }),
	info: (msg: string, meta: object = {}) =>
		shouldLog("info") && logger.log("info", { msg, ...meta }),
	warn: (msg: string, meta: object = {}) =>
		shouldLog("warn") && logger.log("warn", { msg, ...meta }),
	error: (msg: string, meta: object = {}) =>
		shouldLog("error") && logger.log("error", { msg, ...meta }),
	fatal: (msg: string, meta: object = {}) =>
		shouldLog("fatal") && logger.log("fatal", { msg, ...meta }),
	setLogLevel,
};

export { isServer, isNextEdgeRuntime };
