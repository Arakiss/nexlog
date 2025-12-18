/**
 * Tests for formatArgs function - console.log-style variadic argument support
 * This addresses GitHub Issue #6: Logging function signature incompatibility
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { Logger } from "../src/index";

// Helper to capture logged metadata
interface CapturedLog {
	level: string;
	message: string;
	metadata?: Record<string, unknown>;
}

function createTestLogger(): { logger: Logger; logs: CapturedLog[] } {
	const logs: CapturedLog[] = [];

	const logger = new Logger({
		level: "trace",
		transports: [
			{
				name: "test-capture",
				log: (entry) => {
					logs.push({
						level: entry.level,
						message: entry.message,
						metadata: entry.metadata,
					});
				},
			},
		],
	});

	return { logger, logs };
}

describe("formatArgs - Variadic Arguments Support", () => {
	let logger: Logger;
	let logs: CapturedLog[];

	beforeEach(() => {
		const result = createTestLogger();
		logger = result.logger;
		logs = result.logs;
	});

	describe("Traditional API (backwards compatibility)", () => {
		test("works with message only", () => {
			logger.info("simple message");

			expect(logs.length).toBe(1);
			expect(logs[0].message).toBe("simple message");
			expect(logs[0].metadata).toBeUndefined();
		});

		test("works with message and metadata object", () => {
			logger.info("user action", { userId: 123, action: "login" });

			expect(logs.length).toBe(1);
			expect(logs[0].message).toBe("user action");
			expect(logs[0].metadata).toEqual({ userId: 123, action: "login" });
		});

		test("preserves existing metadata patterns", () => {
			logger.error("database error", {
				code: "ECONNREFUSED",
				host: "localhost",
				port: 5432,
			});

			expect(logs[0].message).toBe("database error");
			expect(logs[0].metadata?.code).toBe("ECONNREFUSED");
		});
	});

	describe("Console.log-style Variadic Arguments", () => {
		test("handles multiple primitive arguments", () => {
			logger.debug("processing", 123, true, "extra");

			expect(logs.length).toBe(1);
			expect(logs[0].message).toBe("processing");
			expect(logs[0].metadata?.arg1).toBe(123);
			expect(logs[0].metadata?.arg2).toBe(true);
			expect(logs[0].metadata?.arg3).toBe("extra");
		});

		test("handles multiple object arguments (merges them)", () => {
			logger.info("user data", { name: "John" }, { age: 30 });

			expect(logs[0].message).toBe("user data");
			expect(logs[0].metadata?.name).toBe("John");
			expect(logs[0].metadata?.age).toBe(30);
		});

		test("handles Error objects specially", () => {
			const error = new Error("connection failed");
			logger.error("request failed", error);

			expect(logs[0].message).toBe("request failed");
			// Error is serialized with name, message, and stack properties
			const errorMeta = logs[0].metadata?.error as Record<string, unknown>;
			expect(errorMeta?.message).toBe("connection failed");
			expect(errorMeta?.name).toBe("Error");
			expect(logs[0].metadata?.errorMessage).toBe("connection failed");
			expect(logs[0].metadata?.errorStack).toBeDefined();
		});

		test("handles Error mixed with other arguments", () => {
			const error = new Error("timeout");
			logger.error("API call failed", "requestId-123", error, { retries: 3 });

			expect(logs[0].message).toBe("API call failed");
			expect(logs[0].metadata?.arg1).toBe("requestId-123");
			// Error is serialized with name, message, and stack properties
			const errorMeta = logs[0].metadata?.error as Record<string, unknown>;
			expect(errorMeta?.message).toBe("timeout");
			expect(logs[0].metadata?.retries).toBe(3);
		});

		test("handles null and undefined values", () => {
			logger.warn("null check", null, undefined);

			expect(logs[0].message).toBe("null check");
			expect(logs[0].metadata?.arg1).toBe(null);
			expect(logs[0].metadata?.arg2).toBe(undefined);
		});

		test("handles arrays as values", () => {
			logger.info("batch process", [1, 2, 3], { count: 3 });

			expect(logs[0].message).toBe("batch process");
			expect(logs[0].metadata).toEqual({ "0": 1, "1": 2, "2": 3, count: 3 });
		});
	});

	describe("Edge Cases", () => {
		test("handles empty arguments", () => {
			// @ts-expect-error - testing runtime behavior with no args
			logger.debug();

			expect(logs.length).toBe(1);
			expect(logs[0].message).toBe("");
		});

		test("handles non-string first argument", () => {
			// @ts-expect-error - testing runtime behavior with non-string
			logger.info(123, "extra info");

			expect(logs[0].message).toBe("123 extra info");
		});

		test("handles object as first argument", () => {
			// @ts-expect-error - testing runtime behavior with object first
			logger.debug({ key: "value" });

			expect(logs[0].message).toBe('{"key":"value"}');
		});

		test("handles circular reference gracefully", () => {
			const obj: Record<string, unknown> = { name: "test" };
			obj.self = obj;

			// Should not throw
			logger.info("circular", obj);

			expect(logs[0].message).toBe("circular");
			// Metadata might have the object without circular reference properly serialized
			expect(logs[0].metadata?.name).toBe("test");
		});

		test("handles deeply nested objects", () => {
			const nested = {
				level1: {
					level2: {
						level3: {
							value: "deep",
						},
					},
				},
			};

			logger.debug("nested data", nested);

			expect(logs[0].metadata?.level1).toBeDefined();
		});

		test("handles very long strings", () => {
			const longString = "a".repeat(10000);
			logger.info(longString);

			expect(logs[0].message.length).toBe(10000);
		});

		test("handles symbols (converts to string)", () => {
			const sym = Symbol("test");
			// @ts-expect-error - testing runtime behavior
			logger.debug("with symbol", sym);

			expect(logs[0].message).toBe("with symbol");
			expect(logs[0].metadata?.arg1).toBe(sym);
		});
	});

	describe("All Log Levels Support Variadic", () => {
		test("trace supports variadic args", () => {
			logger.trace("trace msg", 1, { data: true });
			expect(logs[0].level).toBe("trace");
			expect(logs[0].metadata?.arg1).toBe(1);
			expect(logs[0].metadata?.data).toBe(true);
		});

		test("debug supports variadic args", () => {
			logger.debug("debug msg", 1, { data: true });
			expect(logs[0].level).toBe("debug");
			expect(logs[0].metadata?.arg1).toBe(1);
		});

		test("info supports variadic args", () => {
			logger.info("info msg", 1, { data: true });
			expect(logs[0].level).toBe("info");
			expect(logs[0].metadata?.arg1).toBe(1);
		});

		test("success supports variadic args", () => {
			logger.success("success msg", 1, { data: true });
			expect(logs[0].level).toBe("success");
			expect(logs[0].metadata?.arg1).toBe(1);
		});

		test("warn supports variadic args", () => {
			logger.warn("warn msg", 1, { data: true });
			expect(logs[0].level).toBe("warn");
			expect(logs[0].metadata?.arg1).toBe(1);
		});

		test("error supports variadic args", () => {
			logger.error("error msg", 1, { data: true });
			expect(logs[0].level).toBe("error");
			expect(logs[0].metadata?.arg1).toBe(1);
		});

		test("fatal supports variadic args", () => {
			logger.fatal("fatal msg", 1, { data: true });
			expect(logs[0].level).toBe("fatal");
			expect(logs[0].metadata?.arg1).toBe(1);
		});
	});

	describe("Real-world Usage Patterns", () => {
		test("Express middleware logging pattern", () => {
			const req = { method: "GET", url: "/api/users", ip: "127.0.0.1" };
			const res = { statusCode: 200 };
			const duration = 45;

			logger.info("request completed", req.method, req.url, {
				status: res.statusCode,
				duration: `${duration}ms`,
				ip: req.ip,
			});

			expect(logs[0].message).toBe("request completed");
			expect(logs[0].metadata?.arg1).toBe("GET");
			expect(logs[0].metadata?.arg2).toBe("/api/users");
			expect(logs[0].metadata?.status).toBe(200);
		});

		test("Database query logging pattern", () => {
			const query = "SELECT * FROM users WHERE id = $1";
			const params = [123];
			const executionTime = 12.5;

			logger.debug("query executed", query, { params, executionTime });

			expect(logs[0].metadata?.arg1).toBe(query);
			expect(logs[0].metadata?.params).toEqual([123]);
		});

		test("Error handling logging pattern", () => {
			const error = new Error("Database connection lost");
			const context = { database: "users", operation: "insert" };

			logger.error("operation failed", error, context);

			// Error is serialized with name, message, and stack properties
			const errorMeta = logs[0].metadata?.error as Record<string, unknown>;
			expect(errorMeta?.message).toBe("Database connection lost");
			expect(logs[0].metadata?.database).toBe("users");
		});

		test("Startup logging pattern", () => {
			const config = {
				port: 3000,
				env: "production",
				workers: 4,
			};

			logger.info("server started", config);

			expect(logs[0].metadata?.port).toBe(3000);
			expect(logs[0].metadata?.env).toBe("production");
		});
	});
});
