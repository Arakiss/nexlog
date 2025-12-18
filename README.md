# nexlog

> **⚠️ DEPRECATED**: This package is deprecated and no longer maintained. Please migrate to [**sigil**](https://github.com/Arakiss/sigil) — *Leave your mark.*

---

## Why deprecated?

This project suffered from severe versioning issues during its development (version 4.x was accidentally skipped, inconsistent releases, etc.). Rather than continuing with a confusing version history, I started fresh with a completely rewritten package:

**[sigil](https://github.com/Arakiss/sigil)** — A modern, runtime-agnostic structured logging library with:

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

# Install sigil
npm install sigil
```

```diff
- import logger from 'nexlog';
+ import { log } from 'sigil';
```

The API has been redesigned for better ergonomics. See the [sigil documentation](https://github.com/Arakiss/sigil#readme) for the full API.

## Legacy Documentation

If you need to reference the old documentation for existing projects, check the [v5.3.0 release](https://github.com/Arakiss/nexlog/releases/tag/v5.3.0).

## License

MIT License - see [LICENSE](LICENSE) file for details.
