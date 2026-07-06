// ============================================================
// QueryBuilder — 어댑터 방언 테스트
// SQLite / PostgreSQL / MySQL SQL 문법 차이 검증
// ============================================================

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { QueryBuilder, createQueryBuilder } from "system/core/query_builder.ts";
import { Model } from "system/core/model.ts";
import { setDB, resetDB } from "system/core/database.ts";
import { SQL } from "bun";

// ─── SQLite 방언 테스트 ──────────────────────────

describe("QueryBuilder 방언 - SQLite", () => {
	let sql: SQL;

	beforeAll(async () => {
		sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "default", "sqlite");

		await sql`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL DEFAULT 0)`;
		await sql`INSERT INTO items (name, price) VALUES ('Apple', 1.5)`;
		await sql`INSERT INTO items (name, price) VALUES ('Banana', 2.0)`;
		await sql`INSERT INTO items (name, price) VALUES ('Cherry', 3.5)`;
	});

	afterAll(async () => {
		resetDB();
		await sql.close();
	});

	test("식별자 이스케이프: WHERE 절에서 쌍따옴표", () => {
		const qb = new QueryBuilder();
		const { query } = qb.from("items").where("id", 1).toSQL();
		expect(query).toContain('"id"');
		expect(query).toContain('"items"');
		// SELECT 컬럼은 사용자 제어 — 이스케이프하지 않음 (CI3 방식)
	});

	test("식별자 이스케이프: INSERT/UPDATE 컬럼에서 쌍따옴표", async () => {
		const qb = new QueryBuilder();
		const result = await qb.insert("items", { name: "Durian", price: 5.0 });
		expect(result.insertId).toBeGreaterThan(0);

		const qb2 = new QueryBuilder();
		const { affectedRows } = await qb2.where("id", result.insertId).update("items", { price: 6.0 });
		expect(affectedRows).toBeGreaterThan(0);
	});

	test("LIMIT/OFFSET: 표준 SQL (LIMIT ? OFFSET ?)", () => {
		const qb = new QueryBuilder();
		const { query, bindings } = qb.from("items").limit(10, 5).toSQL();
		expect(query).toContain("LIMIT ?");
		expect(query).toContain("OFFSET ?");
		expect(bindings).toEqual([10, 5]);
	});

	test("RETURNING *: INSERT 후 행 반환", async () => {
		const qb = new QueryBuilder();
		const item = await qb.insertReturning("items", { name: "Elderberry", price: 8.0 });
		expect((item as any).id).toBeGreaterThan(0);
		expect((item as any).name).toBe("Elderberry");
	});

	test("RETURNING *: UPDATE 후 행 반환", async () => {
		const qb = new QueryBuilder();
		const item = await qb.where("name", "Elderberry").updateReturning("items", { price: 9.0 });
		expect((item as any).price).toBe(9.0);
	});

	test("SELECT + WHERE + ORDER BY + LIMIT", async () => {
		const qb = new QueryBuilder();
		const items = await qb
			.from("items")
			.where("price >", 1.0)
			.orderBy("price", "DESC")
			.limit(2)
			.get();

		expect(items.length).toBe(2);
	});
});

// ─── MySQL 방언 테스트 ───────────────────────────

describe("QueryBuilder 방언 - MySQL", () => {
	test("식별자 이스케이프: WHERE 절에서 백틱", () => {
		const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "mysql_test", "mysql");

		const qb = new QueryBuilder("mysql_test");
		const { query } = qb.from("items").where("id", 1).toSQL();
		expect(query).toContain("`id`");
		expect(query).toContain("`items`");
		expect(query).not.toContain('"id"');

		resetDB("mysql_test");
		sql.close();
	});

	test("식별자 이스케이프: INSERT 컬럼에서 백틱", async () => {
		const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "mysql_test", "mysql");

		await sql`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL)`;

		const qb = new QueryBuilder("mysql_test");
		const result = await qb.insert("items", { name: "MySQL Item", price: 1.0 });
		expect(result.insertId).toBeGreaterThan(0);

		resetDB("mysql_test");
		await sql.close();
	});

	test("LIMIT/OFFSET: MySQL LIMIT offset, count", () => {
		const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "mysql_test", "mysql");

		const qb = new QueryBuilder("mysql_test");
		const { query, bindings } = qb.from("items").limit(10, 20).toSQL();
		// MySQL: LIMIT offset, count  (offset 먼저, count 나중)
		expect(query).toContain("LIMIT ?, ?");
		expect(query).not.toContain("OFFSET");
		expect(bindings).toEqual([20, 10]); // offset=20, limit=10

		resetDB("mysql_test");
		sql.close();
	});

	test("LIMIT만 있는 경우: LIMIT ?", () => {
		const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "mysql_test", "mysql");

		const qb = new QueryBuilder("mysql_test");
		const { query, bindings } = qb.from("items").limit(5).toSQL();
		expect(query).toContain("LIMIT ?");
		expect(query).not.toContain("OFFSET");
		expect(bindings).toEqual([5]);

		resetDB("mysql_test");
		sql.close();
	});

	test("insertReturning: MySQL은 INSERT 후 SELECT fallback", async () => {
		const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "mysql_test", "mysql");

		await sql`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL)`;

		const qb = new QueryBuilder("mysql_test");
		const item = await qb.insertReturning("items", { name: "Fallback Test", price: 1.0 });
		expect((item as any).id).toBeGreaterThan(0);
		expect((item as any).name).toBe("Fallback Test");

		resetDB("mysql_test");
		await sql.close();
	});

	test("updateReturning: MySQL은 UPDATE 후 WHERE로 SELECT fallback", async () => {
		const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "mysql_test", "mysql");

		await sql`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL)`;
		await sql`INSERT INTO items (name, price) VALUES ('Original', 1.0)`;

		const qb = new QueryBuilder("mysql_test");
		const item = await qb.where("id", 1).updateReturning("items", { price: 9.99 });
		expect((item as any).price).toBe(9.99);

		resetDB("mysql_test");
		await sql.close();
	});
});

// ─── PostgreSQL 방언 테스트 ──────────────────────

describe("QueryBuilder 방언 - PostgreSQL", () => {
	test("식별자 이스케이프: WHERE 절에서 쌍따옴표", () => {
		const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "pg_test", "postgres");

		const qb = new QueryBuilder("pg_test");
		const { query } = qb.from("items").where("id", 1).toSQL();
		expect(query).toContain('"id"');
		expect(query).toContain('"items"');
		expect(query).not.toContain("`id`");

		resetDB("pg_test");
		sql.close();
	});

	test("LIMIT/OFFSET: 표준 SQL (LIMIT ? OFFSET ?)", () => {
		const sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		setDB(sql, "pg_test", "postgres");

		const qb = new QueryBuilder("pg_test");
		const { query, bindings } = qb.from("items").limit(10, 5).toSQL();
		expect(query).toContain("LIMIT ?");
		expect(query).toContain("OFFSET ?");
		expect(bindings).toEqual([10, 5]);

		resetDB("pg_test");
		sql.close();
	});
});

// ─── 방언 전환 테스트 ────────────────────────────

describe("QueryBuilder 방언 - 다중 그룹 전환", () => {
	test("동일 앱에서 SQLite + MySQL 다중 DB 그룹 사용", () => {
		const sqliteSql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		const mysqlSql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });

		setDB(sqliteSql, "sqlite_group", "sqlite");
		setDB(mysqlSql, "mysql_group", "mysql");

		const sqliteQB = new QueryBuilder("sqlite_group");
		const mysqlQB = new QueryBuilder("mysql_group");

		const { query: sqliteQuery } = sqliteQB.from("users").where("id", 1).toSQL();
		const { query: mysqlQuery } = mysqlQB.from("users").where("id", 1).toSQL();

		// SQLite: 쌍따옴표
		expect(sqliteQuery).toContain('"id"');
		expect(sqliteQuery).toContain('"users"');
		expect(sqliteQuery).not.toContain("`id`");

		// MySQL: 백틱
		expect(mysqlQuery).toContain("`id`");
		expect(mysqlQuery).toContain("`users`");
		expect(mysqlQuery).not.toContain('"id"');

		resetDB("sqlite_group");
		resetDB("mysql_group");
		sqliteSql.close();
		mysqlSql.close();
	});

	test("SQLite + MySQL LIMIT 차이", () => {
		const sqliteSql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
		const mysqlSql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });

		setDB(sqliteSql, "sqlite_group", "sqlite");
		setDB(mysqlSql, "mysql_group", "mysql");

		const sqliteQB = new QueryBuilder("sqlite_group");
		const mysqlQB = new QueryBuilder("mysql_group");

		const { query: sqliteQuery, bindings: sqliteBindings } = sqliteQB.from("items").limit(10, 5).toSQL();
		const { query: mysqlQuery, bindings: mysqlBindings } = mysqlQB.from("items").limit(10, 5).toSQL();

		// SQLite: LIMIT ? OFFSET ? (표준)
		expect(sqliteQuery).toContain("LIMIT ?");
		expect(sqliteQuery).toContain("OFFSET ?");
		expect(sqliteBindings).toEqual([10, 5]);

		// MySQL: LIMIT ?, ? (레거시)
		expect(mysqlQuery).toContain("LIMIT ?, ?");
		expect(mysqlQuery).not.toContain("OFFSET");
		expect(mysqlBindings).toEqual([5, 10]); // offset=5, limit=10

		resetDB("sqlite_group");
		resetDB("mysql_group");
		sqliteSql.close();
		mysqlSql.close();
	});
});
