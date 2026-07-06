// ============================================================
// BunIgniter - 앱 설정
// app/config/app.ts
// CodeIgniter3 의 application/config/config.php 와 동일
// ============================================================

import type { AppConfig } from "system/core/config_types.ts";

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
