export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export type LogEnvironment = "server" | "browser" | "edge";
export type NexlogConfig = {
	level: LogLevel;
	enabledEnvironments: LogEnvironment[];
};

interface LogObject {
	msg: string | undefined;
	[key: string]: string | number | boolean | object | undefined;
}

interface LoggerStrategy {
	log(level: LogLevel, o: LogObject): void;
}

const logLevelEmojis: Record<LogLevel, string> = {
	trace: "🔍",
	debug: "🐛",
	info: "ℹ️",
	warn: "⚠️",
	error: "❌",
	fatal: "💀",
};

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
		const emoji = logLevelEmojis[level];
		const formattedMessage = `${emoji} [${new Date().toISOString()}] [${level.toUpperCase()}] ${msg ?? "undefined"}`;
		const additionalInfo = Object.keys(rest).length ? JSON.stringify(rest) : "";

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
		const emoji = logLevelEmojis[level];
		const formattedMessage = `${emoji} [${new Date().toISOString()}] [${level.toUpperCase()}] ${msg ?? "undefined"}`;
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
		const emoji = logLevelEmojis[level];
		const formattedMessage = `${emoji} [${new Date().toISOString()}] [${level.toUpperCase()}] ${msg ?? "undefined"}`;
		const additionalInfo = Object.keys(rest).length ? JSON.stringify(rest) : "";

		console[level === "fatal" ? "error" : level](
			formattedMessage,
			additionalInfo,
		);
	}
}

const isServer =
	typeof window === "undefined" &&
	typeof process !== "undefined" &&
	process.env.NEXT_RUNTIME !== "edge";
const isBrowser = typeof window !== "undefined";
const isNextEdgeRuntime =
	typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge";

const loggerStrategies: Record<LogEnvironment, LoggerStrategy> = {
	server: new ServerLogger(),
	edge: new EdgeLogger(),
	browser: new BrowserLogger(),
};

let currentEnvironment: LogEnvironment = isServer
	? "server"
	: isNextEdgeRuntime
		? "edge"
		: "browser";

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

import { promises as fs } from "fs";

let join: (...args: string[]) => string;

const loadPathModule = async () => {
	if (isServer) {
		try {
			const pathModule = await import("path");
			join = pathModule.join;
		} catch (error) {
			console.error("❌ Error importing path module:", error);
		}
	}
};

const loadConfigFile = async (): Promise<Partial<NexlogConfig>> => {
	if (isBrowser || isNextEdgeRuntime) {
		console.info(
			"🌐 Skipping config file load in browser or edge environment.",
		);
		return {};
	}

	await loadPathModule();

	try {
		const configFiles = ["nexlog.config.js", "nexlog.config.ts"];
		for (const file of configFiles) {
			if (!join) {
				console.error("❌ Path module not available");
				return {};
			}
			const configPath = join(process.cwd(), file);
			try {
				const userConfig = require(configPath);
				console.info(`📄 Loaded config from ${file}:`, userConfig);
				return userConfig.default || userConfig;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
					console.error(`❌ Error loading nexlog config from ${file}:`, error);
				}
			}
		}
		console.warn("⚠️ No config file found, using default configuration.");
	} catch (error) {
		console.error("❌ Error loading configuration file:", error);
	}
	return {};
};

let config: NexlogConfig = { ...defaultConfig };

const setConfig = (newConfig: Partial<NexlogConfig>) => {
	if (newConfig.level && !(newConfig.level in logLevelPriority)) {
		throw new Error(`❌ Invalid log level: ${newConfig.level}`);
	}
	if (newConfig.enabledEnvironments) {
		for (const env of newConfig.enabledEnvironments) {
			if (!["server", "browser", "edge"].includes(env)) {
				throw new Error(`❌ Invalid environment: ${env}`);
			}
		}
	}
	config = { ...config, ...newConfig };
	console.info("✅ Applied config:", config);
};

const initConfig = async () => {
	const fileConfig = await loadConfigFile();
	if (Object.keys(fileConfig).length > 0) {
		setConfig(fileConfig);
	} else {
		console.info("⚙️ Using default configuration.");
	}
	return getConfig();
};

const getConfig = (): NexlogConfig => ({ ...config });

const resetConfig = () => {
	config = { ...defaultConfig };
	console.info("🔄 Configuration reset to default.");
};

const shouldLog = (level: LogLevel): boolean => {
	const currentEnvironment = getEnvironment();
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
	initConfig,
	loadConfigFile,
};

export default nexlog;
export {
	isServer,
	isNextEdgeRuntime,
	isBrowser,
	setEnvironment,
	resetConfig,
	initConfig,
	loadConfigFile,
	setConfig,
	getConfig,
};

const debugConfig = async () => {
	resetConfig();
	const fileConfig = await loadConfigFile();
	if (Object.keys(fileConfig).length > 0) {
		setConfig(fileConfig);
	}
	return getConfig();
};

export { debugConfig };
