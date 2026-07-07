# 🔍 User Agent Library

Detects browser, OS, mobile, bot, and tablet. Equivalent to CodeIgniter 3's User Agent Library.

## Basic Usage

```typescript
import { UserAgent } from "system/core/user_agent.ts";

// Parse from Request object
const ua = UserAgent.parse(request);

console.log(ua.browser);         // "Chrome"
console.log(ua.browserVersion);  // "120.0.0.0"
console.log(ua.os);              // "Windows"
console.log(ua.osVersion);       // "10.0"
console.log(ua.platform);        // "Windows"
console.log(ua.isMobile);        // false
console.log(ua.isBot);           // false
console.log(ua.isTablet);        // false
console.log(ua.raw);             // raw UA string
```

## Parsing UA String Directly

```typescript
const ua = UserAgent.parse("Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) Mobile Safari");
expect(ua.browser).toBe("Safari");
expect(ua.isMobile).toBe(true);
```

## Static Methods (CI3 Style)

CI3's `$this->agent->is_browser()` pattern:

```typescript
// Is browser
UserAgent.isBrowser(request);          // true (any except Unknown)
UserAgent.isBrowser(request, "Chrome"); // true
UserAgent.isBrowser(request, "Firefox"); // false

// Is mobile
UserAgent.isMobile(request);           // true/false

// Is bot
UserAgent.isBot(request);              // true/false

// Is tablet
UserAgent.isTablet(request);           // true/false

// Browser name
UserAgent.browser(request);            // "Chrome"

// Platform
UserAgent.platform(request);           // "Windows", "macOS", "iOS", "Android"

// Mobile device name
UserAgent.mobile(request);             // "iPhone", "iPad", "Android", ""
```

## Detection Lists

### Browsers

| Browser | Detection Pattern |
|---------|------------------|
| Chrome | `Chrome/version` |
| Firefox | `Firefox/version` |
| Safari | `Safari/version` |
| Edge | `Edge/version`, `Edg/version` |
| Opera | `OPR/version`, `Opera/version` |
| Vivaldi | `Vivaldi/version` |
| Samsung Browser | `SamsungBrowser/version` |

### Operating Systems

| OS | Detection Pattern |
|----|------------------|
| Windows | `Windows NT version` |
| macOS | `Mac OS X version` |
| iOS | `iPhone OS version`, `iPad OS version` |
| Android | `Android version` |
| Linux | `Linux` |
| Chrome OS | `CrOS` |

### Bots (30+ patterns)

Googlebot, Bingbot, Yahoo Slurp, DuckDuckBot, Baiduspider, YandexBot, Facebook, Twitter, LinkedIn, Slack, Discord, Telegram, WhatsApp, AhrefsBot, SemrushBot, curl, wget, Python-requests, Axios, Postman, etc.

## Usage in Controllers

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import { UserAgent } from "system/core/user_agent.ts";

export class PostController extends Controller {
  async index({ request }: Context) {
    const ua = UserAgent.parse(request);

    if (ua.isMobile) {
      // Mobile-specific view
      return this.view("posts/mobile-index", { posts });
    }

    if (ua.isBot) {
      // Block bot or special handling
      return this.view("posts/index", { posts, noIndex: true });
    }

    return this.view("posts/index", { posts });
  }
}
```

## CI3 ↔ BunIgniter Comparison

| CodeIgniter 3 | BunIgniter |
|---------------|------------|
| `$this->agent->is_browser()` | `UserAgent.isBrowser(request)` |
| `$this->agent->is_browser('Chrome')` | `UserAgent.isBrowser(request, "Chrome")` |
| `$this->agent->is_mobile()` | `UserAgent.isMobile(request)` |
| `$this->agent->is_robot()` | `UserAgent.isBot(request)` |
| `$this->agent->browser()` | `UserAgent.browser(request)` |
| `$this->agent->platform()` | `UserAgent.platform(request)` |
| `$this->agent->mobile()` | `UserAgent.mobile(request)` |
| `$this->agent->agent_string()` | `UserAgent.parse(request).raw` |
