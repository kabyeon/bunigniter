// ============================================================
// BunIgniter - 앱 설정
// app/config/app.ts
// CodeIgniter3 의 application/config/config.php 와 동일
// ============================================================

export interface AppConfig {
	/** 기본 URL */
	baseUrl: string;
	/** 앱 이름 */
	appName: string;
	/** 환경: development | production | testing */
	env: string;
	/** 기본 컨트롤러 */
	defaultController: string;
	/** 기본 액션 */
	defaultMethod: string;
	/** 타임존 */
	timezone: string;
	/** 언어 */
	locale: string;
	/** 디버그 모드 */
	debug: boolean;
	/** 세션 설정 */
	session: {
		cookieName: string;
		expiration: number;
		/** 세션 드라이버: "memory" | "file" | "redis" */
		driver: string;
		/** 파일 세션 경로 (file 드라이버 시) */
		path?: string;
		/** Redis URL (redis 드라이버 시) */
		redisUrl?: string;
	};
	/** CSRF 보호 */
	csrf: {
		enabled: boolean;
		tokenName: string;
		cookieName: string;
	};
}

const config: AppConfig = {
	baseUrl: process.env.BASE_URL ?? "http://localhost:3000",
	appName: process.env.APP_NAME ?? "BunIgniter",
	env: process.env.NODE_ENV ?? "development",
	defaultController: "welcome",
	defaultMethod: "index",
	timezone: "Asia/Seoul",
	locale: "ko",
	debug: (process.env.APP_DEBUG ?? "true") === "true",
	session: {
		cookieName: "bunigniter_session",
		expiration: 7200,
		driver: "file",
		path: "./storage/sessions",
	},
	csrf: {
		enabled: false,
		tokenName: "csrf_token",
		cookieName: "csrf_cookie",
	},
};

export default config;
