type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

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
		const formattedMessage = `[${level.toUpperCase()}] ${msg}`;
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
		const formattedMessage = `[${level.toUpperCase()}] ${msg}`;
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
		const formattedMessage = `[${level.toUpperCase()}] ${msg}`;
		const additionalInfo = Object.keys(rest).length ? JSON.stringify(rest) : "";

		console[level === "fatal" ? "error" : level](
			formattedMessage,
			additionalInfo,
		);
	}
}

const isServer = typeof window === "undefined";
const isNextEdgeRuntime =
	typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge";

const loggerStrategies: Record<string, LoggerStrategy> = {
	server: new ServerLogger(),
	edge: new EdgeLogger(),
	browser: new BrowserLogger(),
};

const getEnvironment = (): string => {
	if (typeof window === "undefined") return "server";
	if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge")
		return "edge";
	return "browser";
};

const logLevels: Record<LogLevel, number> = {
	trace: 0,
	debug: 1,
	info: 2,
	warn: 3,
	error: 4,
	fatal: 5,
};

class ConfigurableLogger {
	private strategy: LoggerStrategy;
	private currentLevel: LogLevel;
	private enabled: boolean;
	private ssrOnly = false;
	private disabled = false;

	constructor(
		strategy: LoggerStrategy,
		initialLevel: LogLevel = "info",
		initiallyEnabled = true,
		ssrOnly = false,
	) {
		this.strategy = strategy;
		this.currentLevel = initialLevel;
		this.enabled = initiallyEnabled;
		this.ssrOnly = ssrOnly;
		this.disabled = !initiallyEnabled;
	}

	setLevel(level: LogLevel) {
		this.currentLevel = level;
	}

	getLevel(): LogLevel {
		return this.currentLevel;
	}

	enable() {
		this.enabled = true;
		this.disabled = false;
	}

	disable() {
		this.enabled = false;
		this.disabled = true;
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	setSSROnly(ssrOnly: boolean) {
		this.ssrOnly = ssrOnly;
	}

	log(level: LogLevel, msg: string, meta: object = {}) {
		if (!this.disabled && logLevels[level] >= logLevels[this.currentLevel]) {
			if (!this.ssrOnly || (this.ssrOnly && typeof window === "undefined")) {
				this.strategy.log(level, { msg, ...meta });
			}
		}
	}

	trace(msg: string, meta: object = {}) {
		this.log("trace", msg, meta);
	}
	debug(msg: string, meta: object = {}) {
		this.log("debug", msg, meta);
	}
	info(msg: string, meta: object = {}) {
		this.log("info", msg, meta);
	}
	warn(msg: string, meta: object = {}) {
		this.log("warn", msg, meta);
	}
	error(msg: string, meta: object = {}) {
		this.log("error", msg, meta);
	}
	fatal(msg: string, meta: object = {}) {
		this.log("fatal", msg, meta);
	}
}

const logger = new ConfigurableLogger(
	loggerStrategies[getEnvironment()],
	process.env.NODE_ENV === "production" ? "warn" : "debug",
	process.env.NODE_ENV !== "test",
	false, // default to not SSR-only
);

export default logger;
export { isServer, isNextEdgeRuntime, ConfigurableLogger, loggerStrategies };
export type { LogLevel };
