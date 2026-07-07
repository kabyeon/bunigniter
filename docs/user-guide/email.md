# 📧 Email

Supports SMTP / sendmail / log drivers. sendmail uses `Bun.spawn` stdin pipe + `Bun.$` shell support.

## Basic Usage

```typescript
import { Email } from "system/core/email.ts";

const mailer = new Email({ driver: "log" });

const result = await mailer.send({
  to: "user@example.com",
  subject: "Welcome",
  html: "<h1>Welcome!</h1>",
});
```

## Sendmail Driver

### Bun.spawn stdin pipe (default)

```typescript
const mailer = new Email({
  driver: "sendmail",
  sendmailPath: "/usr/sbin/sendmail",  // default: "sendmail"
  sendmailArgs: ["-t", "-i"],          // default: ["-t", "-i"]
});

// stdin: "pipe" → fast FileSink writes
// proc.stdin.write(content) → flush → end
const result = await mailer.send({
  to: "user@example.com",
  subject: "Test",
  text: "Hello from BunIgniter!",
});
```

### Bun.$ Shell Mode

```typescript
const mailer = new Email({
  driver: "sendmail",
  useBunShell: true,  // Uses Bun.$ template literal
});

// Safe command execution with Bun.$ (auto-escape)
// Pipes stdin through temp file
const result = await mailer.send({
  to: "user@example.com",
  subject: "Test",
  html: "<p>Hello!</p>",
});
```

## SMTP Driver

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

## Log Driver (Development)

```typescript
const mailer = new Email({
  driver: "log",
  logDir: "./storage/logs",  // default
});
// Logs to emails.log
```

## Convenience Methods

```typescript
// Quick send
await mailer.sendSimple("user@example.com", "Subject", "<h1>Body</h1>");

// Template send
await mailer.sendTemplate("user@example.com", "Subject", "emails/welcome", { name: "Kim" });
```

## Full Options

```typescript
await mailer.send({
  to: "a@example.com",             // string | string[]
  cc: "cc@example.com",            // optional
  bcc: ["bcc1@example.com"],      // optional
  subject: "Subject",
  html: "<h1>HTML body</h1>",      // html or text required
  text: "Text body",                // combined with html = multipart/alternative
  from: { email: "custom@example.com", name: "Custom" },
  replyTo: "reply@example.com",
  headers: { "X-Priority": "1" },
});
```

## Configuration Options

| Option | Description | Default |
|--------|------|--------|
| `driver` | Transport method | `"log"` |
| `sendmailPath` | sendmail executable | `"sendmail"` |
| `sendmailArgs` | sendmail arguments | `["-t", "-i"]` |
| `useBunShell` | Use Bun.$ shell | `false` |
| `smtp.host` | SMTP server | `"localhost"` |
| `smtp.port` | SMTP port | `587` |
| `smtp.secure` | Use TLS | `false` |
| `from.email` | Default sender email | `"noreply@bunigniter.dev"` |
| `logDir` | Log directory | `"./storage/logs"` |
