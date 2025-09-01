# Nexlog v5.1 - Upgrade Guide

## Key Improvements

### Edge Runtime Compatibility

Nexlog now works in Edge Runtime environments (Vercel Edge Functions, Cloudflare Workers):

```typescript
// Automatic runtime detection
import logger from 'nexlog';

// Or use specific builds
import logger from 'nexlog/edge'; // Edge Runtime
```

### Data Sanitization

Automatically mask sensitive data:

```typescript
const logger = new Logger({
  sanitize: true,
  maskFields: ['password', 'apiKey']
});

logger.info('User login', {
  email: 'user@example.com',    // → us***@example.com
  password: 'secret123'          // → [REDACTED]
});
```

### Context Tracking

Track context across async operations:

```typescript
import { context } from 'nexlog';

await context()
  .withRequestId('req-123')
  .withUserId('user-456')
  .runAsync(async () => {
    logger.info('Processing'); // Includes context automatically
  });
```

### Memory Management

Built-in circular buffer prevents memory leaks:

```typescript
const logger = new Logger({
  bufferSize: 1000 // Max logs in memory
});
```

### Performance

- 30-50% faster in Edge Runtime
- Zero memory leaks with circular buffer
- Smart batching with backpressure

## Migration from v5.0

No breaking changes. New features are opt-in:

```typescript
// Works exactly as before
import logger from 'nexlog';

// Enable new features
const logger = new Logger({
  sanitize: true,
  bufferSize: 5000
});
```

## Support

GitHub Issues: https://github.com/Arakiss/nexlog/issues