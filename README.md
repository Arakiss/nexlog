> ⚠️ **Archived** — This logger has been renamed and superseded by [**vestig**](https://github.com/Arakiss/vestig) (structured logging + automatic PII sanitization + context propagation). Use `vestig` instead.

# nexlog

> **⚠️ DEPRECATED**: This package is deprecated and no longer maintained. Please migrate to [**vestig**](https://github.com/Arakiss/vestig) — *Leave a trace.*

---

## Why deprecated?

This project suffered from severe versioning issues during its development (version 4.x was accidentally skipped, inconsistent releases, etc.). Rather than continuing with a confusing version history, I started fresh with a completely rewritten package:

**[vestig](https://github.com/Arakiss/vestig)** — A modern, runtime-agnostic structured logging library with:

- Clean version history
- Automatic PII sanitization
- Context propagation with correlation IDs
- Multi-runtime support (Node.js, Bun, Deno, Edge, Browser)
- Zero dependencies
- Full TypeScript support

## Migration

```bash
# Remove nexlog
npm uninstall nexlog

# Install vestig
npm install vestig
```

```diff
- import logger from 'nexlog';
+ import { log } from 'vestig';
```

The API has been redesigned for better ergonomics. See the [vestig documentation](https://github.com/Arakiss/vestig#readme) for the full API.

## Legacy Documentation

If you need to reference the old documentation for existing projects, check the [v5.3.0 release](https://github.com/Arakiss/nexlog/releases/tag/v5.3.0).

## License

MIT License - see [LICENSE](LICENSE) file for details.