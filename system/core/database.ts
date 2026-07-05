// ============================================================
// BunIgniter - 데이터베이스 매니저
// Bun SQL 통합 (SQLite / PostgreSQL / MySQL)
// ============================================================

import { SQL } from "bun";
import { loadConfig } from "./config.ts";
import type { DatabaseConfig } from "../../app/config/database.ts";

/** 데이터베이스 연결 인스턴스 캐시 */
const connections: Record<string, SQL> = {};

/**
 * 데이터베이스 연결을 가져옵니다.
 * CodeIgniter3 의 $this->db 와 동일
 */
export async function getDB(group?: string): Promise<SQL> {
	const config = await loadConfig<DatabaseConfig>("database");
	const groupName = group ?? config.defaultGroup;

	if (connections[groupName]) return connections[groupName];

	const groupConfig = config.groups[groupName];
	if (!groupConfig) {
		throw new Error(`Database group "${groupName}" not found in config`);
	}

	let sql: SQL;

	switch (groupConfig.adapter) {
		case "sqlite":
			sql = new SQL({
				adapter: "sqlite",
				filename: groupConfig.filename ?? ":memory:",
				create: groupConfig.create ?? true,
				readonly: groupConfig.readonly ?? false,
			});
			break;

		case "postgres":
			sql = new SQL({
				url: groupConfig.url,
				hostname: groupConfig.hostname,
				port: groupConfig.port,
				database: groupConfig.database,
				username: groupConfig.username,
				password: groupConfig.password,
				max: groupConfig.max ?? 10,
				idleTimeout: groupConfig.idleTimeout ?? 30,
			});
			break;

		case "mysql":
			sql = new SQL({
				adapter: "mysql",
				url: groupConfig.url,
				hostname: groupConfig.hostname,
				port: groupConfig.port,
				database: groupConfig.database,
				username: groupConfig.username,
				password: groupConfig.password,
				max: groupConfig.max ?? 10,
				idleTimeout: groupConfig.idleTimeout ?? 30,
			});
			break;

		default:
			throw new Error(`Unsupported adapter: ${groupConfig.adapter}`);
	}

	connections[groupName] = sql;
	return sql;
}

/**
 * 모든 연결 종료
 */
export async function closeAllConnections(): Promise<void> {
	for (const [name, sql] of Object.entries(connections)) {
		await sql.close();
		delete connections[name];
	}
}
