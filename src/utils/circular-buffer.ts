/**
 * Circular buffer implementation for nexlog
 * Prevents memory leaks by limiting buffer size
 */

export interface CircularBufferOptions {
	/** Maximum size of the buffer */
	maxSize: number;
	/** Strategy when buffer is full */
	overflowStrategy?: "drop-oldest" | "drop-newest" | "block";
	/** Callback when items are dropped */
	onDrop?: (items: unknown[]) => void;
}

/**
 * Generic circular buffer implementation
 */
export class CircularBuffer<T> {
	private buffer: (T | undefined)[];
	private head = 0;
	private tail = 0;
	private size = 0;
	private readonly maxSize: number;
	private readonly overflowStrategy: "drop-oldest" | "drop-newest" | "block";
	private readonly onDrop?: (items: T[]) => void;
	private droppedCount = 0;

	constructor(options: CircularBufferOptions | number) {
		if (typeof options === "number") {
			this.maxSize = options;
			this.overflowStrategy = "drop-oldest";
		} else {
			this.maxSize = options.maxSize;
			this.overflowStrategy = options.overflowStrategy || "drop-oldest";
			this.onDrop = options.onDrop as ((items: T[]) => void) | undefined;
		}

		if (this.maxSize <= 0) {
			throw new Error("CircularBuffer maxSize must be greater than 0");
		}

		this.buffer = new Array(this.maxSize);
	}

	/**
	 * Add an item to the buffer
	 */
	push(item: T): boolean {
		if (this.isFull()) {
			switch (this.overflowStrategy) {
				case "drop-oldest": {
					const dropped = this.shift();
					if (dropped !== undefined && this.onDrop) {
						this.onDrop([dropped]);
					}
					this.droppedCount++;
					break;
				}
				case "drop-newest":
					if (this.onDrop) {
						this.onDrop([item]);
					}
					this.droppedCount++;
					return false;
				case "block":
					return false;
			}
		}

		this.buffer[this.tail] = item;
		this.tail = (this.tail + 1) % this.maxSize;
		this.size++;

		return true;
	}

	/**
	 * Remove and return the oldest item
	 */
	shift(): T | undefined {
		if (this.isEmpty()) {
			return undefined;
		}

		const item = this.buffer[this.head];
		this.buffer[this.head] = undefined;
		this.head = (this.head + 1) % this.maxSize;
		this.size--;

		return item;
	}

	/**
	 * Get the oldest item without removing it
	 */
	peek(): T | undefined {
		if (this.isEmpty()) {
			return undefined;
		}
		return this.buffer[this.head];
	}

	/**
	 * Get the newest item without removing it
	 */
	peekLast(): T | undefined {
		if (this.isEmpty()) {
			return undefined;
		}
		const index = (this.tail - 1 + this.maxSize) % this.maxSize;
		return this.buffer[index];
	}

	/**
	 * Get all items in the buffer
	 */
	toArray(): T[] {
		const result: T[] = [];

		if (this.isEmpty()) {
			return result;
		}

		let current = this.head;
		for (let i = 0; i < this.size; i++) {
			const item = this.buffer[current];
			if (item !== undefined) {
				result.push(item);
			}
			current = (current + 1) % this.maxSize;
		}

		return result;
	}

	/**
	 * Clear the buffer
	 */
	clear(): void {
		this.buffer = new Array(this.maxSize);
		this.head = 0;
		this.tail = 0;
		this.size = 0;
		this.droppedCount = 0;
	}

	/**
	 * Get the current size of the buffer
	 */
	getSize(): number {
		return this.size;
	}

	/**
	 * Check if the buffer is empty
	 */
	isEmpty(): boolean {
		return this.size === 0;
	}

	/**
	 * Check if the buffer is full
	 */
	isFull(): boolean {
		return this.size >= this.maxSize;
	}

	/**
	 * Get the maximum size of the buffer
	 */
	getMaxSize(): number {
		return this.maxSize;
	}

	/**
	 * Get the number of dropped items
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

	/**
	 * Get buffer statistics
	 */
	getStats(): {
		size: number;
		maxSize: number;
		dropped: number;
		utilization: number;
	} {
		return {
			size: this.size,
			maxSize: this.maxSize,
			dropped: this.droppedCount,
			utilization: this.size / this.maxSize,
		};
	}

	/**
	 * Iterate over items in the buffer
	 */
	*[Symbol.iterator](): IterableIterator<T> {
		let current = this.head;
		for (let i = 0; i < this.size; i++) {
			const item = this.buffer[current];
			if (item !== undefined) {
				yield item;
			}
			current = (current + 1) % this.maxSize;
		}
	}

	/**
	 * Execute a callback for each item
	 */
	forEach(callback: (item: T, index: number) => void): void {
		let current = this.head;
		for (let i = 0; i < this.size; i++) {
			const item = this.buffer[current];
			if (item !== undefined) {
				callback(item, i);
			}
			current = (current + 1) % this.maxSize;
		}
	}

	/**
	 * Filter items in the buffer
	 */
	filter(predicate: (item: T) => boolean): T[] {
		const result: T[] = [];
		this.forEach((item) => {
			if (predicate(item)) {
				result.push(item);
			}
		});
		return result;
	}

	/**
	 * Find an item in the buffer
	 */
	find(predicate: (item: T) => boolean): T | undefined {
		for (const item of this) {
			if (predicate(item)) {
				return item;
			}
		}
		return undefined;
	}

	/**
	 * Check if any item matches the predicate
	 */
	some(predicate: (item: T) => boolean): boolean {
		return this.find(predicate) !== undefined;
	}

	/**
	 * Check if all items match the predicate
	 */
	every(predicate: (item: T) => boolean): boolean {
		for (const item of this) {
			if (!predicate(item)) {
				return false;
			}
		}
		return true;
	}
}
