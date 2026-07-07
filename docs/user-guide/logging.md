# 📝 Logging

File + console output logging system.

## Basic Usage

```typescript
import { logger, logMessage } from "system/core/logger.ts";

logger.debug("Debug info", { key: "value" });
logger.info("Server started", { port: 3000 });
logger.warn("Low memory", { used: "90%" });
logger.error("DB connection failed", { error: err.message });
logger.fatal("Fatal error", { stack: err.stack });

// CI3 compatible
logMessage("info", "Server started");
```

## Log Levels

| Level | Console Color | Purpose |
|-------|---------------|---------|
| `debug` | cyan | Development debugging |
| `info` | green | General information |
| `warn` | yellow | Warnings |
| `error` | red | Errors |
| `fatal` | magenta | Fatal errors |

## Output Targets

- **Console**: colorized output
- **File**: `storage/logs/app-YYYY-MM-DD.log`
- **Level filtering**: development=debug+, production=info+
- **Log rotation**: auto-rotate at 10MB, max 30 files
