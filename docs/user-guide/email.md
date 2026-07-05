# 📧 이메일

SMTP / sendmail / log 드라이버를 지원하는 이메일 라이브러리입니다.

## 기본 사용법

```typescript
import { Email } from "system/core/email.ts";

const mailer = new Email({ driver: "log" }); // 개발: log, 프로덕션: smtp

const result = await mailer.send({
  to: "user@example.com",
  subject: "환영합니다",
  html: "<h1>환영합니다!</h1>",
});

console.log(result.success); // true
```

## 간편 발송

```typescript
await mailer.sendSimple("user@example.com", "제목", "<h1>내용</h1>");
```

## 템플릿 이메일

```typescript
await mailer.sendTemplate("user@example.com", "가입 환영", "emails/welcome", {
  name: "Alice",
});
```

## SMTP 설정

```typescript
const mailer = new Email({
  driver: "smtp",
  smtp: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    username: "your@gmail.com",
    password: "app-password",
  },
  from: { email: "noreply@example.com", name: "My App" },
});
```

## 전체 옵션

```typescript
await mailer.send({
  to: ["alice@test.com", "bob@test.com"],
  cc: "manager@test.com",
  bcc: ["secret@test.com"],
  subject: "공지사항",
  html: "<h1>공지</h1>",
  text: "공지사항입니다",
  from: { email: "noreply@test.com", name: "앱 이름" },
  replyTo: "support@test.com",
  headers: { "X-Priority": "1" },
});
```

## 드라이버

| 드라이버 | 설명 |
|---------|------|
| `log` | `storage/logs/emails.log` 에 기록 (개발용) |
| `smtp` | TCP 소켓으로 SMTP 서버에 직접 전송 |
| `sendmail` | 시스템 sendmail 명령어 사용 |
