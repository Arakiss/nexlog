"use client";

/**
 * React integration for nexlog
 * @module
 */

import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import logger, {
	Logger,
	type LoggerConfig,
	type LogLevel,
	type LogMetadata,
	type Transport,
} from "../index.js";

/**
 * Logger context value
 */
interface LoggerContextValue {
	/** The logger instance */
	logger: Logger;
	/** Current log level */
	level: LogLevel;
	/** Whether the logger is enabled */
	enabled: boolean;
	/** Set the log level */
	setLevel: (level: LogLevel) => void;
	/** Enable the logger */
	enable: () => void;
	/** Disable the logger */
	disable: () => void;
	/** Add a transport */
	addTransport: (transport: Transport) => void;
	/** Remove a transport */
	removeTransport: (name: string) => void;
	/** Create a child logger */
	createChild: (namespace: string, config?: Partial<LoggerConfig>) => Logger;
	/** Get logger statistics */
	stats: {
		logCount: number;
		uptime: number;
		children: number;
		transports: number;
	};
}

const LoggerContext = createContext<LoggerContextValue | null>(null);

/**
 * Hook to access the logger
 * @returns The logger context value
 * @throws If used outside of LoggerProvider
 */
export const useLogger = (): LoggerContextValue => {
	const context = useContext(LoggerContext);
	if (!context) {
		throw new Error("useLogger must be used within a LoggerProvider");
	}
	return context;
};

/**
 * Hook to create a child logger
 * @param namespace - The namespace for the child logger
 * @param config - Optional configuration for the child logger
 * @returns A child logger instance
 */
export const useChildLogger = (
	namespace: string,
	config?: Partial<LoggerConfig>,
): Logger => {
	const { createChild } = useLogger();
	return useMemo(
		() => createChild(namespace, config),
		[createChild, namespace, config],
	);
};

/**
 * Hook for performance logging
 * @param label - Label for the performance measurement
 * @returns Functions to start and end the measurement
 */
export const usePerformanceLogger = (label: string) => {
	const { logger } = useLogger();
	const startRef = useRef<number>(0);

	const start = useCallback(() => {
		startRef.current = performance.now();
	}, []);

	const end = useCallback(
		(metadata?: LogMetadata) => {
			const duration = performance.now() - startRef.current;
			logger.debug(`Performance: ${label}`, {
				...metadata,
				duration: `${duration.toFixed(2)}ms`,
			});
			return duration;
		},
		[logger, label],
	);

	return { start, end };
};

/**
 * LoggerProvider component props
 */
export interface LoggerProviderProps {
	/** Children components */
	children: React.ReactNode;
	/** Initial log level */
	initialLevel?: LogLevel;
	/** Whether to only log on SSR */
	ssrOnly?: boolean;
	/** Whether the logger is initially disabled */
	disabled?: boolean;
	/** Custom logger configuration */
	config?: LoggerConfig;
	/** Custom logger instance */
	customLogger?: Logger;
	/** Whether to log app lifecycle events */
	logLifecycle?: boolean;
	/** Namespace for the provider's logger */
	namespace?: string;
}

/**
 * LoggerProvider component
 * Provides logging functionality to child components
 */
export const LoggerProvider: React.FC<LoggerProviderProps> = ({
	children,
	initialLevel = "info",
	ssrOnly = false,
	disabled = false,
	config,
	customLogger,
	logLifecycle = true,
	namespace,
}) => {
	// Create or use provided logger
	const loggerInstance = useMemo(() => {
		if (customLogger) {
			return customLogger;
		}

		if (config) {
			return new Logger({
				...config,
				level: config.level ?? initialLevel,
				ssrOnly: config.ssrOnly ?? ssrOnly,
				enabled: config.enabled ?? !disabled,
				namespace: config.namespace ?? namespace,
			});
		}

		// Use default logger with configuration
		if (namespace) {
			return logger.child(namespace, {
				level: initialLevel,
				ssrOnly,
				enabled: !disabled,
			});
		}

		// Configure default logger
		logger.setLevel(initialLevel);
		logger.setSSROnly(ssrOnly);
		if (disabled) {
			logger.disable();
		} else {
			logger.enable();
		}

		return logger;
	}, [customLogger, config, initialLevel, ssrOnly, disabled, namespace]);

	// State for reactive updates
	const [level, setLevelState] = useState<LogLevel>(() =>
		loggerInstance.getLevel(),
	);
	const [enabled, setEnabledState] = useState<boolean>(() =>
		loggerInstance.isEnabled(),
	);
	const [stats, setStats] = useState(() => loggerInstance.getStats());

	// Update stats periodically
	useEffect(() => {
		const interval = setInterval(() => {
			setStats(loggerInstance.getStats());
		}, 1000);

		return () => clearInterval(interval);
	}, [loggerInstance]);

	// Context value with memoization
	const contextValue = useMemo<LoggerContextValue>(
		() => ({
			logger: loggerInstance,
			level,
			enabled,
			setLevel: (newLevel: LogLevel) => {
				loggerInstance.setLevel(newLevel);
				setLevelState(newLevel);
			},
			enable: () => {
				loggerInstance.enable();
				setEnabledState(true);
			},
			disable: () => {
				loggerInstance.disable();
				setEnabledState(false);
			},
			addTransport: (transport: Transport) => {
				loggerInstance.addTransport(transport);
				setStats(loggerInstance.getStats());
			},
			removeTransport: (name: string) => {
				loggerInstance.removeTransport(name);
				setStats(loggerInstance.getStats());
			},
			createChild: (ns: string, cfg?: Partial<LoggerConfig>) =>
				loggerInstance.child(ns, cfg),
			stats,
		}),
		[loggerInstance, level, enabled, stats],
	);

	// Lifecycle logging
	useEffect(() => {
		if (!logLifecycle || disabled) return;

		const handleVisibilityChange = () => {
			if (document.hidden) {
				loggerInstance.info("App went to background");
			} else {
				loggerInstance.info("App returned to foreground");
			}
		};

		const handleOnline = () => loggerInstance.info("Network online");
		const handleOffline = () => loggerInstance.warn("Network offline");

		const handleUnload = () => {
			loggerInstance.info("App unloading");
			// Flush all transports before unload
			loggerInstance.flush();
		};

		const handleError = (event: ErrorEvent) => {
			loggerInstance.error("Unhandled error", {
				message: event.message,
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
				error: event.error,
			});
		};

		const handleRejection = (event: PromiseRejectionEvent) => {
			loggerInstance.error("Unhandled promise rejection", {
				reason: event.reason,
			});
		};

		// Initial log
		loggerInstance.info("App started", {
			level: initialLevel,
			ssrOnly,
			namespace,
		});

		// Add event listeners
		if (typeof window !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
			window.addEventListener("online", handleOnline);
			window.addEventListener("offline", handleOffline);
			window.addEventListener("beforeunload", handleUnload);
			window.addEventListener("error", handleError);
			window.addEventListener("unhandledrejection", handleRejection);
		}

		// Cleanup
		return () => {
			if (logLifecycle && !disabled) {
				loggerInstance.info("App stopped");
			}

			if (typeof window !== "undefined") {
				document.removeEventListener(
					"visibilitychange",
					handleVisibilityChange,
				);
				window.removeEventListener("online", handleOnline);
				window.removeEventListener("offline", handleOffline);
				window.removeEventListener("beforeunload", handleUnload);
				window.removeEventListener("error", handleError);
				window.removeEventListener("unhandledrejection", handleRejection);
			}

			// Flush on cleanup
			loggerInstance.flush();
		};
	}, [
		logLifecycle,
		disabled,
		loggerInstance,
		initialLevel,
		ssrOnly,
		namespace,
	]);

	return (
		<LoggerContext.Provider value={contextValue}>
			{children}
		</LoggerContext.Provider>
	);
};

/**
 * HOC to inject logger into components
 * @param Component - Component to wrap
 * @param namespace - Optional namespace for the logger
 * @returns Wrapped component with logger prop
 */
export function withLogger<P extends { logger?: Logger }>(
	Component: React.ComponentType<P>,
	namespace?: string,
): React.FC<Omit<P, "logger">> {
	const WithLoggerComponent: React.FC<Omit<P, "logger">> = (props) => {
		const { logger: contextLogger, createChild } = useLogger();
		const logger = namespace ? createChild(namespace) : contextLogger;

		return <Component {...(props as P)} logger={logger} />;
	};

	WithLoggerComponent.displayName = `withLogger(${
		Component.displayName || Component.name || "Component"
	})`;

	return WithLoggerComponent;
}

/**
 * DevTools component for debugging
 * Only renders in development mode
 */
export const LoggerDevTools: React.FC<{
	position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}> = ({ position = "bottom-right" }) => {
	const context = useContext(LoggerContext);
	const [isOpen, setIsOpen] = useState(false);

	// Only render in development
	if (process.env.NODE_ENV === "production" || !context) {
		return null;
	}

	const positionStyles = {
		"top-left": "top-4 left-4",
		"top-right": "top-4 right-4",
		"bottom-left": "bottom-4 left-4",
		"bottom-right": "bottom-4 right-4",
	};

	return (
		<div
			className={`fixed ${positionStyles[position]} z-50`}
			style={{
				fontFamily: "monospace",
				fontSize: "12px",
			}}
		>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				style={{
					background: context.enabled ? "#22c55e" : "#ef4444",
					color: "white",
					padding: "8px 12px",
					borderRadius: "4px",
					border: "none",
					cursor: "pointer",
					marginBottom: isOpen ? "8px" : 0,
				}}
			>
				nexlog {context.enabled ? "●" : "○"}
			</button>

			{isOpen && (
				<div
					style={{
						background: "rgba(0, 0, 0, 0.9)",
						color: "white",
						padding: "12px",
						borderRadius: "4px",
						minWidth: "200px",
					}}
				>
					<div style={{ marginBottom: "8px" }}>
						<strong>Level:</strong> {context.level}
					</div>
					<div style={{ marginBottom: "8px" }}>
						<strong>Logs:</strong> {context.stats.logCount}
					</div>
					<div style={{ marginBottom: "8px" }}>
						<strong>Children:</strong> {context.stats.children}
					</div>
					<div style={{ marginBottom: "8px" }}>
						<strong>Transports:</strong> {context.stats.transports}
					</div>
					<div style={{ marginBottom: "8px" }}>
						<strong>Uptime:</strong> {(context.stats.uptime / 1000).toFixed(1)}s
					</div>

					<div style={{ marginTop: "12px" }}>
						<select
							value={context.level}
							onChange={(e) => context.setLevel(e.target.value as LogLevel)}
							style={{
								width: "100%",
								padding: "4px",
								borderRadius: "2px",
								background: "white",
								color: "black",
								border: "1px solid #ccc",
							}}
						>
							<option value="trace">Trace</option>
							<option value="debug">Debug</option>
							<option value="info">Info</option>
							<option value="warn">Warn</option>
							<option value="error">Error</option>
							<option value="fatal">Fatal</option>
						</select>
					</div>

					<div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
						<button
							type="button"
							onClick={() => context.enable()}
							style={{
								flex: 1,
								padding: "4px",
								borderRadius: "2px",
								background: "#22c55e",
								color: "white",
								border: "none",
								cursor: "pointer",
							}}
						>
							Enable
						</button>
						<button
							type="button"
							onClick={() => context.disable()}
							style={{
								flex: 1,
								padding: "4px",
								borderRadius: "2px",
								background: "#ef4444",
								color: "white",
								border: "none",
								cursor: "pointer",
							}}
						>
							Disable
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

// Export the old API for backwards compatibility but mark as deprecated
/**
 * @deprecated Use LoggerProvider instead
 */
export { useLogger as default };
