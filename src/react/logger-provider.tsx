"use client";

import type React from "react";
import { createContext, useContext, useEffect } from "react";
import logger, { type LogLevel } from "../index.js";

const LoggerContext = createContext<typeof logger | null>(null);

export const useLogger = () => {
	const context = useContext(LoggerContext);
	if (!context) {
		throw new Error("useLogger must be used within a LoggerProvider");
	}
	return context;
};

export const LoggerProvider: React.FC<{
	children: React.ReactNode;
	initialLevel?: LogLevel;
	ssrOnly?: boolean;
	disabled?: boolean;
}> = ({ children, initialLevel, ssrOnly = false, disabled = false }) => {
	useEffect(() => {
		const configureLogger = () => {
			initialLevel && logger.setLevel(initialLevel);
			logger.setSSROnly(ssrOnly);
			disabled ? logger.disable() : logger.enable();
		};

		const logAppStatus = (status: "start" | "stop") => {
			if (!disabled) {
				const message =
					status === "start"
						? "🚀 Application started"
						: "🛑 Application stopped";
				logger.info(message);
			}
		};

		configureLogger();
		logAppStatus("start");

		return () => logAppStatus("stop");
	}, [initialLevel, ssrOnly, disabled]);

	return (
		<LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>
	);
};
