---
"nexlog": patch
---

fix: add missing package.json exports for browser, formatters, utils, and correlation

Fixes #4 - Add missing subpath exports that were referenced in documentation but not available in package.json:
- nexlog/browser - Browser-specific logger entry point
- nexlog/formatters - Pretty formatter for development
- nexlog/utils - Error serializer, rate limiter, and circular buffer utilities
- nexlog/correlation - Correlation manager for distributed tracing

Also fixes README documentation to use correct imports for browser logger.
