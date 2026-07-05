# 📧 이메일

SMTP / sendmail / log 드라이버 지원. sendmail은 `Bun.spawn` stdin pipe + `Bun.$` 셸 지원.

## 기본 사용법

```typescript
import { Email } from "system/core/email.ts";

const mailer = new Email({ driver: "log" });

const result = await mailer.send({
  to: "user@example.com",
  subject: "환영합니다",
  html: "<h1>환영합니다!</h1>",
});
```

## Sendmail 드라이버

### Bun.spawn stdin pipe (기본)

```typescript
const mailer = new Email({
  driver: "sendmail",
  sendmailPath: "/usr/sbin/sendmail",  // 기본: "sendmail"
  sendmailArgs: ["-t", "-i"],          // 기본: ["-t", "-i"]
});

// stdin: "pipe" → FileSink로 빠른 쓰기
// proc.stdin.write(content) → flush → end
const result = await mailer.send({
  to: "user@example.com",
  subject: "테스트",
  text: "Hello from BunIgniter!",
});
```

### Bun.$ 셸 모드

```typescript
const mailer = new Email({
  driver: "sendmail",
  useBunShell: true,  // Bun.$ 템플릿 리터럴 사용
});

// Bun.$로 안전한 명령어 실행 (자동 이스케이프)
// 임시 파일로 stdin 파이핑
const result = await mailer.send({
  to: "user@example.com",
  subject: "테스트",
  html: "<p>Hello!</p>",
});
```

## SMTP 드라이버

```typescript
const mailer = new Email({
  driver: "smtp",
  smtp: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    username: "you@gmail.com",
    password: "app-password",
  },
  from: {
    email: "noreply@example.com",
    name: "My App",
  },
});
```

## Log 드라이버 (개발)

```typescript
const mailer = new Email({
  driver: "log",
  logDir: "./storage/logs",  // 기본
});
// emails.log에 기록
```

## 간편 메서드

```typescript
// 간편 발송
await mailer.sendSimple("user@example.com", "제목", "<h1>본문</h1>");

// 템플릿 발송
await mailer.sendTemplate("user@example.com", "제목", "emails/welcome", { name: "Kim" });
```

## 전체 옵션

```typescript
await mailer.send({
  to: "a@example.com",             // string | string[]
  cc: "cc@example.com",            // 선택
  bcc: ["bcc1@example.com"],      // 선택
  subject: "제목",
  html: "<h1>HTML 본문</h1>",      // html 또는 text 필수
  text: "텍스트 본문",              // html과 동시 지정 시 multipart/alternative
  from: { email: "custom@example.com", name: "커스텀" },
  replyTo: "reply@example.com",
  headers: { "X-Priority": "1" },
});
```

## 설정 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `driver` | 전송 방식 | `"log"` |
| `sendmailPath` | sendmail 실행 파일 | `"sendmail"` |
| `sendmailArgs` | sendmail 인수 | `["-t", "-i"]` |
| `useBunShell` | Bun.$ 셸 사용 | `false` |
| `smtp.host` | SMTP 서버 | `"localhost"` |
| `smtp.port` | SMTP 포트 | `587` |
| `smtp.secure` | TLS 사용 | `false` |
| `from.email` | 기본 발신자 이메일 | `"noreply@bunigniter.dev"` |
| `logDir` | 로그 디렉토리 | `"./storage/logs"` |
