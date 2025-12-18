# nexlog

## 5.3.0

### Minor Changes

- **ESM/CommonJS Compatibility Fix** (Issue #7)

  - Resolved `require is not defined in ES module scope` error in Next.js and other ESM environments
  - Removed circular dependency in ConfigManager that caused ESM import failures
  - Logger now creates transports internally, avoiding ESM/CJS incompatibility
  - Added `getTransportConfig()` method for ESM-safe configuration access

- **Console.log-style Variadic Arguments** (Issue #6)

  - All logging methods now support variadic arguments like `console.log`
  - Backwards compatible: existing `(message, metadata)` signature still works
  - New usage: `logger.info('message', obj1, obj2, { extra: true })`
  - Error objects are automatically serialized with message, name, and stack
  - Primitive values stored with indexed keys (arg1, arg2, etc.)
  - Objects are merged into metadata

- **New Tests**

  - Added 27 comprehensive tests for variadic argument handling
  - Updated transport creation tests to reflect ESM-safe architecture
  - Total: 118 tests passing

### Usage Examples

```typescript
// Traditional API (still works)
logger.info("user action", { userId: 123 });

// New variadic API
logger.info("user action", userId, action, { extra: "data" });
logger.error("failed", new Error("timeout"), requestId);
logger.debug("values", 1, 2, 3, true, { more: "data" });
```

## 5.2.2

### Patch Changes

- 33b97ca: fix: add missing package.json exports for browser, formatters, utils, and correlation

  Fixes #4 - Add missing subpath exports that were referenced in documentation but not available in package.json:

  - nexlog/browser - Browser-specific logger entry point
  - nexlog/formatters - Pretty formatter for development
  - nexlog/utils - Error serializer, rate limiter, and circular buffer utilities
  - nexlog/correlation - Correlation manager for distributed tracing

  Also fixes README documentation to use correct imports for browser logger.

## 5.2.1

### Patch Changes

- 4491575: fix: v5.2.0 packaging issue - missing dist/ files

  Fixes critical packaging problem where v5.2.0 was published without compiled files in dist/ folder. This caused "Cannot find module" errors when importing nexlog@5.2.0.

  Changes:

  - Restored prepublishOnly script to ensure build runs before publish
  - Fixed CI workflow integration
  - All dist/ files now properly included in npm package

  This patch ensures the full v5.2.0 feature set is available with proper packaging.

## 5.2.0

### Minor Changes

- # 🚀 nexlog v5.2.0 - Advanced Enterprise Features

  Major release implementing comprehensive enterprise-grade logging features based on real production feedback from the Orvian project.

  ## 🎯 P0 Critical Features

  ### Enhanced Edge Runtime Detection

  - Auto-detects Vercel Edge Runtime, Cloudflare Workers, and Deno Deploy
  - Comprehensive environment capability detection
  - Fixes critical compatibility issues with Next.js middleware

  ### Distributed Tracing & Correlation IDs

  - Full correlation context management with request/trace/span IDs
  - Automatic context persistence across async operations
  - W3C Trace Context header support
  - Express/Koa middleware integration

  ### Smart Module Detection

  - Auto-extracts module names from stack traces for child loggers
  - Proper handling of module objects vs strings
  - Fixes [object Object] display issues

  ## ✨ P1 Advanced Features

  ### New `logger.success()` Method

  - Dedicated success log level with bright green styling
  - Proper console method mapping and level prioritization
  - Complete type safety integration

  ### Pretty Print Development Mode

  - Beautiful console output with emoji indicators 🎨
  - Relative timestamps and collapsible metadata groups
  - Color-coded log levels and structured object display
  - Automatic activation in development environments

  ### Advanced Sampling & Rate Limiting

  - Per-level sampling configuration (trace: 0.1, debug: 0.5, etc.)
  - Per-message rate limiting with `_rateLimit: "10/minute"` metadata
  - Token bucket algorithm implementation
  - Configurable strategies: "5/second", "100/hour"

  ### Structured Error Serialization

  - Complete Error object serialization with cause chains
  - Stack trace parsing into structured format
  - Custom error property extraction (code, statusCode, etc.)
  - Circular reference and depth protection

  ## 🔧 Technical Improvements

  ### Enhanced Data Sanitization

  - Auto-detection of sensitive fields (password, token, apiKey, etc.)
  - Built-in patterns for email masking, credit card redaction
  - Configurable sanitization rules and custom patterns
  - GDPR compliance features

  ### Memory Management

  - Circular buffer implementation prevents memory leaks
  - Configurable overflow strategies: drop-oldest, drop-newest, block
  - Buffer statistics and monitoring

  ### Pretty Formatter

  - Configurable timestamp formats: ISO, relative, none
  - Emoji log level indicators: ✅ SUCCESS, ❌ ERROR, ⚠️ WARN
  - Grouped metadata with collapsible console groups
  - CSS-styled console output for browsers

  ## 🏗️ Architecture Enhancements

  - **Full TypeScript Support**: Strict typing throughout
  - **Conditional Exports**: Optimized bundles for edge/node/browser
  - **Plugin System Ready**: Extensible architecture for custom functionality
  - **Backward Compatibility**: All existing APIs preserved

  ## 📊 Performance & Monitoring

  - Advanced sampling prevents log flooding in production
  - Rate limiting with configurable time windows
  - Real-time statistics and metrics collection
  - Buffer utilization monitoring

  ## 🔒 Security & Compliance

  - Automatic PII detection and masking
  - Configurable field redaction patterns
  - Safe serialization with circular reference protection
  - GDPR-ready data sanitization

  This release transforms nexlog into a production-ready enterprise logging solution while maintaining its simplicity and modern approach. Perfect for Next.js applications requiring sophisticated logging capabilities.

## 5.1.0

### Minor Changes

- 🚀 Enterprise Features Release - v5.1.0

  ## Edge Runtime Compatibility

  - Full support for Vercel Edge Functions, Cloudflare Workers, and other edge environments
  - Automatic runtime detection (node/edge/browser/bun/worker)
  - Conditional exports for optimized builds per environment

  ## Data Privacy & Security

  - Built-in data sanitization system
  - Automatic masking of sensitive fields (passwords, tokens, API keys, emails)
  - Configurable sanitization patterns and custom field masking
  - Deep object traversal with circular reference protection

  ## Context Management

  - Persistent context tracking across async operations
  - AsyncLocalStorage support for Node.js
  - Global context manager for Edge/Browser environments
  - Request correlation with automatic context propagation

  ## Performance & Reliability

  - Circular buffer implementation prevents memory leaks
  - Smart batching with backpressure handling
  - Configurable sampling rates for high-volume scenarios
  - Zero memory leak guarantee with bounded buffers

  ## Developer Experience

  - Enhanced TypeScript support with strict types and generics
  - Plugin system for extensibility
  - Performance profiling utilities
  - Symbol.dispose support for automatic resource cleanup

  ## New Features

  - `withContext()` method for scoped logging contexts
  - `measure()` method with automatic disposal
  - `getRecentLogs()` for debugging and monitoring
  - Environment-based configuration via env variables
  - Multiple entry points (nexlog/edge, nexlog/browser)

  ## Breaking Changes

  None - All new features are opt-in and backward compatible.

## 5.0.0

### Major Changes

> **Note**: Version 4.x was skipped. The v4.0.0 changelog entry below documents planned features that were ultimately released as v5.0.0 to align with npm versioning after an accidental publish. See v4.0.0 section for historical reference.

- b5058c1: 🚀 Complete rewrite and modernization of nexlog v4.0.0

  ## Major Breaking Changes

  - **Complete architecture rewrite**: New class-based Logger with transport system replacing legacy strategy pattern
  - **Enhanced TypeScript support**: Eliminated all @ts-ignore statements with proper type definitions
  - **Bun-first optimization**: Added native Bun runtime detection and optimizations
  - **Modern React integration**: New hooks (useLogger, useChildLogger, usePerformanceLogger) and DevTools component

  ## New Features

  - **🔧 Environment Configuration**: 30+ environment variables for complete control (NEXLOG_LEVEL, NEXLOG_STRUCTURED, etc.)
  - **🚀 Transport System**: Pluggable ConsoleTransport, BatchedTransport with performance optimizations
  - **🎯 Plugin Architecture**: Extensible plugin system with lifecycle hooks (init, transform, beforeLog, afterLog)
  - **👶 Child Loggers**: Namespaced loggers with inheritance and caching
  - **📊 Performance Tools**: Built-in time() and profile() methods for performance monitoring
  - **🎲 Sampling**: Configurable sampling rates for high-volume logging
  - **📈 Statistics**: Real-time statistics tracking (logCount, uptime, children, transports)
  - **⚡ Batching**: Smart batching for improved performance
  - **🔍 Structured Logging**: JSON output support for production environments

  ## React Integration Improvements

  - **LoggerProvider**: Enhanced provider with lifecycle management
  - **useChildLogger**: Hook for creating namespaced child loggers
  - **usePerformanceLogger**: Hook for performance measurements
  - **LoggerDevTools**: Visual debugging component (dev mode only)
  - **withLogger HOC**: Higher-order component for logger injection

  ## Performance & Quality

  - **Zero technical debt**: Removed all legacy code and @ts-ignore statements
  - **91 passing tests**: Comprehensive test coverage including React components
  - **Modern tooling**: Biome for linting/formatting, full TypeScript support
  - **Bun optimized**: Native Bun runtime support with specific optimizations

  ## Migration Guide

  This is a major version with breaking changes. See documentation for migration from v3.x to v4.x.

## 4.0.0 (Never Released)

> **Note**: This version was never published to npm. Due to versioning issues during the release process, these features were released as v5.0.0 instead. This entry is preserved for historical reference only.

### Major Changes

- # nexlog v4.0.0 - Complete Rewrite

  ## 🚨 Breaking Changes

  - Complete TypeScript rewrite with new class-based architecture
  - Changed from function-based to class-based Logger
  - Removed old LoggerStrategy pattern in favor of Transport system
  - React component APIs have changed (but backwards compatible)

  ## ✨ New Features

  ### Core Features

  - **Transport System**: Flexible log output with custom transports
  - **Plugin System**: Extend functionality with custom plugins
  - **Child Loggers**: Namespaced logging with inherited configuration
  - **Batched Logging**: Performance optimization with batching support
  - **Structured Logging**: JSON output for production environments
  - **Performance Monitoring**: Built-in `time()` and `profile()` methods
  - **Context Support**: Attach persistent metadata to all logs
  - **Sampling Rate**: Control log volume in high-traffic scenarios
  - **Statistics**: Track log counts, uptime, and more with `getStats()`
  - **Flush Support**: Ensure all logs are written with `flush()`

  ### React Features

  - **Enhanced LoggerProvider**: More configuration options
  - **New Hooks**: `useChildLogger`, `usePerformanceLogger`
  - **HOC Support**: `withLogger` higher-order component
  - **DevTools Component**: Visual logger controls for development
  - **Lifecycle Logging**: Automatic app lifecycle event tracking

  ### Environment Detection

  - **Improved Detection**: Better detection of server, browser, and edge environments
  - **No More @ts-ignore**: Proper TypeScript types for all environments

  ### Developer Experience

  - **Full JSDoc**: Complete documentation for all methods and types
  - **Better Types**: Enhanced TypeScript support with proper generics
  - **Zero Dependencies**: Still maintaining zero external dependencies
  - **Biome Integration**: Modern linting and formatting

  ## 🔄 Migration Guide

  The default export still works for backwards compatibility:

  ```typescript
  // Old API (v3.x) - still works
  import logger from "nexlog";
  logger.info("Hello");

  // New API (v4.0) - recommended
  import { Logger, ConsoleTransport } from "nexlog";
  const logger = new Logger({
    transports: [new ConsoleTransport()],
  });
  logger.info("Hello");
  ```

  ## Performance Improvements

  - Batched logging reduces I/O overhead
  - Child loggers are cached for efficiency
  - Sampling rate allows high-volume control
  - Disabled logs have near-zero performance impact

  ## Bug Fixes

  - Fixed duplicate code between BrowserLogger and EdgeLogger
  - Fixed environment detection issues
  - Removed all @ts-ignore statements
  - Fixed TypeScript configuration issues

## 3.1.0

### Minor Changes

- a1edd67: implement changesets and update CI/CD

### Patch Changes

- fc52b68: update release ci/cd process
- a1edd67: implement changesets and update CI/CD
