/**
 * 마이그레이션: create_posts_table
 * 생성일: 2026-07-05
 */
import { SQL } from "bun";

export async function up(sql: SQL): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name STRING NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export async function down(sql: SQL): Promise<void> {
  await sql`
    DROP TABLE IF EXISTS posts
  `;
}
