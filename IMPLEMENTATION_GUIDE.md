# Nexlog Implementation Guide

**Version 5.2.1+ Production Implementation Guide**

This guide provides comprehensive instructions for implementing nexlog in production environments, with focus on security, performance, and compliance.

## Table of Contents

- [Quick Start](#quick-start)
- [Edge Runtime Implementation](#edge-runtime-implementation)
- [Security & Data Sanitization](#security--data-sanitization)
- [Distributed Tracing](#distributed-tracing)
- [Performance Optimization](#performance-optimization)
- [Environment Configuration](#environment-configuration)
- [Production Patterns](#production-patterns)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Installation

```bash
# Using npm
npm install nexlog

# Using yarn
yarn add nexlog

# Using pnpm
pnpm add nexlog

# Using bun
bun add nexlog
```

### Basic Setup

```typescript
// lib/logger.ts
import { Logger } from 'nexlog';
import { defaultSanitizer } from 'nexlog/sanitizer';

export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  structured: process.env.NODE_ENV === 'production',
  sanitize: true, // Enable automatic data sanitization
});

export default logger;
```

## Edge Runtime Implementation

### Next.js Middleware (Edge Runtime)

Edge Runtime compatibility is a key feature of v5.2.1+. Here's how to implement it:

```typescript
// middleware.ts
import { EdgeLogger } from 'nexlog/edge';
import { NextRequest, NextResponse } from 'next/server';

const logger = new EdgeLogger({
  structured: true,
  sanitize: true,
  level: 'info',
});

export async function middleware(request: NextRequest) {
  const start = performance.now();
  
  // Extract correlation IDs from headers
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const traceId = request.headers.get('x-trace-id') || crypto.randomUUID();
  
  logger.info('Request received', {
    requestId,
    traceId,
    method: request.method,
    pathname: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent'),
  });

  const response = NextResponse.next();
  
  // Add correlation headers to response
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-trace-id', traceId);
  
  const duration = performance.now() - start;
  logger.info('Request completed', {
    requestId,
    traceId,
    duration: `${duration.toFixed(2)}ms`,
    status: response.status,
  });

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Vercel Edge Functions

```typescript
// api/edge-function.ts
import { EdgeLogger } from 'nexlog/edge';

const logger = new EdgeLogger({
  structured: true,
  sanitize: true,
});

export default async function handler(request: Request) {
  const requestId = crypto.randomUUID();
  
  logger.info('Edge function invoked', {
    requestId,
    url: request.url,
    method: request.method,
  });
  
  try {
    const data = await processRequest(request);
    
    logger.success('Edge function completed', {
      requestId,
      dataSize: JSON.stringify(data).length,
    });
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
    });
  } catch (error) {
    logger.error('Edge function failed', {
      requestId,
      error, // Automatically serialized with cause chain
    });
    
    return new Response('Internal Server Error', { status: 500 });
  }
}

export const config = {
  runtime: 'edge',
};
```

### Troubleshooting Edge Runtime Issues

**Common Issues and Solutions:**

1. **AsyncLocalStorage not available in Edge Runtime**
   ```typescript
   // ✅ Use EdgeLogger instead of regular Logger
   import { EdgeLogger } from 'nexlog/edge';
   
   // ❌ Don't use AsyncLocalStorage features in edge
   import { contextManager } from 'nexlog/context'; // Won't work in edge
   ```

2. **File system access not available**
   ```typescript
   // ✅ Use structured logging with external services
   const logger = new EdgeLogger({
     structured: true,
     // Send logs to external service via fetch()
   });
   ```

3. **Node.js APIs not available**
   ```typescript
   // ✅ Edge Runtime provides Web APIs
   const requestId = crypto.randomUUID(); // ✅ Available in edge
   const timestamp = performance.now();   // ✅ Available in edge
   ```

## Security & Data Sanitization

### Automatic Data Sanitization

nexlog v5.2.1+ includes automatic GDPR-compliant data sanitization:

```typescript
import logger from 'nexlog';

// This data is automatically sanitized
logger.info('User registration', {
  email: 'user@example.com',        // → us***@example.com
  password: 'secret123',            // → [REDACTED]
  creditCard: '4532123456789012',   // → ****9012
  apiKey: 'sk_live_xyz123',         // → [REDACTED]
  ssn: '123-45-6789',              // → [REDACTED]
  phone: '+1-555-123-4567',        // → ****4567
  ipAddress: '192.168.1.1',        // → 192.***.***.***
  jwt: 'eyJ0eXAiOiJKV1QiLCJhbGc', // → [JWT_REDACTED]
  // Non-sensitive data is preserved
  userId: 12345,
  timestamp: Date.now(),
  action: 'register',
});
```

### Custom Sanitization Rules

```typescript
import { defaultSanitizer } from 'nexlog/sanitizer';

// Add custom patterns
defaultSanitizer.addPattern('custom-token', {
  pattern: /CUSTOM_[A-Z0-9]{20}/g,
  replacement: '[CUSTOM_TOKEN_REDACTED]',
});

defaultSanitizer.addPattern('transaction-id', {
  pattern: /^txn_[a-zA-Z0-9]+$/,
  replacement: (value: string) => `txn_***${value.slice(-4)}`,
  fields: ['transactionId'], // Only apply to specific fields
});

// Add fields to always mask
defaultSanitizer.addMaskField('internalSecret');
defaultSanitizer.addMaskField('encryptionKey');
```

### Client/Server Security Separation

```typescript
// server-logger.ts - Server-side only
import { Logger } from 'nexlog';

export const serverLogger = new Logger({
  level: 'debug',
  structured: true,
  sanitize: true,
  // Full feature set available on server
});

// client-logger.ts - Client-safe
import { Logger } from 'nexlog/browser';

export const clientLogger = new Logger({
  level: 'warn', // Higher threshold for client
  structured: true,
  sanitize: true,
  maxLevel: 'warn', // Never send debug/trace to client
});
```

```typescript
// api/route.ts - Server-side
import { serverLogger } from '@/lib/server-logger';

export async function POST(request: Request) {
  // This includes sensitive data but is sanitized
  serverLogger.info('API request', {
    authorization: request.headers.get('authorization'), // → [REDACTED]
    body: await request.json(),
  });
}
```

```typescript
// components/Button.tsx - Client-side
'use client';
import { clientLogger } from '@/lib/client-logger';

export default function Button() {
  const handleClick = () => {
    // Only safe, non-sensitive data reaches the client
    clientLogger.info('Button clicked', {
      timestamp: Date.now(),
      buttonId: 'submit-form',
    });
  };
}
```

## Distributed Tracing

### W3C Trace Context Implementation

```typescript
import { correlationManager } from 'nexlog/correlation';
import { context } from 'nexlog/context';

// Express.js middleware
app.use(correlationManager.middleware());

// Next.js API route
export async function POST(request: Request) {
  // Extract trace context from headers
  const traceContext = correlationManager.extractFromHeaders(
    Object.fromEntries(request.headers.entries())
  );
  
  return context()
    .withMultiple(traceContext)
    .withRequestId(traceContext.requestId || crypto.randomUUID())
    .runAsync(async () => {
      logger.info('Processing payment', {
        amount: 100,
        currency: 'USD',
        // traceId, spanId, requestId automatically included
      });
      
      // Create child span for external API call
      const childContext = correlationManager.createChildSpan();
      
      return context().withMultiple(childContext).runAsync(async () => {
        logger.info('Calling payment provider');
        const result = await callPaymentProvider();
        logger.success('Payment provider response received');
        return result;
      });
    });
}
```

### Custom Correlation Context

```typescript
import { context, contextManager } from 'nexlog/context';

// Create rich context
const requestContext = context()
  .withRequestId(crypto.randomUUID())
  .withUserId(user.id)
  .withSessionId(session.id)
  .with('operation', 'checkout')
  .with('version', '5.2.1')
  .with('region', 'us-east-1')
  .build();

// Use context for entire operation
contextManager.runAsync(requestContext, async () => {
  logger.info('Starting checkout process');
  
  const cart = await getCart();
  logger.debug('Cart retrieved', { items: cart.items.length });
  
  const payment = await processPayment(cart);
  logger.success('Payment processed', { 
    paymentId: payment.id,
    amount: payment.amount,
  });
  
  // All logs above include: requestId, userId, sessionId, operation, version, region
});
```

## Performance Optimization

### High-Volume Logging Configuration

```typescript
import { Logger } from 'nexlog';
import { AdvancedSampler, RateLimiter } from 'nexlog/utils';

const sampler = new AdvancedSampler({
  trace: 0.01,    // 1% of trace logs
  debug: 0.05,    // 5% of debug logs
  info: 0.1,      // 10% of info logs
  warn: 1.0,      // All warning logs
  error: 1.0,     // All error logs
  fatal: 1.0,     // All fatal logs
});

const rateLimiter = new RateLimiter({
  maxLogs: 1000,      // Maximum 1000 logs
  windowMs: 60000,    // Per minute
});

export const highVolumeLogger = new Logger({
  level: 'info',
  structured: true,
  sanitize: true,
  sampler,
  rateLimiter,
  
  // Memory optimization
  bufferSize: 1000,    // Circular buffer size
  autoFlush: true,     // Automatic memory cleanup
  maxBatchSize: 100,   // Batch size for performance
  flushInterval: 5000, // Flush every 5 seconds
});
```

### Per-Message Rate Limiting

```typescript
// High-frequency events with specific rate limits
logger.debug('Cache hit', {
  key: 'user:123',
  _rateLimit: '10/minute', // Only log 10 cache hits per minute
});

logger.info('API call', {
  endpoint: '/api/users',
  _rateLimit: '100/minute', // Different rate limit per message type
  _sample: 0.1,             // Sample 10% of these logs
});
```

### Memory Leak Prevention

```typescript
import { CircularBuffer } from 'nexlog/utils';

// Use circular buffers for high-volume logging
const buffer = new CircularBuffer(1000); // Keep last 1000 entries

const logger = new Logger({
  buffer,
  autoFlush: true,    // Prevent memory buildup
  maxBufferSize: 1000, // Automatic buffer rotation
});
```

## Environment Configuration

### Production Environment Variables

```bash
# .env.production
NEXLOG_LEVEL=info
NEXLOG_STRUCTURED=true
NEXLOG_SANITIZE=true
NEXLOG_EDGE_ENABLED=true

# Performance settings
NEXLOG_SAMPLING_TRACE=0.01
NEXLOG_SAMPLING_DEBUG=0.05
NEXLOG_SAMPLING_INFO=0.1
NEXLOG_RATE_LIMIT_MAX=1000
NEXLOG_RATE_LIMIT_WINDOW=60000

# Context settings
NEXLOG_CONTEXT_SERVICE=api-server
NEXLOG_CONTEXT_VERSION=5.2.1
NEXLOG_CONTEXT_REGION=us-east-1
NEXLOG_CONTEXT_ENVIRONMENT=production

# Security settings
NEXLOG_CLIENT_MAX_LEVEL=warn
NEXLOG_MASK_FIELDS=internalToken,secretKey,encryptionKey
```

### Development Environment Variables

```bash
# .env.development
NEXLOG_LEVEL=trace
NEXLOG_STRUCTURED=false
NEXLOG_COLORS=true
NEXLOG_PRETTY_PRINT=true
NEXLOG_EMOJI=true
NEXLOG_TIMESTAMPS=relative
NEXLOG_SANITIZE=false

# Development features
NEXLOG_DEV_TOOLS=true
NEXLOG_PERFORMANCE_METRICS=true
NEXLOG_STACK_TRACES=true
```

### Staging Environment Variables

```bash
# .env.staging
NEXLOG_LEVEL=debug
NEXLOG_STRUCTURED=true
NEXLOG_SANITIZE=true
NEXLOG_SAMPLING_TRACE=0.1
NEXLOG_SAMPLING_DEBUG=0.5
NEXLOG_CONTEXT_ENVIRONMENT=staging
```

## Production Patterns

### Microservices Pattern

```typescript
// service-logger.ts
import { Logger } from 'nexlog';
import { correlationManager } from 'nexlog/correlation';

const serviceName = process.env.SERVICE_NAME || 'unknown-service';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';

export const serviceLogger = new Logger({
  level: 'info',
  structured: true,
  sanitize: true,
  context: {
    service: serviceName,
    version: serviceVersion,
    region: process.env.AWS_REGION,
    pod: process.env.HOSTNAME,
  },
});

// HTTP client with correlation propagation
export async function httpCall(url: string, options: RequestInit = {}) {
  const headers = correlationManager.injectIntoHeaders(
    options.headers as Record<string, string> || {}
  );
  
  serviceLogger.info('Outbound HTTP request', {
    url,
    method: options.method || 'GET',
  });
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  serviceLogger.info('Outbound HTTP response', {
    url,
    status: response.status,
    duration: response.headers.get('x-response-time'),
  });
  
  return response;
}
```

### Error Handling Pattern

```typescript
import { ErrorSerializer } from 'nexlog/utils';

export async function handleRequest(request: Request) {
  try {
    logger.info('Processing request', {
      url: request.url,
      method: request.method,
    });
    
    const result = await processBusinessLogic(request);
    
    logger.success('Request completed successfully', {
      url: request.url,
      resultSize: JSON.stringify(result).length,
    });
    
    return Response.json(result);
    
  } catch (error) {
    // Comprehensive error logging with cause chain
    const serializedError = ErrorSerializer.serialize(error);
    
    logger.error('Request failed', {
      url: request.url,
      error: serializedError,
      errorName: serializedError.name,
      rootCause: ErrorSerializer.getRootCause(serializedError),
    });
    
    // Check for specific error types
    if (ErrorSerializer.hasCauseOfType(serializedError, 'ValidationError')) {
      return Response.json({ error: 'Validation failed' }, { status: 400 });
    }
    
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Database Integration Pattern

```typescript
import { context } from 'nexlog/context';

export class DatabaseService {
  async findUser(id: string) {
    return context()
      .with('operation', 'db:findUser')
      .with('table', 'users')
      .runAsync(async () => {
        const start = performance.now();
        
        logger.debug('Database query started', { userId: id });
        
        try {
          const user = await db.user.findUnique({ where: { id } });
          const duration = performance.now() - start;
          
          logger.info('Database query completed', {
            userId: id,
            found: !!user,
            duration: `${duration.toFixed(2)}ms`,
          });
          
          return user;
        } catch (error) {
          const duration = performance.now() - start;
          
          logger.error('Database query failed', {
            userId: id,
            duration: `${duration.toFixed(2)}ms`,
            error,
          });
          
          throw error;
        }
      });
  }
}
```

### Background Job Pattern

```typescript
import { context } from 'nexlog/context';

export async function processJob(job: Job) {
  const jobContext = context()
    .withRequestId(`job_${job.id}`)
    .with('jobType', job.type)
    .with('jobId', job.id)
    .with('attempt', job.attemptsMade + 1);
  
  return jobContext.runAsync(async () => {
    const start = performance.now();
    
    logger.info('Job started', {
      data: job.data,
      priority: job.opts.priority,
    });
    
    try {
      const result = await executeJobLogic(job);
      const duration = performance.now() - start;
      
      logger.success('Job completed', {
        duration: `${duration.toFixed(2)}ms`,
        result: typeof result,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      logger.error('Job failed', {
        duration: `${duration.toFixed(2)}ms`,
        error,
        willRetry: job.attemptsMade < job.opts.attempts,
      });
      
      throw error;
    }
  });
}
```

## Troubleshooting

### Common Issues

#### 1. Edge Runtime Compatibility

**Problem**: `AsyncLocalStorage` not available in Edge Runtime

**Solution**: Use Edge-specific logger and context management
```typescript
// ❌ Don't use in Edge Runtime
import { contextManager } from 'nexlog/context';

// ✅ Use Edge-compatible approach
import { EdgeLogger } from 'nexlog/edge';
const logger = new EdgeLogger();

// Pass context explicitly
logger.info('Message', {
  requestId: 'req_123',
  traceId: 'trace_456',
});
```

#### 2. Performance Issues with High Volume

**Problem**: Logging slowing down application

**Solution**: Implement sampling and rate limiting
```typescript
import { AdvancedSampler, RateLimiter } from 'nexlog/utils';

const logger = new Logger({
  sampler: new AdvancedSampler({
    debug: 0.1,  // Only log 10% of debug messages
    info: 0.5,   // Only log 50% of info messages
  }),
  rateLimiter: new RateLimiter({
    maxLogs: 100,
    windowMs: 1000, // 100 logs per second max
  }),
});
```

#### 3. Memory Leaks

**Problem**: Memory usage growing over time

**Solution**: Enable auto-flush and use circular buffers
```typescript
import { CircularBuffer } from 'nexlog/utils';

const logger = new Logger({
  buffer: new CircularBuffer(1000),
  autoFlush: true,
  maxBufferSize: 1000,
  flushInterval: 5000,
});
```

#### 4. Sensitive Data in Logs

**Problem**: Accidentally logging sensitive information

**Solution**: Enable auto-sanitization and add custom patterns
```typescript
import { defaultSanitizer } from 'nexlog/sanitizer';

// Enable automatic sanitization
const logger = new Logger({
  sanitize: true,
});

// Add custom sensitive patterns
defaultSanitizer.addMaskField('customSecret');
defaultSanitizer.addPattern('api-key', {
  pattern: /api_key_[a-zA-Z0-9]+/g,
  replacement: '[API_KEY_REDACTED]',
});
```

#### 5. Context Not Propagating

**Problem**: Context not available in async operations

**Solution**: Ensure proper context usage
```typescript
import { context } from 'nexlog/context';

// ✅ Correct: wrap the entire async operation
context()
  .withRequestId('req_123')
  .runAsync(async () => {
    logger.info('Start operation');
    await someAsyncOperation();  // Context available here
    logger.info('End operation'); // Context available here
  });

// ❌ Incorrect: context lost in async operation
context().withRequestId('req_123').run(() => {
  logger.info('Start operation');
  setTimeout(() => {
    logger.info('This won\'t have context'); // Context lost
  }, 1000);
});
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Enable debug logging
export NEXLOG_DEBUG=true
export NEXLOG_LEVEL=trace

# Show internal nexlog operations
export NEXLOG_INTERNAL_DEBUG=true
```

### Health Check Endpoint

Implement a health check to monitor logging system:

```typescript
// api/health/logging/route.ts
import logger from '@/lib/logger';

export async function GET() {
  try {
    const start = performance.now();
    
    // Test basic logging
    logger.info('Health check - logging test');
    
    const duration = performance.now() - start;
    
    // Get logger statistics
    const stats = logger.getStats();
    
    return Response.json({
      status: 'healthy',
      logging: {
        duration: `${duration.toFixed(2)}ms`,
        stats,
        features: {
          sanitization: true,
          correlation: true,
          edgeRuntime: true,
        },
      },
    });
  } catch (error) {
    return Response.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### Migration Checklist

When upgrading to v5.2.1+:

- [ ] **Update imports**: Switch to new entry points if needed
- [ ] **Enable sanitization**: Set `sanitize: true` in logger config
- [ ] **Configure Edge Runtime**: Use `EdgeLogger` for middleware
- [ ] **Set up context**: Implement correlation IDs for distributed tracing
- [ ] **Review security**: Ensure sensitive data is properly masked
- [ ] **Test performance**: Verify sampling and rate limiting work as expected
- [ ] **Update environment variables**: Add new v5.2.1+ configuration options
- [ ] **Monitor memory usage**: Enable auto-flush and circular buffers
- [ ] **Validate compliance**: Ensure GDPR requirements are met

---

For additional support, visit our [GitHub Issues](https://github.com/Arakiss/nexlog/issues) or check the main [README](./README.md) for feature overview.