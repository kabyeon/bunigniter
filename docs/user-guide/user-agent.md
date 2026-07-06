# 🔍 User Agent 라이브러리

브라우저, OS, 모바일, 봇, 태블릿을 감지합니다. CodeIgniter 3의 User Agent Library와 동일합니다.

## 기본 사용법

```typescript
import { UserAgent } from "system/core/user_agent.ts";

// Request 객체에서 파싱
const ua = UserAgent.parse(request);

console.log(ua.browser);         // "Chrome"
console.log(ua.browserVersion);  // "120.0.0.0"
console.log(ua.os);              // "Windows"
console.log(ua.osVersion);       // "10.0"
console.log(ua.platform);        // "Windows"
console.log(ua.isMobile);        // false
console.log(ua.isBot);           // false
console.log(ua.isTablet);        // false
console.log(ua.raw);             // 원본 UA 문자열
```

## UA 문자열 직접 파싱

```typescript
const ua = UserAgent.parse("Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) Mobile Safari");
expect(ua.browser).toBe("Safari");
expect(ua.isMobile).toBe(true);
```

## 정적 메서드 (CI3 스타일)

CI3의 `$this->agent->is_browser()` 패턴:

```typescript
// 브라우저 여부
UserAgent.isBrowser(request);          // true (Unknown 이외)
UserAgent.isBrowser(request, "Chrome"); // true
UserAgent.isBrowser(request, "Firefox"); // false

// 모바일 여부
UserAgent.isMobile(request);           // true/false

// 봇 여부
UserAgent.isBot(request);              // true/false

// 태블릿 여부
UserAgent.isTablet(request);           // true/false

// 브라우저 이름
UserAgent.browser(request);            // "Chrome"

// 플랫폼
UserAgent.platform(request);           // "Windows", "macOS", "iOS", "Android"

// 모바일 기기 이름
UserAgent.mobile(request);             // "iPhone", "iPad", "Android", ""
```

## 감지 목록

### 브라우저

| 브라우저 | 감지 패턴 |
|---------|----------|
| Chrome | `Chrome/버전` |
| Firefox | `Firefox/버전` |
| Safari | `Safari/버전` |
| Edge | `Edge/버전`, `Edg/버전` |
| Opera | `OPR/버전`, `Opera/버전` |
| Vivaldi | `Vivaldi/버전` |
| Samsung Browser | `SamsungBrowser/버전` |

### 운영체제

| OS | 감지 패턴 |
|----|----------|
| Windows | `Windows NT 버전` |
| macOS | `Mac OS X 버전` |
| iOS | `iPhone OS 버전`, `iPad OS 버전` |
| Android | `Android 버전` |
| Linux | `Linux` |
| Chrome OS | `CrOS` |

### 봇 (30+ 패턴)

Googlebot, Bingbot, Yahoo Slurp, DuckDuckBot, Baiduspider, YandexBot, Facebook, Twitter, LinkedIn, Slack, Discord, Telegram, WhatsApp, AhrefsBot, SemrushBot, curl, wget, Python-requests, Axios, Postman, 등

## 컨트롤러에서 사용

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { UserAgent } from "system/core/user_agent.ts";

export class PostController extends Controller {
  async index({ request }: Context) {
    const ua = UserAgent.parse(request);

    if (ua.isMobile) {
      // 모바일 전용 뷰
      return this.view("posts/mobile-index", { posts });
    }

    if (ua.isBot) {
      // 봇 차단 또는 특별 처리
      return this.view("posts/index", { posts, noIndex: true });
    }

    return this.view("posts/index", { posts });
  }
}
```

## CI3 ↔ BunIgniter 대조표

| CodeIgniter 3 | BunIgniter |
|---------------|-----------|
| `$this->agent->is_browser()` | `UserAgent.isBrowser(request)` |
| `$this->agent->is_browser('Chrome')` | `UserAgent.isBrowser(request, "Chrome")` |
| `$this->agent->is_mobile()` | `UserAgent.isMobile(request)` |
| `$this->agent->is_robot()` | `UserAgent.isBot(request)` |
| `$this->agent->browser()` | `UserAgent.browser(request)` |
| `$this->agent->platform()` | `UserAgent.platform(request)` |
| `$this->agent->mobile()` | `UserAgent.mobile(request)` |
| `$this->agent->agent_string()` | `UserAgent.parse(request).raw` |
