# nexlog

## 5.0.0

### Major Changes

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

## 4.0.0

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
