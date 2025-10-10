# nexlog

A modern, enterprise-grade logging library for Next.js with **Edge Runtime support**, **automatic data sanitization**, and **distributed tracing**. Built for production-scale applications with GDPR compliance, correlation IDs, and zero-configuration security.

![CI/CD](https://github.com/Arakiss/nexlog/actions/workflows/ci-cd.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/nexlog.svg)
![License](https://img.shields.io/npm/l/nexlog.svg)
![Edge Runtime](https://img.shields.io/badge/Edge%20Runtime-✅-success.svg)
![GDPR](https://img.shields.io/badge/GDPR-Compliant-blue.svg)

## ✨ Key Features

### 🚀 Edge Runtime & Production Ready
- 🌐 **Edge Runtime Compatible** - Works seamlessly in Next.js middleware, Vercel Edge Functions, Cloudflare Workers
- 🛡️ **Automatic Data Sanitization** - GDPR-compliant PII protection with smart field detection
- 🔗 **Correlation IDs** - W3C Trace Context standard for distributed tracing
- ⚡ **Advanced Error Serialization** - Proper cause chain support with circular reference handling
- 💨 **Performance Optimized** - Memory leak prevention, circular buffers, and efficient batching
- 🚦 **Rate Limiting & Sampling** - Enterprise-grade volume control with per-level configuration

### 🔒 Security & Compliance
- 🔐 **Client/Server Separation** - Clear patterns for secure logging architectures
- 🏷️ **Smart Data Masking** - Auto-detects passwords, tokens, emails, credit cards, and more
- 📊 **Context Management** - AsyncLocalStorage-based context persistence in Node.js
- 🔍 **Smart Module Detection** - Auto-namespacing from stack traces for better debugging

### 🎨 Developer Experience
- 🎯 **Pretty Print Formatter** - Beautiful development console output with emojis
- 🔄 **Zero Configuration** - Works out-of-the-box with intelligent defaults
- 🌍 **Universal Runtime** - Server, browser, edge, Node.js, Bun - everything works
- 💪 **TypeScript First** - Full type safety and IntelliSense support
- ⚛️ **React Integration** - Hooks, providers, and components for React apps
- 🎛️ **Dynamic Configuration** - Runtime adjustments via environment variables

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

### Edge Runtime Compatible (Next.js Middleware)

```typescript
// middleware.ts - Works in Edge Runtime!
import { EdgeLogger } from 'nexlog/edge';

const logger = new EdgeLogger({
  structured: true,
  sanitize: true, // Auto-mask sensitive data
});

export function middleware(request: NextRequest) {
  logger.info('Request received', {
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    // PII automatically sanitized!
    email: 'user@example.com', // → us***@example.com
    password: 'secret123', // → [REDACTED]
  });
}
```

### Server-Side with Context & Correlation

```typescript
// app/api/users/route.ts
import logger from 'nexlog';
import { context } from 'nexlog/context';

export async function POST(request: Request) {
  return context()
    .withRequestId(crypto.randomUUID())
    .withUserId(await getUserId(request))
    .runAsync(async () => {
      logger.info('Creating user', {
        email: await request.json().email, // Auto-sanitized
      });
      
      const user = await createUser(data);
      logger.success('User created successfully', { userId: user.id });
      
      return Response.json(user);
    });
}
```

### Client-Side (Secure by Default)

```typescript
// Only non-sensitive logs reach the client
import logger from 'nexlog';

// This will be filtered out on client
logger.debug('Debug info with API key', { apiKey: 'sk_test_123' });

// This reaches the client safely
logger.info('User action', { action: 'button_click', page: '/dashboard' });
```

## 🏗️ Production Configuration

### High-Volume Application Setup

```typescript
import { Logger } from 'nexlog';
import { defaultSanitizer } from 'nexlog/sanitizer';

const logger = new Logger({
  level: 'info',
  structured: true,
  sanitize: true,
  
  // Performance optimizations
  sampling: {
    trace: 0.01,    // 1% of trace logs
    debug: 0.1,     // 10% of debug logs
    info: 1.0,      // All info logs
  },
  
  // Rate limiting
  rateLimit: {
    maxLogs: 1000,  // Max 1000 logs per minute
    windowMs: 60000,
  },
  
  // Memory management
  bufferSize: 1000,
  autoFlush: true,
});

// Add custom sanitization rules
defaultSanitizer.addPattern('custom-token', {
  pattern: /token_[a-zA-Z0-9]+/g,
  replacement: '[TOKEN_REDACTED]',
});
```

### Environment-Based Configuration

```bash
# .env.production
NEXLOG_LEVEL=warn
NEXLOG_STRUCTURED=true
NEXLOG_SANITIZE=true
NEXLOG_EDGE_ENABLED=true
NEXLOG_SAMPLING_INFO=0.1
NEXLOG_CONTEXT_SERVICE=api
NEXLOG_CONTEXT_VERSION=5.2.1
```

## 🔥 Advanced Features

### Distributed Tracing & Correlation

Track requests across your entire application:

```typescript
import { correlationManager } from 'nexlog/correlation';
import { contextManager } from 'nexlog/context';

// Middleware automatically extracts trace context
app.use(correlationManager.middleware());

// In your route handlers - correlation IDs are automatically included
logger.info('Processing payment', { 
  amount: 100,
  // requestId, traceId, spanId automatically added from context
});

// Create child spans for operations
const childContext = correlationManager.createChildSpan();
contextManager.run(childContext, () => {
  logger.info('Calling external API'); // New span ID
});
```

### Smart Data Sanitization

Built-in GDPR compliance with intelligent field detection:

```typescript
import { sanitize, defaultSanitizer } from 'nexlog/sanitizer';

// Automatic detection of sensitive fields
logger.info('User data', {
  email: 'user@example.com',     // → us***@example.com
  password: 'secret123',         // → [REDACTED]
  creditCard: '4532123456789012', // → ****9012
  apiKey: 'sk_live_xyz123',      // → [REDACTED]
  ssn: '123-45-6789',           // → [REDACTED]
});

// Custom sanitization rules
defaultSanitizer.addPattern('custom', {
  pattern: /CUSTOM_[A-Z0-9]+/g,
  replacement: '[CUSTOM_REDACTED]',
});
```

### Context Management & AsyncLocalStorage

Persistent context across async operations:

```typescript
import { context, contextManager } from 'nexlog/context';

// Express middleware
app.use((req, res, next) => {
  context()
    .withRequestId(req.id)
    .withUserId(req.user?.id)
    .withSessionId(req.session.id)
    .run(() => next());
});

// Anywhere in your request handler
logger.info('User action'); // Automatically includes requestId, userId, sessionId

// Manual context management
contextManager.run({ requestId: '123', operation: 'checkout' }, () => {
  logger.info('Starting checkout'); // Context automatically included
  processPayment(); // Context propagated to child calls
});
```

### Advanced Error Serialization

Proper error handling with cause chains:

```typescript
import { ErrorSerializer } from 'nexlog/utils';

try {
  await riskyOperation();
} catch (error) {
  // Automatically serializes error chains, stack traces, and custom properties
  logger.error('Operation failed', { 
    error, // Full error serialization with cause chain
    operation: 'user_signup',
  });
  
  // Manual serialization
  const serialized = ErrorSerializer.serialize(error);
  console.log(serialized.stack); // Parsed stack frames
  console.log(serialized.cause); // Cause chain
}
```

### Performance & Rate Limiting

Enterprise-grade volume control:

```typescript
import { RateLimiter, AdvancedSampler } from 'nexlog/utils';

// Per-level sampling
const sampler = new AdvancedSampler({
  trace: 0.01,  // 1% of trace logs
  debug: 0.1,   // 10% of debug logs  
  info: 1.0,    // All info logs
  error: 1.0,   // All error logs
});

// Rate limiting
const rateLimiter = new RateLimiter({
  maxLogs: 100,
  windowMs: 60000, // 100 logs per minute
});

// Per-message rate limiting
logger.info('High frequency event', {
  _rateLimit: '5/minute', // Only log this message 5 times per minute
  _sample: 0.1,          // Only sample 10% of these logs
});
```

### Pretty Print Development Mode

Beautiful console output during development:

```typescript
import { PrettyFormatter } from 'nexlog/formatters';

const formatter = new PrettyFormatter({
  colors: true,
  emoji: true,           // Use emoji for log levels
  timestamps: 'relative', // Show relative timestamps
  groupCollapsed: true,   // Collapse metadata groups
});

// Development logger with pretty printing
const devLogger = new Logger({
  formatter: process.env.NODE_ENV === 'development' ? formatter : undefined,
});
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

## 🌍 Runtime Environment Support

Universal compatibility across all JavaScript runtimes:

```typescript
import { detectRuntime, IS_EDGE, IS_NODE, IS_BROWSER } from 'nexlog';

// Automatic runtime detection and optimization
console.log(detectRuntime()); // 'node' | 'edge' | 'browser' | 'worker' | 'bun'

// Edge Runtime (Vercel Edge Functions, Cloudflare Workers)
if (IS_EDGE) {
  // Optimized for edge with structured logging
  import('nexlog/edge').then(({ EdgeLogger }) => {
    const logger = new EdgeLogger({ structured: true });
  });
}

// Node.js (full feature set)
if (IS_NODE) {
  // Full features including AsyncLocalStorage context
  import('nexlog').then(({ Logger }) => {
    const logger = new Logger({ 
      useAsyncContext: true,
      colors: true,
    });
  });
}

// Browser (security-focused)
if (IS_BROWSER) {
  // Client-safe logging with automatic sensitive data filtering
  import('nexlog/browser').then(({ default: logger }) => {
    logger.setLevel('warn'); // Don't send debug info to client
  });
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

## 🔧 Next.js Integration

### Edge Runtime Configuration

```javascript
// next.config.js
const nextConfig = {
  // No transpilePackages needed for v5.2.1+!
  experimental: {
    runtime: 'edge', // nexlog works seamlessly
  },
};

export default nextConfig;
```

### Security Best Practices

```typescript
// app/api/secure/route.ts - Server-side only
import logger from 'nexlog';

export async function POST(request: Request) {
  // This will be automatically sanitized
  logger.info('API call', {
    apiKey: request.headers.get('authorization'), // → [REDACTED]
    userId: getUserId(request),
    timestamp: Date.now(),
  });
}
```

```typescript
// app/components/ClientComponent.tsx - Client-safe
'use client';
import logger from 'nexlog';

export default function ClientComponent() {
  const handleClick = () => {
    // Only non-sensitive logs reach the client
    logger.info('Button clicked', { 
      button: 'submit',
      timestamp: Date.now(),
      // Any sensitive data is automatically filtered
    });
  };
}
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

## 🚨 Security & Compliance

### GDPR Compliance

nexlog automatically protects personally identifiable information:

- **Email addresses**: `user@example.com` → `us***@example.com`
- **Credit cards**: `4532123456789012` → `****9012`
- **API keys**: `sk_live_xyz123` → `[REDACTED]`
- **Passwords**: Any field named `password`, `pass`, `pwd` → `[REDACTED]`
- **Tokens**: `access_token`, `refresh_token`, etc. → `[REDACTED]`

### Client/Server Security Separation

```typescript
// Server-side: Full logging with sensitive data sanitization
import logger from 'nexlog'; // Full server logger

// Client-side: Automatically filtered logging
import logger from 'nexlog/browser'; // Client-safe logger
```

## 📚 Documentation

For comprehensive production implementation guidance, see our [**Implementation Guide**](./IMPLEMENTATION_GUIDE.md).

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 💖 Support

If you find nexlog helpful, consider [sponsoring me](https://github.com/sponsors/Arakiss). Your support helps maintain and improve this project.

## 🔄 Migration Guide

### From v4.x to v5.2.1+

The v5.2.1+ release is backward compatible with enhanced features:

```typescript
// v4.x code still works
import logger from 'nexlog';
logger.info('Hello');

// v5.2.1+ enhanced features
import logger from 'nexlog';
import { context } from 'nexlog/context';

// Now with automatic data sanitization and context
context()
  .withRequestId('req_123')
  .run(() => {
    logger.info('Hello', {
      password: 'secret123', // → [REDACTED]
      userId: 12345,         // → preserved
    });
  });
```

Key improvements in v5.2.1+:
- **Edge Runtime compatibility** for Next.js middleware
- **Automatic data sanitization** with GDPR compliance
- **Correlation IDs** with W3C Trace Context support
- **Advanced error serialization** with cause chains
- **Performance improvements** with memory leak prevention
- **Context management** with AsyncLocalStorage
- **Security by default** with client/server separation