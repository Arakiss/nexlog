# nexlog

> **DEPRECATED**: This package is deprecated and no longer maintained. Please migrate to [logpulse](https://github.com/Arakiss/logpulse) for a complete rewrite with better architecture.

---

## Why deprecated?

This project suffered from severe versioning issues during its development (version 4.x was accidentally skipped, inconsistent releases, etc.). Rather than continuing with a confusing version history, I decided to start fresh with a new package that has:

- Clean version history starting from v1.0.0
- Improved architecture based on lessons learned
- Better defaults out of the box
- Same great features you loved from nexlog

## Migration

```bash
# Remove nexlog
npm uninstall nexlog

# Install logpulse
npm install logpulse
```

```diff
- import logger from 'nexlog';
+ import logger from 'logpulse';
```

The API is designed to be compatible, so migration should be straightforward.

## Legacy Documentation

If you need to reference the old documentation for existing projects, check the [v5.3.0 release](https://github.com/Arakiss/nexlog/releases/tag/v5.3.0).

## License

MIT License - see [LICENSE](LICENSE) file for details.
