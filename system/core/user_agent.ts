// ============================================================
// BunIgniter - User Agent 라이브러리
// CodeIgniter3 의 User Agent Library 와 동일
// 브라우저/봇/모바일/OS/플랫폼 감지
// ============================================================

/**
 * User Agent 감지 결과
 */
export interface UserAgentInfo {
	/** 브라우저 이름 */
	browser: string;
	/** 브라우저 버전 */
	browserVersion: string;
	/** 운영체제 */
	os: string;
	/** OS 버전 */
	osVersion: string;
	/** 플랫폼 */
	platform: string;
	/** 모바일 여부 */
	isMobile: boolean;
	/** 봇 여부 */
	isBot: boolean;
	/** 태블릿 여부 */
	isTablet: boolean;
	/** 원본 User-Agent 문자열 */
	raw: string;
}

// ─── 브라우저 패턴 (순서 중요: 구체적인 것 먼저) ─────────

const BROWSER_PATTERNS: [RegExp, string][] = [
	[/\bEdge\/(\d+[.\d]*)/, "Edge"],
	[/\bEdg\/(\d+[.\d]*)/, "Edge"],
	[/\bOPR\/(\d+[.\d]*)/, "Opera"],
	[/\bOpera\/(\d+[.\d]*)/, "Opera"],
	[/\bVivaldi\/(\d+[.\d]*)/, "Vivaldi"],
	[/\bSamsungBrowser\/(\d+[.\d]*)/, "Samsung Browser"],
	[/\bFirefox\/(\d+[.\d]*)/, "Firefox"],
	[/\bFxiOS\/(\d+[.\d]*)/, "Firefox iOS"],
	[/\bChrome\/(\d+[.\d]*)/, "Chrome"],
	[/\bCriOS\/(\d+[.\d]*)/, "Chrome iOS"],
	[/\bSafari\/(\d+[.\d]*)/, "Safari"],
];

// ─── OS 패턴 ──────────────────────────────────────────────

const OS_PATTERNS: [RegExp, string][] = [
	[/Windows NT (\d+[.\d]*)/, "Windows"],
	[/Mac OS X (\d+[._\d]*)/, "macOS"],
	[/iPhone OS (\d+[._\d]*)/, "iOS"],
	[/iPad.*OS (\d+[._\d]*)/, "iOS"],
	[/Android (\d+[.\d]*)/, "Android"],
	[/Linux/, "Linux"],
	[/CrOS/, "Chrome OS"],
	[/Ubuntu/, "Ubuntu"],
];

// ─── 모바일 기기 패턴 ──────────────────────────────────────

const MOBILE_PATTERNS = [
	/Android/i,
	/iPhone/i,
	/iPod/i,
	/Windows Phone/i,
	/BlackBerry/i,
	/BB10/i,
	/webOS/i,
	/Mobile/i,
];

const TABLET_PATTERNS = [
	/iPad/i,
	/Android(?!.*Mobile)/i, // Android without Mobile
	/Kindle/i,
	/Silk/i,
	/PlayBook/i,
];

// ─── 봇 패턴 ──────────────────────────────────────────────

const BOT_PATTERNS = [
	/Googlebot/i,
	/bingbot/i,
	/Slurp/i, // Yahoo
	/DuckDuckBot/i,
	/Baiduspider/i,
	/YandexBot/i,
	/facebookexternalhit/i,
	/Twitterbot/i,
	/LinkedInBot/i,
	/Slackbot/i,
	/Discordbot/i,
	/TelegramBot/i,
	/WhatsApp/i,
	/AhrefsBot/i,
	/MJ12bot/i,
	/SemrushBot/i,
	/bot/i,
	/crawler/i,
	/spider/i,
	/scraper/i,
	/curl/i,
	/wget/i,
	/python-requests/i,
	/httpclient/i,
	/java\//i,
	/node-fetch/i,
	/node-superagent/i,
	/Axios/i,
	/PostmanRuntime/i,
];

/**
 * User Agent 라이브러리
 *
 * 사용법:
 *   import { UserAgent } from "system/core/user_agent.ts";
 *
 *   const ua = UserAgent.parse(request);
 *   if (ua.isMobile) { ... }
 *   if (ua.isBot) { ... }
 *   console.log(ua.browser); // "Chrome"
 *   console.log(ua.os);      // "macOS"
 *
 * CI3: $this->agent->is_browser(), $this->agent->is_mobile(), $this->agent->is_robot()
 */
export class UserAgent {
	/**
	 * User-Agent 문자열에서 정보 파싱
	 */
	static parse(requestOrUA: Request | string): UserAgentInfo {
		const raw =
			typeof requestOrUA === "string" ? requestOrUA : (requestOrUA.headers.get("user-agent") ?? "");

		if (!raw) {
			return {
				browser: "Unknown",
				browserVersion: "",
				os: "Unknown",
				osVersion: "",
				platform: "Unknown",
				isMobile: false,
				isBot: false,
				isTablet: false,
				raw: "",
			};
		}

		const browser = detectBrowser(raw);
		const os = detectOS(raw);
		const isMobile = MOBILE_PATTERNS.some((p) => p.test(raw));
		const isTablet = TABLET_PATTERNS.some((p) => p.test(raw));
		const isBot = BOT_PATTERNS.some((p) => p.test(raw));

		// 플랫폼 결정
		let platform = "Unknown";
		if (/iPhone|iPad|iPod/.test(raw)) platform = "iOS";
		else if (/Android/.test(raw)) platform = "Android";
		else if (/Windows/.test(raw)) platform = "Windows";
		else if (/Mac/.test(raw)) platform = "Mac";
		else if (/Linux/.test(raw)) platform = "Linux";

		return {
			browser: browser.name,
			browserVersion: browser.version,
			os: os.name,
			osVersion: os.version,
			platform,
			isMobile,
			isBot,
			isTablet,
			raw,
		};
	}

	/**
	 * 브라우저 여부 확인
	 * CI3: $this->agent->is_browser('Chrome')
	 */
	static isBrowser(request: Request, name?: string): boolean {
		const ua = UserAgent.parse(request);
		if (!name) return ua.browser !== "Unknown";
		return ua.browser.toLowerCase().includes(name.toLowerCase());
	}

	/**
	 * 모바일 여부 확인
	 * CI3: $this->agent->is_mobile()
	 */
	static isMobile(request: Request): boolean {
		return UserAgent.parse(request).isMobile;
	}

	/**
	 * 봇 여부 확인
	 * CI3: $this->agent->is_robot()
	 */
	static isBot(request: Request): boolean {
		return UserAgent.parse(request).isBot;
	}

	/**
	 * 태블릿 여부 확인
	 */
	static isTablet(request: Request): boolean {
		return UserAgent.parse(request).isTablet;
	}

	/**
	 * 브라우저 이름 반환
	 * CI3: $this->agent->browser()
	 */
	static browser(request: Request): string {
		return UserAgent.parse(request).browser;
	}

	/**
	 * 운영체제 반환
	 * CI3: $this->agent->platform()
	 */
	static platform(request: Request): string {
		return UserAgent.parse(request).platform;
	}

	/**
	 * 모바일 기기 이름 반환
	 * CI3: $this->agent->mobile()
	 */
	static mobile(request: Request): string {
		const ua = UserAgent.parse(request);
		if (!ua.isMobile) return "";
		// 모바일 기기 식별
		if (/iPhone/.test(ua.raw)) return "iPhone";
		if (/iPad/.test(ua.raw)) return "iPad";
		if (/Android/.test(ua.raw)) return "Android";
		if (/Windows Phone/.test(ua.raw)) return "Windows Phone";
		if (/BlackBerry/.test(ua.raw)) return "BlackBerry";
		return "Mobile";
	}
}

// ─── 내부 감지 함수 ─────────────────────────────────────

function detectBrowser(ua: string): { name: string; version: string } {
	for (const [pattern, name] of BROWSER_PATTERNS) {
		const match = ua.match(pattern);
		if (match) {
			return { name, version: match[1]?.replace(/_/g, ".") ?? "" };
		}
	}
	return { name: "Unknown", version: "" };
}

function detectOS(ua: string): { name: string; version: string } {
	for (const [pattern, name] of OS_PATTERNS) {
		const match = ua.match(pattern);
		if (match) {
			return { name, version: match[1]?.replace(/_/g, ".") ?? "" };
		}
	}
	return { name: "Unknown", version: "" };
}
