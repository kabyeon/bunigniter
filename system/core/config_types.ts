// ============================================================
// BunIgniter - 설정 타입 정의
// app/config/ 파일의 인터페이스를 system/ 에 정의
// npm 패키지 모드에서 ../../app 타입 import 제거
// ============================================================

/** 앱 설정 인터페이스 (app/config/app.ts) */
export interface AppConfig {
	baseUrl: string;
	appName: string;
	env: string;
	defaultController: string;
	defaultMethod: string;
	timezone: string;
	locale: string;
	debug: boolean;
	session: {
		cookieName: string;
		expiration: number;
		driver: string;
		path?: string;
		redisUrl?: string;
	};
	csrf: {
		enabled: boolean;
		tokenName: string;
		cookieName: string;
	};
}

/** 데이터베이스 설정 인터페이스 (app/config/database.ts) */
export interface DatabaseConfig {
	defaultGroup: string;
	groups: Record<
		string,
		{
			adapter: "sqlite" | "postgres" | "mysql";
			filename?: string;
			url?: string;
			hostname?: string;
			port?: number;
			database?: string;
			username?: string;
			password?: string;
			max?: number;
			idleTimeout?: number;
			readonly?: boolean;
			create?: boolean;
		}
	>;
}
