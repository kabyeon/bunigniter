// ============================================================
// BunIgniter - Test Helpers
// Bun 내장 테스트 러너(bun:test)를 위한 헬퍼
// ============================================================

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL } from "bun";

export { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test };

/**
 * 테스트용 인메모리 SQLite 데이터베이스 생성
 *
 * 사용법:
 *   const db = await createTestDB();
 *   await db`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`;
 *   await db`INSERT INTO users (name) VALUES (${'Alice'})`;
 *   const users = await db`SELECT * FROM users`;
 *   await db.close();
 */
export async function createTestDB(): Promise<SQL> {
	const db = new SQL({
		adapter: "sqlite",
		filename: ":memory:",
	});
	return db;
}

/**
 * 테스트용 HTTP 요청 헬퍼
 *
 * 사용법:
 *   const res = await testRequest("GET", "/users");
 *   const res = await testRequest("POST", "/users", { name: "Alice" });
 *   expect(res.status).toBe(200);
 */
export async function testRequest(
	method: string,
	path: string,
	body?: Record<string, any>,
	headers?: Record<string, string>,
	baseUrl: string = "http://localhost:3000",
): Promise<Response> {
	const url = `${baseUrl}${path}`;
	const init: RequestInit = {
		method,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
	};

	if (body && ["POST", "PUT", "PATCH"].includes(method)) {
		init.body = JSON.stringify(body);
	}

	return fetch(url, init);
}

/**
 * 테스트용 FormData 요청
 */
export async function testFormRequest(
	method: string,
	path: string,
	fields: Record<string, string>,
	files?: Record<string, Blob>,
	baseUrl: string = "http://localhost:3000",
): Promise<Response> {
	const url = `${baseUrl}${path}`;
	const formData = new FormData();

	for (const [key, value] of Object.entries(fields)) {
		formData.append(key, value);
	}

	if (files) {
		for (const [key, file] of Object.entries(files)) {
			formData.append(key, file);
		}
	}

	return fetch(url, {
		method,
		body: formData,
	});
}

/**
 * JSON 응답 파싱 헬퍼
 */
export async function parseJsonResponse(response: Response): Promise<any> {
	const text = await response.text();
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
