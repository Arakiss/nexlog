/**
 * Rate limiter for preventing log flooding
 */

export interface RateLimiterOptions {
	/** Max number of logs per window */
	maxLogs: number;
	/** Time window in milliseconds */
	windowMs: number;
	/** Message to log when rate limited */
	limitMessage?: string;
}

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
	private tokens: number;
	private lastRefill: number;
	private readonly maxTokens: number;
	private readonly refillRate: number;
	private droppedCount = 0;

	constructor(options: RateLimiterOptions) {
		this.maxTokens = options.maxLogs;
		this.refillRate = options.maxLogs / options.windowMs; // tokens per ms
		this.tokens = this.maxTokens;
		this.lastRefill = Date.now();
	}

	/**
	 * Check if a log should be allowed
	 */
	shouldAllow(): boolean {
		this.refill();

		if (this.tokens >= 1) {
			this.tokens--;
			return true;
		}

		this.droppedCount++;
		return false;
	}

	/**
	 * Get number of dropped logs
	 */
	getDroppedCount(): number {
		return this.droppedCount;
	}

	/**
	 * Reset dropped count
	 */
	resetDroppedCount(): void {
		this.droppedCount = 0;
	}

	private refill(): void {
		const now = Date.now();
		const timePassed = now - this.lastRefill;
		const tokensToAdd = timePassed * this.refillRate;

		this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
		this.lastRefill = now;
	}
}

/**
 * Per-message rate limiter
 */
export class MessageRateLimiter {
	private limiters = new Map<string, RateLimiter>();
	private defaultLimiter?: RateLimiter;

	constructor(defaultOptions?: RateLimiterOptions) {
		if (defaultOptions) {
			this.defaultLimiter = new RateLimiter(defaultOptions);
		}
	}

	/**
	 * Check if a specific message should be rate limited
	 */
	shouldAllow(_message: string, metadata?: { _rateLimit?: string }): boolean {
		// Check for per-message rate limit
		const rateLimitConfig = metadata?._rateLimit;

		if (rateLimitConfig) {
			const limiter = this.getLimiterForConfig(rateLimitConfig);
			return limiter.shouldAllow();
		}

		// Use default rate limiter
		if (this.defaultLimiter) {
			return this.defaultLimiter.shouldAllow();
		}

		return true;
	}

	/**
	 * Get or create rate limiter for specific config
	 */
	private getLimiterForConfig(config: string): RateLimiter {
		if (!this.limiters.has(config)) {
			const options = this.parseRateLimitConfig(config);
			this.limiters.set(config, new RateLimiter(options));
		}
		// biome-ignore lint/style/noNonNullAssertion: Map.has() check guarantees entry exists
		return this.limiters.get(config)!;
	}

	/**
	 * Parse rate limit config string like "10/minute" or "5/second"
	 */
	private parseRateLimitConfig(config: string): RateLimiterOptions {
		const match = config.match(/(\d+)\/(\w+)/);
		if (!match || !match[1] || !match[2]) {
			throw new Error(`Invalid rate limit config: ${config}`);
		}

		const [, countStr, unit] = match;
		const count = parseInt(countStr, 10);

		let windowMs: number;
		switch (unit.toLowerCase()) {
			case "second":
			case "sec":
			case "s":
				windowMs = 1000;
				break;
			case "minute":
			case "min":
			case "m":
				windowMs = 60 * 1000;
				break;
			case "hour":
			case "hr":
			case "h":
				windowMs = 60 * 60 * 1000;
				break;
			default:
				throw new Error(`Invalid rate limit unit: ${unit}`);
		}

		return {
			maxLogs: count,
			windowMs,
			limitMessage: `Rate limit exceeded for: ${config}`,
		};
	}

	/**
	 * Get statistics for all rate limiters
	 */
	getStats(): Record<string, { droppedCount: number }> {
		const stats: Record<string, { droppedCount: number }> = {};

		if (this.defaultLimiter) {
			stats.default = { droppedCount: this.defaultLimiter.getDroppedCount() };
		}

		for (const [config, limiter] of this.limiters) {
			stats[config] = { droppedCount: limiter.getDroppedCount() };
		}

		return stats;
	}

	/**
	 * Clean up old limiters that haven't been used
	 */
	cleanup(): void {
		// Remove limiters that haven't been used in the last hour
		const _cutoff = Date.now() - 60 * 60 * 1000;

		for (const [config, limiter] of this.limiters) {
			// This is a simple heuristic - in a real implementation,
			// you might want to track last usage time
			if (limiter.getDroppedCount() === 0) {
				this.limiters.delete(config);
			}
		}
	}
}

/**
 * Sampling configuration per log level
 */
export interface SamplingConfig {
	trace?: number;
	debug?: number;
	info?: number;
	success?: number;
	warn?: number;
	error?: number;
	fatal?: number;
}

/**
 * Advanced sampler with per-level configuration
 */
export class AdvancedSampler {
	constructor(private config: SamplingConfig) {}

	/**
	 * Check if a log at the given level should be sampled
	 */
	shouldSample(level: string, metadata?: { _sample?: number }): boolean {
		// Check for per-log sampling rate
		const perLogRate = metadata?._sample;
		if (perLogRate !== undefined) {
			return Math.random() <= perLogRate;
		}

		// Use level-specific sampling rate
		const levelRate = this.config[level as keyof SamplingConfig];
		if (levelRate !== undefined) {
			return Math.random() <= levelRate;
		}

		// Default to allow all logs
		return true;
	}

	/**
	 * Update sampling configuration
	 */
	updateConfig(config: Partial<SamplingConfig>): void {
		Object.assign(this.config, config);
	}

	/**
	 * Get current sampling configuration
	 */
	getConfig(): SamplingConfig {
		return { ...this.config };
	}
}
