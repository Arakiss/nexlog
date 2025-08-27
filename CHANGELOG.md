# nexlog

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
