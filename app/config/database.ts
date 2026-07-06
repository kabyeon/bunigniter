// ============================================================
// BunIgniter - 데이터베이스 설정
// app/config/database.ts
// CodeIgniter3 의 application/config/database.php 와 동일
// ============================================================

import type { DatabaseConfig } from "system/core/config_types.ts";

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
