// ============================================================
// BunIgniter - 감사 로그 마이그레이션
// database/migrations/<timestamp>_create_audit_logs_table.ts
// ============================================================

import type { SQL } from "bun";

export async function up(db: SQL): Promise<void> {
	await db`CREATE TABLE IF NOT EXISTS audit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event TEXT NOT NULL,
		entity_type TEXT NOT NULL,
		entity_id TEXT NOT NULL,
		old_values TEXT,
		new_values TEXT,
		user_id INTEGER,
		ip_address TEXT,
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`;
}

export async function down(db: SQL): Promise<void> {
	await db`DROP TABLE IF EXISTS audit_logs`;
}
