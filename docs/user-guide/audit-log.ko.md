# 📋 감사 로그

모델 이벤트(생성/수정/삭제)를 자동 추적하는 감사 로그 시스템입니다。

CI3의 로깅 + DB 추적 통합.

## 설정

```typescript
import { AuditLog } from "system/core/audit_log.ts";

AuditLog.configure({
  enabled: true,
  trackEvents: ["create", "update", "delete", "login"],
  logToFile: true,
  userIdResolver: () => Auth.user()?.id ?? null,
});
```

## 테이블 생성

```bash
bun run bi migrate
```

또는 수동:

```typescript
await AuditLog.createTable();
```

## 수동 로그 기록

```typescript
// 생성
await AuditLog.logCreate("posts", "42", { title: "Hello" });

// 수정
await AuditLog.logUpdate("posts", "42", { title: "Old" }, { title: "New" });

// 삭제
await AuditLog.logDelete("posts", "42", { title: "Hello" });

// 로그인
await AuditLog.logLogin("users", "1", "127.0.0.1");

// 커스텀 이벤트
await AuditLog.logCustom("export", "reports", "daily", "Daily report exported");
```

## 모델 자동 추적

```typescript
// 모델의 create/update/delete를 자동 추적
AuditLog.track(postModel, ["create", "update", "delete"]);
AuditLog.track(userModel, ["create", "delete"]);
```

## 로그 조회

```typescript
// 특정 엔티티의 로그
const logs = await AuditLog.getLogs("posts", "42");

// 특정 이벤트 타입
const logins = await AuditLog.getLogsByEvent("login");

// 특정 사용자
const userLogs = await AuditLog.getLogsByUser(1);
```

## 로그 구조

```typescript
interface AuditLogEntry {
  id?: number;
  event: string;           // "create" | "update" | "delete" | "login" | "custom"
  entity_type: string;     // "posts"
  entity_id: string;       // "42"
  old_values: string;      // JSON (수정/삭제 시)
  new_values: string;      // JSON (생성/수정 시)
  user_id: number | null;  // 작업자 ID
  ip_address: string;      // IP 주소
  description: string;     // 설명
  created_at?: string;     // 생성 시각
}
```
