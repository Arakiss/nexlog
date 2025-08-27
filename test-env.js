#!/usr/bin/env node

// Test environment configuration
process.env.NEXLOG_LEVEL = "debug";
process.env.NEXLOG_STRUCTURED = "true";
process.env.NEXLOG_NAMESPACE = "test-app";
process.env.NEXLOG_SAMPLING_RATE = "0.5";
process.env.NEXLOG_CONTEXT_VERSION = "1.0.0";
process.env.NEXLOG_CONTEXT_ENVIRONMENT = "test";
process.env.NEXLOG_DEBUG = "true";
process.env.NEXLOG_COLORS = "false";

// Import after setting env vars
const { default: logger, configManager } = require("./dist/index.js");

console.log("\n=== Environment Configuration Test ===\n");

// Check configuration
const config = configManager.getConfig();
console.log("Configuration loaded:", config);

console.log("\n=== Testing Logs ===\n");

// Test different log levels
logger.trace("This is a trace message");
logger.debug("This is a debug message");
logger.info("This is an info message");
logger.warn("This is a warning message");
logger.error("This is an error message", { error: new Error("Test error") });

// Test child logger
const childLogger = logger.child("component");
childLogger.info("Child logger message");

// Test sampling (should only log ~50% with NEXLOG_SAMPLING_RATE=0.5)
console.log("\n=== Testing Sampling (50% rate) ===\n");
let logged = 0;
const originalLog = console.info;
console.info = () => logged++;

for (let i = 0; i < 20; i++) {
	logger.info(`Sampling test ${i}`);
}

console.info = originalLog;
console.log(`Logged ${logged} out of 20 messages (~50% expected)`);

console.log("\n=== Test Complete ===\n");
