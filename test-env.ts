#!/usr/bin/env bun

/**
 * Test environment configuration with Bun
 * Run with: bun test-env.ts
 */

// Set environment variables before importing
process.env.NEXLOG_LEVEL = "debug";
process.env.NEXLOG_STRUCTURED = "true";
process.env.NEXLOG_NAMESPACE = "test-app";
process.env.NEXLOG_SAMPLING_RATE = "0.5";
process.env.NEXLOG_CONTEXT_VERSION = "1.0.0";
process.env.NEXLOG_CONTEXT_ENVIRONMENT = "test";
process.env.NEXLOG_DEBUG = "true";
process.env.NEXLOG_COLORS = "false";
process.env.NEXLOG_PERFORMANCE = "true";

// Modern ES module imports with Bun
import logger, { configManager, type ExtendedLoggerConfig } from "./src/index";

console.log("\n🚀 === Bun + nexlog Environment Configuration Test ===\n");

// Check configuration
const config: ExtendedLoggerConfig = configManager.getConfig();
console.log("📋 Configuration loaded:", JSON.stringify(config, null, 2));

console.log("\n📝 === Testing Logs ===\n");

// Test different log levels
logger.trace("This is a trace message");
logger.debug("This is a debug message");
logger.info("This is an info message");
logger.warn("This is a warning message");
logger.error("This is an error message", { error: new Error("Test error") });

// Test child logger
const childLogger = logger.child("component");
childLogger.info("Child logger message");

// Test async performance with Bun's speed
console.log("\n⚡ === Testing Performance with Bun ===\n");

const result = await logger.time("bun-performance-test", async () => {
	// Simulate async work
	await Bun.sleep(100);
	return "completed";
});

console.log("Performance test result:", result);

// Test sampling (should only log ~50% with NEXLOG_SAMPLING_RATE=0.5)
console.log("\n🎲 === Testing Sampling (50% rate) ===\n");

let logged = 0;
const originalInfo = console.info;
console.info = () => logged++;

for (let i = 0; i < 20; i++) {
	logger.info(`Sampling test ${i}`);
}

console.info = originalInfo;
console.log(`📊 Logged ${logged} out of 20 messages (~50% expected)`);

// Test Bun-specific features
console.log("\n🐰 === Bun-Specific Features ===\n");

// Use Bun's performance API
const start = Bun.nanoseconds();
logger.info("Testing with Bun nanosecond precision");
const end = Bun.nanoseconds();
console.log(`⏱️ Log operation took: ${end - start} nanoseconds`);

// Test with Bun's file API (if needed)
const testFile = Bun.file("./package.json");
logger.info("Package info", {
	size: testFile.size,
	type: testFile.type,
});

console.log("\n✅ === Test Complete ===\n");
console.log("🐰 Powered by Bun", Bun.version);
