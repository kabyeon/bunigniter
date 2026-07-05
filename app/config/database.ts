// ============================================================
// BunIgniter - 데이터베이스 설정
// app/config/database.ts
// CodeIgniter3 의 application/config/database.php 와 동일
// ============================================================

export interface DatabaseConfig {
	/** 기본 연결 그룹 */
	defaultGroup: string;
	/** 연결 그룹 목록 */
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

const config: DatabaseConfig = {
	defaultGroup: "default",

	groups: {
		default: {
			adapter: "sqlite",
			filename: "./database/bunigniter.db",
			create: true,
		},
		// PostgreSQL:
		// postgres: {
		//   adapter: "postgres",
		//   url: "postgres://user:pass@localhost:5432/mydb",
		//   max: 20,
		//   idleTimeout: 30,
		// },
		// MySQL:
		// mysql: {
		//   adapter: "mysql",
		//   url: "mysql://user:pass@localhost:3306/mydb",
		//   max: 10,
		// },
	},
};

export default config;
