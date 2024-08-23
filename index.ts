import fs from "node:fs";
import path from "node:path";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export type LogEnvironment = "server" | "browser" | "edge";

interface LogObject {
	msg: string | undefined;
	[key: string]: string | number | boolean | object | undefined;
}

interface LoggerStrategy {
	log(level: LogLevel, o: LogObject): void;
}

interface NexlogConfig {
	level: LogLevel;
	enabledEnvironments: LogEnvironment[];
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
		const formattedMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg ?? "undefined"}`;
		const additionalInfo = Object.keys(rest).length ? JSON.stringify(rest) : "";

		// Use the global console object
		(
			global.console[level === "fatal" ? "error" : level] as (
				...args: (string | object)[]
			) => void
		)(`${color}${formattedMessage}${this.resetColor}`, additionalInfo);
	}
}

class BrowserLogger implements LoggerStrategy {
	log(level: LogLevel, o: LogObject): void {
		const { msg, ...rest } = o;
		const formattedMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg ?? "undefined"}`;
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
		const formattedMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg ?? "undefined"}`;
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
const loggerStrategies: Record<LogEnvironment, LoggerStrategy> = {
	server: new ServerLogger(),
	edge: new EdgeLogger(),
	browser: new BrowserLogger(),
};

let currentEnvironment: LogEnvironment = "server"; // Valor por defecto

const getEnvironment = (): LogEnvironment => {
	return currentEnvironment;
};

const setEnvironment = (env: LogEnvironment) => {
	currentEnvironment = env;
};

const logLevelPriority: Record<LogLevel, number> = {
	trace: 0,
	debug: 1,
	info: 2,
	warn: 3,
	error: 4,
	fatal: 5,
};

const defaultConfig: NexlogConfig = {
	level: "info",
	enabledEnvironments: ["server", "browser", "edge"],
};

const loadConfigFile = (): Partial<NexlogConfig> => {
	const configFiles = ["nexlog.config.js", "nexlog.config.ts"];
	for (const file of configFiles) {
		const configPath = path.join(process.cwd(), file);
		if (fs.existsSync(configPath)) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const userConfig = require(configPath);
				return userConfig.default || userConfig;
			} catch (error) {
				console.error(`Error loading nexlog config from ${file}:`, error);
			}
		}
	}
	return {};
};

let config: NexlogConfig = { ...defaultConfig, ...loadConfigFile() };

const setConfig = (newConfig: Partial<NexlogConfig>) => {
	if (newConfig.level && !(newConfig.level in logLevelPriority)) {
		throw new Error(`Invalid log level: ${newConfig.level}`);
	}
	if (newConfig.enabledEnvironments) {
		for (const env of newConfig.enabledEnvironments) {
			if (!["server", "browser", "edge"].includes(env)) {
				throw new Error(`Invalid environment: ${env}`);
			}
		}
	}
	config = { ...config, ...newConfig };
};

const getConfig = (): NexlogConfig => ({ ...config });

const resetConfig = () => {
	config = { ...defaultConfig };
};

const shouldLog = (level: LogLevel): boolean => {
	const currentEnvironment = getEnvironment();
	console.log(
		`Checking log: level=${level}, config.level=${config.level}, environment=${currentEnvironment}`,
	);
	return (
		logLevelPriority[level] >= logLevelPriority[config.level] &&
		config.enabledEnvironments.includes(currentEnvironment)
	);
};

const log = (level: LogLevel, msg: string | undefined, meta: object = {}) => {
	if (shouldLog(level)) {
		loggerStrategies[getEnvironment()].log(level, {
			msg: msg ?? "undefined",
			...meta,
		});
	}
};

const nexlog = {
	trace: (msg: string | undefined, meta: object = {}) =>
		log("trace", msg, meta),
	debug: (msg: string | undefined, meta: object = {}) =>
		log("debug", msg, meta),
	info: (msg: string | undefined, meta: object = {}) => log("info", msg, meta),
	warn: (msg: string | undefined, meta: object = {}) => log("warn", msg, meta),
	error: (msg: string | undefined, meta: object = {}) =>
		log("error", msg, meta),
	fatal: (msg: string | undefined, meta: object = {}) =>
		log("fatal", msg, meta),
	setConfig,
	getConfig,
	resetConfig,
};

export default nexlog;
export { isServer, isNextEdgeRuntime, setEnvironment };
