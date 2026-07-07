# 📝 로깅

파일 + 콘솔 출력 로깅 시스템입니다.

## 기본 사용법

```typescript
import { logger, logMessage } from "system/core/logger.ts";

logger.debug("디버그 정보", { key: "value" });
logger.info("서버 시작", { port: 3000 });
logger.warn("메모리 부족", { used: "90%" });
logger.error("DB 연결 실패", { error: err.message });
logger.fatal("치명적 오류", { stack: err.stack });

// CI3 호환
logMessage("info", "서버 시작");
```

## 로그 레벨

| 레벨 | 콘솔 색상 | 용도 |
|------|----------|------|
| `debug` | cyan | 개발 디버깅 |
| `info` | green | 일반 정보 |
| `warn` | yellow | 경고 |
| `error` | red | 오류 |
| `fatal` | magenta | 치명적 오류 |

## 출력 대상

- **콘솔**: 색상 포함
- **파일**: `storage/logs/app-YYYY-MM-DD.log`
- **레벨 필터링**: 개발=debug 이상, 프로덕션=info 이상
- **로그 회전**: 10MB 초과 시 자동 회전, 최대 30개 파일
