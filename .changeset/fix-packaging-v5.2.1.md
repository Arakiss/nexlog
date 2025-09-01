---
'nexlog': patch
---

fix: v5.2.0 packaging issue - missing dist/ files

Fixes critical packaging problem where v5.2.0 was published without compiled files in dist/ folder. This caused "Cannot find module" errors when importing nexlog@5.2.0.

Changes:
- Restored prepublishOnly script to ensure build runs before publish
- Fixed CI workflow integration
- All dist/ files now properly included in npm package

This patch ensures the full v5.2.0 feature set is available with proper packaging.