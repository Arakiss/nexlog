# nexlog

A blazing-fast, modern logging library for Next.js, optimized for Bun runtime with advanced features like structured logging, custom transports, plugins, and React integration.

![CI/CD](https://github.com/Arakiss/nexlog/actions/workflows/ci-cd.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/nexlog.svg)
![License](https://img.shields.io/npm/l/nexlog.svg)
![Bun](https://img.shields.io/badge/runtime-Bun-f472b6.svg)

## ✨ Features

### Core Features
- 🐰 **Bun-Optimized** - Built and tested with Bun for maximum performance
- 🚀 **Blazing Fast** - Leverages Bun's speed with batching and sampling
- 🎯 **Environment Detection** - Automatic detection of server, browser, edge, and Bun runtime
- 🎨 **Colored Console Output** - Beautiful colored logs in server environments
- 📊 **Structured Logging** - JSON output for production environments
- 🔌 **Plugin System** - Extend functionality with custom plugins
- 🚢 **Custom Transports** - Send logs anywhere (console, files, external services)
- 👶 **Child Loggers** - Namespaced logging with inherited configuration
- 📈 **Performance Monitoring** - Built-in timing with Bun's high-precision timers
- 🎛️ **Dynamic Configuration** - Change log levels and settings at runtime
- 💾 **Batching Support** - Optimize performance with batched log output
- 📊 **Statistics** - Track log counts, uptime, and more
- 🌍 **Full Env Config** - Complete control via environment variables

### React Features
- ⚛️ **React Integration** - LoggerProvider and hooks for React apps
- 🪝 **Custom Hooks** - useLogger, useChildLogger, usePerformanceLogger
- 🎭 **HOC Support** - withLogger higher-order component
- 🛠️ **DevTools Component** - Visual logger controls for development
- 🌐 **Lifecycle Logging** - Automatic app lifecycle event tracking
- 💪 **TypeScript Support** - Full type safety and IntelliSense

## 📦 Installation

```bash
# Recommended: Bun (blazing fast)
bun add nexlog

# Also works with npm/yarn/pnpm
npm install nexlog
yarn add nexlog
pnpm add nexlog
```

## 🚀 Quick Start

### Basic Usage

```typescript
import logger from 'nexlog';

// Simple logging
logger.info('Application started');
logger.warn('This is a warning', { userId: 123 });
logger.error('An error occurred', { error: new Error('Something went wrong') });

// Set log level
logger.setLevel('warn'); // Only warn and above will be logged

// Enable/disable logging
logger.disable(); // Temporarily disable all logging
logger.enable();  // Re-enable logging
```

### Advanced Logger Configuration

```typescript
import { Logger, ConsoleTransport, BatchedTransport } from 'nexlog';

// Create a custom logger instance
const logger = new Logger({
  level: 'debug',
  namespace: 'my-app',
  context: { version: '1.0.0', environment: 'production' },
  structured: true, // Use JSON output
  samplingRate: 0.5, // Log only 50% of messages (useful for high-volume logging)
  transports: [
    new ConsoleTransport({ useColors: true }),
    new BatchedTransport(
      new ConsoleTransport(),
      { maxBatchSize: 100, flushInterval: 5000 }
    )
  ]
});

// All logs will include the context
logger.info('User logged in', { userId: 123 });
// Output includes: version: "1.0.0", environment: "production", userId: 123
```

## 🏗️ Advanced Features

### Child Loggers

Create namespaced child loggers that inherit parent configuration:

```typescript
const dbLogger = logger.child('database');
const apiLogger = logger.child('api');

dbLogger.info('Connected to database');
// Output: [INFO] [database] Connected to database

const queryLogger = dbLogger.child('query');
queryLogger.debug('Executing SELECT query');
// Output: [DEBUG] [database:query] Executing SELECT query
```

### Custom Transports

Create custom transports to send logs anywhere:

```typescript
import { Transport, LogEntry } from 'nexlog';

class FileTransport implements Transport {
  name = 'file';
  
  async log(entry: LogEntry) {
    // Write to file, send to external service, etc.
    await fs.appendFile('app.log', JSON.stringify(entry) + '\n');
  }
  
  async flush() {
    // Flush any buffered logs
  }
}

logger.addTransport(new FileTransport());
```

### Plugin System

Extend logger functionality with plugins:

```typescript
import { LoggerPlugin, LogEntry } from 'nexlog';

const sensitiveDataPlugin: LoggerPlugin = {
  name: 'sensitive-filter',
  
  transform(entry: LogEntry) {
    // Redact sensitive information
    const message = entry.message.replace(/password=\S+/g, 'password=***');
    return { ...entry, message };
  },
  
  beforeLog(entry: LogEntry) {
    // Skip logs containing certain patterns
    if (entry.message.includes('SKIP_LOG')) {
      return false; // Prevent this log from being written
    }
  }
};

logger.use(sensitiveDataPlugin);
```

### Performance Monitoring

Built-in utilities for performance measurement:

```typescript
// Time async operations
const result = await logger.time('database-query', async () => {
  return await db.query('SELECT * FROM users');
});
// Automatically logs: "database-query completed" with duration

// Profile code sections
const endProfile = logger.profile('heavy-computation');
// ... perform computation ...
endProfile();
// Logs: "Profile: heavy-computation" with duration

// Manual performance logging in React
const { start, end } = usePerformanceLogger('component-render');
start();
// ... component logic ...
end({ componentName: 'UserList' });
```

### Batching for Performance

Optimize logging performance with batching:

```typescript
import { BatchedTransport, ConsoleTransport } from 'nexlog';

const batchedLogger = new Logger({
  transports: [
    new BatchedTransport(
      new ConsoleTransport(),
      {
        maxBatchSize: 100,    // Flush after 100 logs
        flushInterval: 5000   // Flush every 5 seconds
      }
    )
  ]
});

// Logs are batched and flushed efficiently
for (let i = 0; i < 1000; i++) {
  batchedLogger.info(`Processing item ${i}`);
}

// Manually flush all pending logs
await batchedLogger.flush();
```

## ⚛️ React Integration

### LoggerProvider

```typescript
import { LoggerProvider } from 'nexlog/react';

export default function App() {
  return (
    <LoggerProvider 
      initialLevel="debug"
      namespace="my-app"
      config={{
        context: { version: '1.0.0' },
        structured: process.env.NODE_ENV === 'production'
      }}
      logLifecycle={true} // Log app start/stop, network events, errors
    >
      <YourApp />
    </LoggerProvider>
  );
}
```

### React Hooks

```typescript
import { useLogger, useChildLogger, usePerformanceLogger } from 'nexlog/react';

function MyComponent() {
  // Access the logger instance
  const { logger, level, setLevel, stats } = useLogger();
  
  // Create a child logger for this component
  const componentLogger = useChildLogger('MyComponent');
  
  // Performance logging
  const { start, end } = usePerformanceLogger('data-fetch');
  
  useEffect(() => {
    start();
    fetchData().then(data => {
      end({ recordCount: data.length });
      componentLogger.info('Data loaded', { count: data.length });
    });
  }, []);
  
  return (
    <div>
      <p>Log Level: {level}</p>
      <p>Total Logs: {stats.logCount}</p>
      <button onClick={() => setLevel('debug')}>Set Debug</button>
    </div>
  );
}
```

### Higher-Order Component

```typescript
import { withLogger } from 'nexlog/react';

interface Props {
  logger?: Logger;
}

const MyComponent: React.FC<Props> = ({ logger }) => {
  logger?.info('Component rendered');
  return <div>My Component</div>;
};

export default withLogger(MyComponent, 'MyComponent');
```

### DevTools Component

Add visual logger controls in development:

```typescript
import { LoggerProvider, LoggerDevTools } from 'nexlog/react';

function App() {
  return (
    <LoggerProvider>
      <YourApp />
      {process.env.NODE_ENV === 'development' && (
        <LoggerDevTools position="bottom-right" />
      )}
    </LoggerProvider>
  );
}
```

The DevTools component provides:
- Real-time log level adjustment
- Enable/disable logging
- View logger statistics
- Monitor active transports and child loggers

## 🎯 Log Levels

Levels from least to most severe:

- `trace` - Detailed debugging information
- `debug` - Debug information for development
- `info` - General informational messages
- `warn` - Warning messages for potential issues
- `error` - Error messages for failures
- `fatal` - Critical failures requiring immediate attention

## 🌍 Environment Detection

nexlog automatically detects and optimizes for different environments:

```typescript
import { detectEnvironment, isServer, isBrowser, isEdge } from 'nexlog';

console.log(detectEnvironment()); // 'server' | 'browser' | 'edge' | 'unknown'

if (isServer) {
  // Server-specific logging with colors
}

if (isBrowser) {
  // Browser-specific logging
}

if (isEdge) {
  // Edge runtime optimizations
}
```

## 📊 Structured Logging

Enable structured logging for production environments:

```typescript
const logger = new Logger({
  structured: true,
  level: 'info'
});

logger.info('User action', { userId: 123, action: 'login' });
// Output: {"timestamp":"2024-01-01T00:00:00.000Z","level":"INFO","message":"User action","userId":123,"action":"login"}
```

## 📈 Logger Statistics

Monitor logger performance and usage:

```typescript
const stats = logger.getStats();
console.log({
  logCount: stats.logCount,        // Total logs written
  uptime: stats.uptime,            // Logger uptime in ms
  children: stats.children,        // Number of child loggers
  transports: stats.transports     // Number of active transports
});
```

## 🎛️ Environment Configuration

nexlog can be fully configured via environment variables, making it perfect for production deployments without code changes.

### Quick Setup

```bash
# Copy the example configuration
cp node_modules/nexlog/.env.example .env.local

# Or create your own
echo "NEXLOG_LEVEL=warn" >> .env.local
echo "NEXLOG_SSR_ONLY=true" >> .env.local
```

### Common Scenarios

#### Production (High Volume)
```env
NEXLOG_LEVEL=warn
NEXLOG_STRUCTURED=true
NEXLOG_SSR_ONLY=true
NEXLOG_SAMPLING_RATE=0.1  # Log only 10% of messages
NEXLOG_BATCH_SIZE=500
```

#### Development
```env
NEXLOG_LEVEL=trace
NEXLOG_COLORS=true
NEXLOG_DEV_TOOLS=true
NEXLOG_PERFORMANCE=true
NEXLOG_DEBUG=true
```

#### Disable Client Logging
```env
NEXLOG_CLIENT_ENABLED=false
NEXLOG_SSR_ONLY=true
```

#### Debug Specific Modules
```env
NEXLOG_LEVEL=trace
NEXLOG_INCLUDE_PATTERNS=AuthService.*,Database.*
NEXLOG_EXCLUDE_PATTERNS=health.*,ping
```

### All Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| **Core Settings** | | |
| `NEXLOG_LEVEL` | Log level (trace/debug/info/warn/error/fatal) | `info` |
| `NEXLOG_ENABLED` | Enable/disable all logging | `true` |
| `NEXLOG_SSR_ONLY` | Only log on server-side | `false` |
| `NEXLOG_CLIENT_ENABLED` | Enable browser logging | `true` |
| `NEXLOG_EDGE_ENABLED` | Enable edge runtime logging | `true` |
| **Output Settings** | | |
| `NEXLOG_STRUCTURED` | JSON structured logging | `false` |
| `NEXLOG_COLORS` | Colored console output | `true` |
| `NEXLOG_NAMESPACE` | Default namespace | - |
| **Performance** | | |
| `NEXLOG_SAMPLING_RATE` | Log sampling (0-1) | `1` |
| `NEXLOG_BATCH_SIZE` | Batch size | `100` |
| `NEXLOG_FLUSH_INTERVAL` | Flush interval (ms) | `1000` |
| **Features** | | |
| `NEXLOG_DEV_TOOLS` | Enable DevTools in prod | `false` |
| `NEXLOG_LIFECYCLE` | Log app lifecycle | `true` |
| `NEXLOG_PERFORMANCE` | Include perf metrics | `false` |
| `NEXLOG_STACK_TRACES` | Include stack traces | `true` |
| **Filtering** | | |
| `NEXLOG_INCLUDE_PATTERNS` | Include regex patterns | - |
| `NEXLOG_EXCLUDE_PATTERNS` | Exclude regex patterns | - |
| **Context** | | |
| `NEXLOG_CONTEXT_*` | Add to log context | - |

### Dynamic Context

Add any context to all logs via environment variables:

```env
NEXLOG_CONTEXT_VERSION=1.0.0
NEXLOG_CONTEXT_ENVIRONMENT=production
NEXLOG_CONTEXT_REGION=us-west-2
NEXLOG_CONTEXT_SERVICE=api
```

All logs will include: `{version: "1.0.0", environment: "production", ...}`

### Priority System

Configuration follows this priority (highest wins):
1. Runtime changes (`logger.setLevel()`)
2. Environment variables (`NEXLOG_*`)
3. Code configuration (`new Logger({...})`)
4. Default values

### Programmatic Access

```typescript
import { configManager, ENV_VARS } from 'nexlog';

// Check current configuration
const config = configManager.getConfig();
console.log('Current log level:', config.level);

// Check if should log in current environment
if (configManager.shouldLog('browser')) {
  console.log('Browser logging is enabled');
}

// Runtime configuration changes
configManager.set('level', 'debug');
configManager.set('samplingRate', 0.5);

// Get environment variable names
console.log(ENV_VARS.NEXLOG_LEVEL); // "NEXLOG_LEVEL"
```

## 🔧 Configuration with Next.js

For Next.js applications, add nexlog to transpilePackages:

```javascript
// next.config.js
const nextConfig = {
  transpilePackages: ["nexlog"],
};

export default nextConfig;
```

## 🎨 API Reference

### Logger Class

```typescript
class Logger {
  constructor(config?: LoggerConfig)
  
  // Logging methods
  trace(message: string, metadata?: LogMetadata): void
  debug(message: string, metadata?: LogMetadata): void
  info(message: string, metadata?: LogMetadata): void
  warn(message: string, metadata?: LogMetadata): void
  error(message: string, metadata?: LogMetadata): void
  fatal(message: string, metadata?: LogMetadata): void
  
  // Configuration
  setLevel(level: LogLevel): void
  getLevel(): LogLevel
  enable(): void
  disable(): void
  isEnabled(): boolean
  setSSROnly(ssrOnly: boolean): void
  setContext(context: LogMetadata): void
  
  // Child loggers
  child(namespace: string, config?: Partial<LoggerConfig>): Logger
  
  // Transports
  addTransport(transport: Transport): void
  removeTransport(name: string): void
  
  // Plugins
  use(plugin: LoggerPlugin): void
  
  // Performance
  time<T>(label: string, fn: () => T | Promise<T>, metadata?: LogMetadata): Promise<T>
  profile(label: string): () => void
  
  // Utilities
  flush(): Promise<void>
  getStats(): LoggerStats
}
```

### Types

```typescript
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
type Environment = "server" | "edge" | "browser" | "unknown";
type LogMetadata = Record<string, unknown>;

interface LoggerConfig {
  level?: LogLevel;
  enabled?: boolean;
  ssrOnly?: boolean;
  namespace?: string;
  context?: LogMetadata;
  batchSize?: number;
  flushInterval?: number;
  transports?: Transport[];
  structured?: boolean;
  samplingRate?: number;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  namespace?: string;
  metadata?: LogMetadata;
  context?: LogMetadata;
  environment: Environment;
  stack?: string;
  performance?: {
    memory?: NodeJS.MemoryUsage;
    timestamp: number;
  };
}

interface Transport {
  name: string;
  enabled?: boolean;
  level?: LogLevel;
  log(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
}

interface LoggerPlugin {
  name: string;
  init?(logger: Logger): void;
  transform?(entry: LogEntry): LogEntry;
  beforeLog?(entry: LogEntry): void | false;
  afterLog?(entry: LogEntry): void;
}
```

## 🚀 Performance

nexlog is designed for maximum performance with Bun:

- **Zero dependencies** - No external dependencies for minimal bundle size
- **Bun-optimized** - Leverages Bun's fast runtime and APIs
- **Lazy evaluation** - Logs are only formatted when needed
- **Batching support** - Reduce I/O overhead with batched writes
- **Sampling** - Control log volume in high-traffic scenarios
- **Efficient child loggers** - Cached instances with shared configuration
- **Minimal overhead** - Disabled logs have near-zero performance impact
- **High-precision timing** - Uses Bun.nanoseconds() for accurate measurements

Benchmark results with Bun (10,000 logs):
- **Simple logging**: ~80,000 ops/sec
- **With metadata**: ~65,000 ops/sec  
- **Child logger creation**: 15,000+ ops/sec
- **Batched logging**: ~120,000 ops/sec

## 🧪 Testing

```bash
# Run tests with Bun's built-in test runner
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage

# Test environment configuration
bun run test-env.ts
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 💖 Support

If you find nexlog helpful, consider [sponsoring me](https://github.com/sponsors/Arakiss). Your support helps maintain and improve this project.

## 🔄 Migration from v3.x

The new v4.0 includes breaking changes but provides a compatibility layer:

```typescript
// Old API (v3.x) - still works
import logger from 'nexlog';
logger.info('Hello');

// New API (v4.0) - recommended
import { Logger } from 'nexlog';
const logger = new Logger({ 
  level: 'info',
  transports: [new ConsoleTransport()]
});
logger.info('Hello');
```

Key improvements in v4.0:
- Class-based architecture for better extensibility
- Transport system for flexible log output
- Plugin system for custom functionality
- Batching and performance optimizations
- Enhanced React integration with new hooks
- Full TypeScript rewrite with better types
- Structured logging support
- Performance monitoring utilities