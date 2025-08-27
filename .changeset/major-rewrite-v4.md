---
"nexlog": major
---

🚀 Complete rewrite and modernization of nexlog v4.0.0

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