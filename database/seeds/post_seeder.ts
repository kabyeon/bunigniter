/**
 * 시더: post_seeder
 * 생성일: 2026-07-05
 *
 * 실행: bun run igniter db:seed --files=post_seeder
 */
import type { SQL } from "bun";

export async function run(_sql: SQL): Promise<void> {
	// TODO: 시드 데이터를 입력하세요
	// 예시:
	// await sql`INSERT INTO posts (name, email) VALUES (Alice, alice@example.com)`;
	// await sql`INSERT INTO posts (name, email) VALUES (Bob, bob@example.com)`;

	console.log("  🌱 post_seeder 실행 완료");
}
