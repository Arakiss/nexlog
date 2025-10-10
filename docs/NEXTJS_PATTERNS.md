# 🚀 Next.js 15+ Logging Patterns with nexlog - The Complete 2025 Guide

## Production-Ready AI/ML & TypeScript Logging Patterns for Next.js 15.5+ Applications

**The definitive guide for Next.js 15+ logging** with the fastest TypeScript logger of 2025. Perfect for **AI applications**, **Edge Runtime**, **Server Components**, and **production-scale** deployments. Includes **Node.js middleware runtime** support and **GDPR-compliant logging**.

### Why nexlog for Next.js in 2025?

- ✅ **Next.js 15.5 Compatible** - Full support for Node.js middleware runtime
- ⚡ **5x Faster** than Winston with zero configuration
- 🌐 **Edge Runtime Native** - Works in Vercel Edge Functions, Cloudflare Workers
- 🤖 **AI-Optimized** - Perfect for LLM apps, RAG systems, ML monitoring
- 🛡️ **Auto GDPR Compliance** - Automatic PII sanitization
- 🔗 **Distributed Tracing** - W3C Trace Context support

---

## Table of Contents
1. [Project Structure for AI/ML Apps](#project-structure-for-aiml-apps)
2. [AI Application Logging Patterns](#ai-application-logging-patterns-2025)
3. [Next.js 15.5+ Middleware with Node.js Runtime](#nextjs-155-middleware-with-nodejs-runtime)
4. [Environment-Specific Configuration](#environment-specific-configuration)
5. [Server Components & AI Integration](#server-components--ai-integration)
6. [Client Components (Security-First)](#client-components-security-first)
7. [API Routes with AI Monitoring](#api-routes-with-ai-monitoring)
8. [Server Actions for ML Operations](#server-actions-for-ml-operations)
9. [Edge Functions & AI Models](#edge-functions--ai-models)
10. [Error Boundaries & AI Error Handling](#error-boundaries--ai-error-handling)
11. [Performance Monitoring for AI Apps](#performance-monitoring-for-ai-apps)
12. [Testing AI Applications](#testing-ai-applications)

---

## Project Structure for AI/ML Apps

Recommended file organization for nexlog in AI-powered Next.js applications:

```
src/
├── lib/
│   ├── logger.ts              # Server-side logger (Node.js)
│   ├── logger-client.ts       # Client-side logger (security-first)
│   ├── logger-ai.ts           # AI/ML specific logging
│   ├── logger-edge.ts         # Edge runtime logger
│   └── logger-helpers.ts      # Utility functions
├── middleware.ts              # Next.js 15.5+ middleware (Node.js + Edge)
├── services/
│   ├── ai-service.ts          # AI model integration
│   ├── rag-service.ts         # RAG system logging
│   └── ml-monitoring.ts       # ML performance tracking
└── app/
    ├── api/
    │   ├── ai/                # AI endpoints
    │   │   ├── chat/route.ts  # LLM chat API
    │   │   ├── embed/route.ts # Vector embeddings
    │   │   └── train/route.ts # ML training endpoints
    │   └── logging/
    │       └── health.ts      # Logging health check
    └── (ai)/                  # AI-specific app routes
        ├── chat/page.tsx      # Chat interface
        └── dashboard/page.tsx # AI metrics dashboard
```

## AI Application Logging Patterns (2025)

### LLM Chat Application Pattern

Perfect for ChatGPT-style applications and AI assistants:

```typescript
// app/api/ai/chat/route.ts
import { NextRequest } from 'next/server';
import logger from '@/lib/logger-ai';
import { context } from 'nexlog/context';

export async function POST(request: NextRequest) {
  const chatId = crypto.randomUUID();
  const userMessage = await request.json();
  
  return context()
    .withRequestId(chatId)
    .with('feature', 'ai-chat')
    .with('model', 'gpt-4-turbo')
    .runAsync(async () => {
      // Log user message (auto-sanitized for PII)
      logger.info('Chat message received', {
        messageLength: userMessage.content?.length,
        messageType: userMessage.type,
        userId: userMessage.userId, // Safe - no PII
        // userMessage.content auto-sanitized if contains PII
      });
      
      const startTime = performance.now();
      
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: userMessage.content }],
          temperature: 0.7,
        });
        
        const duration = performance.now() - startTime;
        const usage = response.usage;
        
        logger.info('AI response generated', {
          chatId,
          tokensUsed: usage?.total_tokens,
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
          duration: `${duration.toFixed(2)}ms`,
          cost: calculateCost(usage),
          responseLength: response.choices[0]?.message.content?.length,
          // Perfect for AI analytics and cost tracking
        });
        
        return Response.json({
          response: response.choices[0]?.message.content,
          metadata: {
            chatId,
            tokensUsed: usage?.total_tokens,
            cost: calculateCost(usage),
          }
        });
        
      } catch (error) {
        const duration = performance.now() - startTime;
        
        logger.error('AI chat failed', {
          chatId,
          duration: `${duration.toFixed(2)}ms`,
          error: error.message,
          errorCode: error.code,
          model: 'gpt-4-turbo',
        });
        
        return Response.json(
          { error: 'AI service unavailable' }, 
          { status: 500 }
        );
      }
    });
}
```

### Vector Embedding & RAG Pattern

For Retrieval-Augmented Generation (RAG) systems:

```typescript
// app/api/ai/embed/route.ts  
import logger from '@/lib/logger-ai';
import { context } from 'nexlog/context';

export async function POST(request: NextRequest) {
  const { text, namespace } = await request.json();
  const operationId = crypto.randomUUID();
  
  return context()
    .with('operation', 'vector-embedding')
    .with('namespace', namespace)
    .runAsync(async () => {
      logger.info('Vector embedding started', {
        operationId,
        textLength: text.length,
        namespace,
        // text is auto-sanitized for sensitive data
      });
      
      try {
        // Generate embeddings
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });
        
        // Store in vector database
        const vectorId = await vectorDB.upsert({
          id: operationId,
          vector: embedding.data[0].embedding,
          metadata: { text, namespace },
        });
        
        logger.success('Vector embedding completed', {
          operationId,
          vectorId,
          dimensions: embedding.data[0].embedding.length,
          tokensUsed: embedding.usage.total_tokens,
          namespace,
        });
        
        return Response.json({ 
          vectorId, 
          dimensions: embedding.data[0].embedding.length 
        });
        
      } catch (error) {
        logger.error('Vector embedding failed', {
          operationId,
          error: error.message,
          namespace,
        });
        
        return Response.json(
          { error: 'Embedding service failed' }, 
          { status: 500 }
        );
      }
    });
}
```

### ML Model Training Monitoring

For machine learning model training and evaluation:

```typescript
// app/api/ai/train/route.ts
import logger from '@/lib/logger-ai';

export async function POST(request: NextRequest) {
  const { dataset, config } = await request.json();
  const trainingId = crypto.randomUUID();
  
  logger.info('ML training initiated', {
    trainingId,
    datasetSize: dataset.length,
    algorithm: config.algorithm,
    hyperparameters: config.params,
    epochs: config.epochs,
  });
  
  try {
    for (let epoch = 1; epoch <= config.epochs; epoch++) {
      const epochStart = Date.now();
      
      // Training logic here
      const metrics = await trainEpoch(dataset, config);
      
      logger.info('Training epoch completed', {
        trainingId,
        epoch,
        accuracy: metrics.accuracy.toFixed(4),
        loss: metrics.loss.toFixed(6),
        learningRate: config.params.learningRate,
        duration: `${Date.now() - epochStart}ms`,
        // Structured for ML experiment tracking
      });
      
      // Early stopping logic
      if (shouldEarlyStop(metrics)) {
        logger.warn('Early stopping triggered', {
          trainingId,
          epoch,
          finalAccuracy: metrics.accuracy,
          reason: 'convergence_detected',
        });
        break;
      }
    }
    
    logger.success('ML training completed', {
      trainingId,
      finalAccuracy: model.accuracy,
      modelSize: getModelSize(model),
      trainingDuration: `${Date.now() - startTime}ms`,
    });
    
    return Response.json({ 
      trainingId, 
      accuracy: model.accuracy 
    });
    
  } catch (error) {
    logger.error('ML training failed', {
      trainingId,
      error: error.message,
      epoch: currentEpoch,
    });
    
    return Response.json(
      { error: 'Training failed' }, 
      { status: 500 }
    );
  }
}
```

## Next.js 15.5+ Middleware with Node.js Runtime

---

## Environment-Specific Configuration

### `/lib/logger-config.ts`

```typescript
export const LogConfig = {
  development: {
    server: 'debug',
    client: 'error',  // Minimal even in dev
    edge: 'debug'
  },
  production: {
    server: 'info',
    client: 'silent', // No client logs in production
    edge: 'warn'
  },
  test: {
    server: 'silent',
    client: 'silent',
    edge: 'silent'
  }
} as const;

export function getLogLevel(runtime: 'server' | 'client' | 'edge') {
  const env = process.env.NODE_ENV || 'development';
  return LogConfig[env][runtime];
}
```

---

## Server Components

### Pattern: Page-Level Logging

```typescript
// app/products/page.tsx
import logger from '@/lib/logger';

const pageLogger = logger.child({ component: 'ProductsPage' });

export default async function ProductsPage({ 
  searchParams 
}: { 
  searchParams: { category?: string } 
}) {
  const startTime = Date.now();
  
  pageLogger.info('Page render started', { 
    category: searchParams.category 
  });
  
  try {
    const products = await fetchProducts(searchParams.category);
    
    pageLogger.info('Page render completed', {
      productCount: products.length,
      duration: `${Date.now() - startTime}ms`
    });
    
    return <ProductList products={products} />;
  } catch (error) {
    pageLogger.error('Page render failed', {
      error: error.message,
      category: searchParams.category
    });
    
    throw error; // Let error boundary handle it
  }
}
```

### Pattern: Data Fetching with Cache

```typescript
// app/products/[id]/page.tsx
import { unstable_cache } from 'next/cache';
import logger from '@/lib/logger';

const fetchLogger = logger.child({ module: 'data-fetch' });

const getCachedProduct = unstable_cache(
  async (id: string) => {
    fetchLogger.debug('Cache miss, fetching product', { id });
    const product = await fetchProduct(id);
    fetchLogger.debug('Product fetched', { id });
    return product;
  },
  ['product'],
  {
    revalidate: 3600,
    tags: ['products']
  }
);

export default async function ProductPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const product = await getCachedProduct(params.id);
  
  fetchLogger.info('Product page rendered', {
    productId: params.id,
    cached: true // We don't know, but likely if fast
  });
  
  return <ProductDetails product={product} />;
}
```

---

## Client Components

### Pattern: Secure Client Logging

```typescript
// app/components/SearchBar.tsx
'use client';

import { useState } from 'react';
import logger from '@/lib/logger-client';
import { useRouter } from 'next/navigation';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // NO sensitive data in client logs
      logger.info('Search initiated'); // This will be no-op
      
      router.push(`/search?q=${encodeURIComponent(query)}`);
    } catch (error) {
      // Generic error only
      logger.error('Search failed');
      
      // User feedback via UI, not logs
      toast.error('Search unavailable');
    }
  };
  
  return (
    <form onSubmit={handleSearch}>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
    </form>
  );
}
```

### Pattern: Form Submission

```typescript
// app/components/ContactForm.tsx
'use client';

import { useFormState } from 'react-dom';
import logger from '@/lib/logger-client';
import { submitContact } from '@/app/actions';

export function ContactForm() {
  const [state, formAction] = useFormState(submitContact, null);
  
  // Client-side validation
  const handleSubmit = (formData: FormData) => {
    const email = formData.get('email');
    
    if (!email) {
      // Don't log the actual email value
      logger.error('Validation failed');
      return;
    }
    
    // Let server action handle logging
    return formAction(formData);
  };
  
  return (
    <form action={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

## API Routes

### Pattern: Request/Response Logging

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

const apiLogger = logger.child({ api: 'products' });

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  
  const reqLogger = apiLogger.child({ 
    requestId,
    method: 'GET',
    path: url.pathname,
    query: Object.fromEntries(url.searchParams)
  });
  
  reqLogger.info('API request received');
  const startTime = Date.now();
  
  try {
    const products = await getProducts();
    
    const response = NextResponse.json(products);
    
    reqLogger.info('API request completed', {
      status: 200,
      duration: `${Date.now() - startTime}ms`,
      count: products.length
    });
    
    // Add request ID to response headers for tracing
    response.headers.set('X-Request-Id', requestId);
    
    return response;
  } catch (error) {
    reqLogger.error('API request failed', {
      error: error.message,
      duration: `${Date.now() - startTime}ms`
    });
    
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const reqLogger = apiLogger.child({ requestId, method: 'POST' });
  
  reqLogger.info('POST request received');
  
  try {
    const body = await request.json();
    
    // Don't log sensitive fields
    reqLogger.debug('Request body received', {
      hasName: !!body.name,
      hasEmail: !!body.email,
      // Never log actual values
    });
    
    const result = await createProduct(body);
    
    reqLogger.success('Product created', {
      productId: result.id
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    reqLogger.error('POST request failed', {
      error: error.message
    });
    
    return NextResponse.json(
      { error: 'Bad Request' },
      { status: 400 }
    );
  }
}
```

---

## Middleware

### Pattern: Edge-Compatible Middleware Logging

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import type { NextFetchEvent } from 'next/server';

// Note: Cannot import Node.js logger here
// Create edge-compatible logger
const edgeLogger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EDGE] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[EDGE ERROR] ${message}`, error);
  }
};

export async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Add request ID to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  
  edgeLogger.info('Middleware processing', {
    path: request.nextUrl.pathname,
    method: request.method
  });
  
  // Authentication check
  const token = request.cookies.get('session');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    edgeLogger.info('Unauthorized access attempt', {
      path: request.nextUrl.pathname
    });
    
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add performance header
  response.headers.set('X-Middleware-Duration', `${Date.now() - startTime}ms`);
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## Server Actions

### Pattern: Action Logging

```typescript
// app/actions/products.ts
'use server';

import { revalidatePath } from 'next/cache';
import logger from '@/lib/logger';
import { z } from 'zod';

const actionLogger = logger.child({ module: 'server-actions' });

const CreateProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  description: z.string()
});

export async function createProduct(formData: FormData) {
  const actionId = crypto.randomUUID();
  const log = actionLogger.child({ actionId, action: 'createProduct' });
  
  log.info('Action started');
  
  try {
    // Parse and validate
    const rawData = Object.fromEntries(formData);
    const validatedData = CreateProductSchema.parse(rawData);
    
    log.debug('Data validated', {
      hasName: !!validatedData.name,
      hasPrice: !!validatedData.price
    });
    
    // Create product
    const product = await db.product.create({
      data: validatedData
    });
    
    log.success('Product created', {
      productId: product.id
    });
    
    // Revalidate cache
    revalidatePath('/products');
    
    return { success: true, product };
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Validation failed', {
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
      
      return { 
        success: false, 
        error: 'Validation failed',
        details: error.errors 
      };
    }
    
    log.error('Action failed', {
      error: error.message
    });
    
    return { 
      success: false, 
      error: 'Failed to create product' 
    };
  }
}

export async function deleteProduct(id: string) {
  const log = actionLogger.child({ 
    action: 'deleteProduct',
    productId: id 
  });
  
  log.info('Delete action started');
  
  try {
    await db.product.delete({ where: { id } });
    
    log.success('Product deleted');
    revalidatePath('/products');
    
    return { success: true };
  } catch (error) {
    log.error('Delete failed', { error: error.message });
    return { success: false, error: 'Failed to delete' };
  }
}
```

---

## Edge Functions

### Pattern: Vercel Edge Functions

```typescript
// app/api/edge/route.ts
export const runtime = 'edge';

// Edge-compatible logging
const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, level, message, ...data };
  
  // In Edge Runtime, we can only use console
  if (level === 'error') {
    console.error(JSON.stringify(logData));
  } else if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify(logData));
  }
};

export async function GET(request: Request) {
  const startTime = Date.now();
  
  log('info', 'Edge function invoked', {
    url: request.url,
    headers: Object.fromEntries(request.headers)
  });
  
  try {
    // Edge function logic
    const data = await fetch('https://api.example.com/data');
    
    log('info', 'Edge function completed', {
      duration: Date.now() - startTime
    });
    
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    log('error', 'Edge function failed', {
      error: error.message,
      duration: Date.now() - startTime
    });
    
    return new Response('Error', { status: 500 });
  }
}
```

---

## Error Boundaries

### Pattern: Error Boundary Logging

```typescript
// app/error.tsx
'use client';

import { useEffect } from 'react';
import logger from '@/lib/logger-client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error with digest for tracking
    // No sensitive data in client
    logger.error('Application error', {
      digest: error.digest
    });
  }, [error]);
  
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Pattern: Global Error Handler

```typescript
// app/global-error.tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Critical errors only
  console.error('Global error:', error.digest);
  
  return (
    <html>
      <body>
        <h1>Critical Error</h1>
        <button onClick={reset}>Reload</button>
      </body>
    </html>
  );
}
```

---

## Testing

### Pattern: Testing with Mocked Logger

```typescript
// __tests__/products.test.ts
import { jest } from '@jest/globals';

// Mock logger for tests
jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
    }))
  }
}));

import logger from '@/lib/logger';
import { createProduct } from '@/app/actions/products';

describe('Product Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should log product creation', async () => {
    const formData = new FormData();
    formData.append('name', 'Test Product');
    formData.append('price', '99.99');
    
    await createProduct(formData);
    
    // Verify logging occurred
    expect(logger.child).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'server-actions' })
    );
    
    const childLogger = logger.child.mock.results[0].value;
    expect(childLogger.success).toHaveBeenCalledWith(
      'Product created',
      expect.objectContaining({ productId: expect.any(String) })
    );
  });
  
  it('should log validation errors', async () => {
    const formData = new FormData();
    // Missing required fields
    
    await createProduct(formData);
    
    const childLogger = logger.child.mock.results[0].value;
    expect(childLogger.warn).toHaveBeenCalledWith(
      'Validation failed',
      expect.any(Object)
    );
  });
});
```

### Pattern: E2E Testing with Real Logs

```typescript
// e2e/products.spec.ts
import { test, expect } from '@playwright/test';

test('should log page visits', async ({ page }) => {
  // Capture console logs
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(msg.text());
    }
  });
  
  await page.goto('/products');
  
  // Verify no client errors logged
  expect(logs).toHaveLength(0);
  
  // Server logs would be checked via log aggregation service
});
```

---

## Performance Monitoring

### Pattern: Performance Tracking

```typescript
// lib/performance-logger.ts
import logger from '@/lib/logger';

const perfLogger = logger.child({ module: 'performance' });

export class PerformanceTracker {
  private metrics = new Map<string, number>();
  
  start(operation: string) {
    this.metrics.set(operation, performance.now());
  }
  
  end(operation: string, metadata?: Record<string, any>) {
    const start = this.metrics.get(operation);
    if (!start) return;
    
    const duration = Math.round(performance.now() - start);
    
    const logData = {
      operation,
      duration: `${duration}ms`,
      ...metadata
    };
    
    if (duration > 1000) {
      perfLogger.warn('Slow operation', logData);
    } else if (duration > 500) {
      perfLogger.info('Operation completed', logData);
    } else {
      perfLogger.debug('Fast operation', logData);
    }
    
    this.metrics.delete(operation);
    return duration;
  }
}

// Usage
const tracker = new PerformanceTracker();

tracker.start('database-query');
const results = await db.query();
tracker.end('database-query', { 
  resultCount: results.length 
});
```

---

## Summary

### Key Principles for Next.js + Nexlog

1. **Strict Separation**: Never mix server and client loggers
2. **Edge Awareness**: Use console in Edge Runtime
3. **Security First**: No sensitive data in client logs
4. **Performance**: Track and log slow operations
5. **Correlation**: Use request IDs across the stack
6. **Testing**: Mock loggers in tests
7. **Monitoring**: Server logs to external services
8. **User Privacy**: Follow GDPR/CCPA guidelines

### Quick Reference

| Context | Import | Log Level | Notes |
|---------|--------|-----------|-------|
| Server Component | `@/lib/logger` | debug/info | Full logging |
| Client Component | `@/lib/logger-client` | error/silent | Minimal |
| API Route | `@/lib/logger` | info | With request ID |
| Middleware | Console only | warn | Edge Runtime |
| Server Action | `@/lib/logger` | info | With validation |
| Edge Function | Console only | error | JSON format |

---

*Last Updated: 2025-09-01*
*Next.js Version: 15.0.4*
*Nexlog Version: 5.2.1+*