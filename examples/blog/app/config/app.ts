import type { AppConfig } from "system/core/config_types.ts";

const config: AppConfig = {
	baseUrl: process.env.BASE_URL ?? "http://localhost:3001",
	appName: process.env.APP_NAME ?? "BunIgniter Blog",
	env: process.env.NODE_ENV ?? "development",
	defaultController: "post",
	defaultMethod: "index",
	timezone: "Asia/Seoul",
	locale: "ko",
	debug: (process.env.APP_DEBUG ?? "true") === "true",
	session: {
		cookieName: "blog_session",
		expiration: 7200,
		driver: "file",
		path: "./storage/sessions",
	},
	csrf: {
		enabled: true,
		tokenName: "csrf_token",
		cookieName: "csrf_cookie",
	},
};

export default config;
