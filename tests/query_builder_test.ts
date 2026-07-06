// ============================================================
// QueryBuilder (Active Record) 테스트
// CI3 스타일 쿼리 빌더 패턴 검증
// ============================================================

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL } from "bun";
import { resetDB, setDB } from "system/core/database.ts";
import { Model } from "system/core/model.ts";
import { createQueryBuilder, QueryBuilder } from "system/core/query_builder.ts";

// ─── 테스트용 DB 설정 ────────────────────────────
let sql: SQL;

beforeAll(async () => {
	sql = new SQL({ adapter: "sqlite", filename: ":memory:", create: true });
	setDB(sql, "default");

	await sql`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, role TEXT DEFAULT 'user', age INTEGER)`;
	await sql`CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL, content TEXT DEFAULT '', published INTEGER DEFAULT 0, author_id INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;

	await sql`INSERT INTO users (name, email, role, age) VALUES ('Admin', 'admin@test.com', 'admin', 35)`;
	await sql`INSERT INTO users (name, email, role, age) VALUES ('Author', 'author@test.com', 'author', 28)`;
	await sql`INSERT INTO users (name, email, role, age) VALUES ('Guest', 'guest@test.com', 'guest', 22)`;

	await sql`INSERT INTO posts (title, slug, content, published, author_id) VALUES ('Hello', 'hello', 'Hello world', 1, 1)`;
	await sql`INSERT INTO posts (title, slug, content, published, author_id) VALUES ('Second', 'second', 'Second post', 1, 2)`;
	await sql`INSERT INTO posts (title, slug, content, published, author_id) VALUES ('Draft', 'draft', 'Draft content', 0, 1)`;
});

afterAll(async () => {
	resetDB();
	await sql.close();
});

// ─── SELECT / FROM / WHERE ──────────────────────
describe("QueryBuilder - SELECT/FROM/WHERE", () => {
	test("select + from + where: 공개 포스트 조회", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.select("id, title, published").from("posts").where("published", 1).get();

		expect(posts.length).toBe(2);
		expect(posts.every((p: any) => p.published === 1)).toBe(true);
	});

	test("where 연산자: age > 25", async () => {
		const qb = new QueryBuilder();
		const users = await qb.select("name, age").from("users").where("age >", 25).get();

		expect(users.length).toBe(2);
		expect(users.every((u: any) => u.age > 25)).toBe(true);
	});

	test("whereObject: 여러 조건", async () => {
		const qb = new QueryBuilder();
		const users = await qb.from("users").whereObject({ role: "admin", age: 35 }).get();

		expect(users.length).toBe(1);
		expect((users[0] as any).name).toBe("Admin");
	});

	test("orWhere: OR 조건", async () => {
		const qb = new QueryBuilder();
		const users = await qb.from("users").where("role", "admin").orWhere("role", "author").get();

		expect(users.length).toBe(2);
	});

	test("whereIn: IN 조건", async () => {
		const qb = new QueryBuilder();
		const users = await qb.from("users").whereIn("id", [1, 2]).get();

		expect(users.length).toBe(2);
	});

	test("whereNotIn: NOT IN 조건", async () => {
		const qb = new QueryBuilder();
		const users = await qb.from("users").whereNotIn("role", ["guest"]).get();

		expect(users.length).toBe(2);
	});

	test("whereBetween: BETWEEN 조건", async () => {
		const qb = new QueryBuilder();
		const users = await qb.from("users").whereBetween("age", 25, 30).get();

		expect(users.length).toBe(1);
		expect((users[0] as any).name).toBe("Author");
	});

	test("whereNull / whereNotNull", async () => {
		// posts에 content가 있는 행
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").whereNotNull("content").get();

		expect(posts.length).toBe(3);
	});

	test("like: 키워드 검색", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").like("title", "Hel").get();

		expect(posts.length).toBe(1);
		expect((posts[0] as any).title).toBe("Hello");
	});

	test("like side=after: 접두어 검색", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").like("slug", "hel", "after").get();

		expect(posts.length).toBe(1);
	});

	test("orLike: OR 키워드 검색", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").like("title", "Hel").orLike("title", "Sec").get();

		expect(posts.length).toBe(2);
	});

	test("where raw: SQL 조건 직접 입력", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").where("published = 1").get();

		expect(posts.length).toBe(2);
	});
});

// ─── JOIN ─────────────────────────────────────────
describe("QueryBuilder - JOIN", () => {
	test("inner join: 포스트 + 작성자", async () => {
		const qb = new QueryBuilder();
		const results = await qb
			.select("p.title, u.name as author_name")
			.from("posts p")
			.join("users u", "u.id = p.author_id")
			.where("p.published", 1)
			.orderBy("p.id", "ASC")
			.get();

		expect(results.length).toBe(2);
		expect((results[0] as any).author_name).toBe("Admin");
		expect((results[1] as any).author_name).toBe("Author");
	});

	test("leftJoin", async () => {
		const qb = new QueryBuilder();
		const results = await qb
			.select("u.name, p.title")
			.from("users u")
			.leftJoin("posts p", "p.author_id = u.id AND p.published = 1")
			.orderBy("u.id", "ASC")
			.get();

		expect(results.length).toBe(3); // 3 users, Guest has no published posts
	});
});

// ─── ORDER BY / LIMIT / OFFSET ────────────────────
describe("QueryBuilder - ORDER/LIMIT/OFFSET", () => {
	test("orderBy + limit", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").orderBy("id", "DESC").limit(2).get();

		expect(posts.length).toBe(2);
		expect((posts[0] as any).id).toBe(3);
	});

	test("limit + offset (페이지네이션)", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").orderBy("id", "ASC").limit(2, 1).get();

		expect(posts.length).toBe(2);
		expect((posts[0] as any).id).toBe(2);
	});

	test("latest: created_at DESC", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").latest().get();

		expect(posts.length).toBe(3);
	});

	test("oldest: created_at ASC", async () => {
		const qb = new QueryBuilder();
		const posts = await qb.from("posts").oldest().get();

		expect(posts.length).toBe(3);
	});
});

// ─── GROUP BY / HAVING / DISTINCT ────────────────
describe("QueryBuilder - GROUP/HAVING/DISTINCT", () => {
	test("groupBy + count", async () => {
		const qb = new QueryBuilder();
		const results = await qb
			.select("author_id, COUNT(*) as post_count")
			.from("posts")
			.groupBy("author_id")
			.orderBy("author_id", "ASC")
			.get();

		expect(results.length).toBe(2);
		expect((results[0] as any).post_count).toBe(2); // admin: 2 posts
		expect((results[1] as any).post_count).toBe(1); // author: 1 post
	});

	test("distinct", async () => {
		const qb = new QueryBuilder();
		const results = await qb.select("author_id").distinct().from("posts").get();

		expect(results.length).toBe(2);
	});

	test("selectCount", async () => {
		const qb = new QueryBuilder();
		const total = await qb.from("posts").count();

		expect(total).toBe(3);
	});

	test("selectSum", async () => {
		const qb = new QueryBuilder();
		const result = await qb.selectSum("age").from("users").get<{ age: number }>();

		expect((result[0] as any).age).toBe(85); // 35 + 28 + 22
	});
});

// ─── INSERT / UPDATE / DELETE ─────────────────────
describe("QueryBuilder - CRUD", () => {
	test("insert: 새 사용자 생성", async () => {
		const qb = new QueryBuilder();
		const result = await qb.insert("users", {
			name: "NewUser",
			email: "new@test.com",
			role: "user",
			age: 30,
		});

		expect(result.insertId).toBeGreaterThan(0);
		expect(result.affectedRows).toBeGreaterThan(0);
	});

	test("insertReturning: 생성된 행 반환", async () => {
		const qb = new QueryBuilder();
		const user = await qb.insertReturning("users", {
			name: "ReturningUser",
			email: "returning@test.com",
			role: "user",
			age: 25,
		});

		expect((user as any).id).toBeGreaterThan(0);
		expect((user as any).name).toBe("ReturningUser");
	});

	test("update: where + 데이터 수정", async () => {
		const qb = new QueryBuilder();
		const result = await qb.where("name", "NewUser").update("users", { age: 31 });

		expect(result.affectedRows).toBeGreaterThan(0);
	});

	test("updateReturning: 수정된 행 반환", async () => {
		const qb = new QueryBuilder();
		const user = await qb.where("name", "ReturningUser").updateReturning("users", { age: 26 });

		expect((user as any).age).toBe(26);
	});

	test("update without where → 에러", async () => {
		const qb = new QueryBuilder();
		await expect(qb.update("users", { name: "Hacked" })).rejects.toThrow(
			"WHERE clause is required",
		);
	});

	test("delete: where 조건 삭제", async () => {
		const qb = new QueryBuilder();
		const result = await qb.where("name", "NewUser").delete("users");

		expect(result.affectedRows).toBeGreaterThan(0);
	});

	test("delete without where → 에러", async () => {
		const qb = new QueryBuilder();
		await expect(qb.delete("users")).rejects.toThrow("WHERE clause is required");
	});
});

// ─── first / count / exists / paginate ────────────
describe("QueryBuilder - 유틸리티", () => {
	test("first: 첫 번째 행만 반환", async () => {
		const qb = new QueryBuilder();
		const user = await qb.from("users").where("role", "admin").first();

		expect(user).not.toBeNull();
		expect((user as any).name).toBe("Admin");
	});

	test("first: 결과 없으면 null", async () => {
		const qb = new QueryBuilder();
		const user = await qb.from("users").where("role", "superadmin").first();

		expect(user).toBeNull();
	});

	test("count: 전체 행 수", async () => {
		const qb = new QueryBuilder();
		const total = await qb.from("users").count();

		expect(total).toBeGreaterThan(0);
	});

	test("count: 조건부 행 수", async () => {
		const qb = new QueryBuilder();
		const adminCount = await qb.from("users").where("role", "admin").count();

		expect(adminCount).toBe(1);
	});

	test("exists: 조건에 맞는 행이 존재", async () => {
		const qb = new QueryBuilder();
		const hasAdmin = await qb.from("users").where("role", "admin").exists();

		expect(hasAdmin).toBe(true);
	});

	test("exists: 조건에 맞는 행이 없음", async () => {
		const qb = new QueryBuilder();
		const hasSuper = await qb.from("users").where("role", "superadmin").exists();

		expect(hasSuper).toBe(false);
	});

	test("paginate: 페이지네이션", async () => {
		const qb = new QueryBuilder();
		const result = await qb.from("users").orderBy("id", "ASC").paginate(1, 2);

		expect(result.data.length).toBe(2);
		expect(result.total).toBeGreaterThan(2);
		expect(result.page).toBe(1);
		expect(result.perPage).toBe(2);
		expect(result.hasNext).toBe(true);
		expect(result.hasPrev).toBe(false);
	});

	test("paginate: 2페이지", async () => {
		const qb = new QueryBuilder();
		const result = await qb.from("users").orderBy("id", "ASC").paginate(2, 2);

		expect(result.hasPrev).toBe(true);
	});

	test("clone: 복제 후 원본 유지", async () => {
		const original = createQueryBuilder().from("users").where("role", "admin");

		const cloned = original.clone();
		cloned.where("age >", 30);

		// clone에 추가한 조건이 원본에 영향 없음
		const originalResult = await original.get();
		expect(originalResult.length).toBe(1); // admin only

		const clonedResult = await cloned.get();
		expect(clonedResult.length).toBe(1); // admin + age > 30
	});

	test("toSQL: SQL 문자열 확인 (디버그)", () => {
		const qb = createQueryBuilder()
			.select("id, name")
			.from("users")
			.where("role", "admin")
			.orderBy("id", "DESC")
			.limit(10);

		const { query, bindings } = qb.toSQL();
		expect(query).toContain("SELECT");
		expect(query).toContain("FROM");
		expect(query).toContain("WHERE");
		expect(query).toContain("ORDER BY");
		expect(query).toContain("LIMIT");
		expect(bindings).toContain("admin");
		expect(bindings).toContain(10);
	});
});

// ─── Model + QueryBuilder 통합 ────────────────────
describe("Model - QueryBuilder 통합", () => {
	class UserModel extends Model<any> {
		override tableName = "users";
	}
	class PostModel extends Model<any> {
		override tableName = "posts";
	}

	const userModel = new UserModel();
	const postModel = new PostModel();

	test("Model.qb(): 기본 findAll", async () => {
		const users = await userModel.findAll();
		expect(users.length).toBeGreaterThan(0);
	});

	test("Model.qb(): where + get", async () => {
		const admins = await userModel.qb().where("role", "admin").get();

		expect(admins.length).toBe(1);
	});

	test("Model.qb(): join + select", async () => {
		const results = await postModel
			.qb()
			.select("p.title, u.name as author_name")
			.from("posts p")
			.join("users u", "u.id = p.author_id")
			.where("p.published", 1)
			.orderBy("p.id", "ASC")
			.get();

		expect(results.length).toBe(2);
	});

	test("Model.qb(): like 검색", async () => {
		const posts = await postModel.qb().like("title", "Hel").get();

		expect(posts.length).toBe(1);
	});

	test("Model.qb(): paginate", async () => {
		const result = await postModel.paginate(1, 2);
		expect(result.data.length).toBe(2);
		expect(result.hasNext).toBe(true);
	});

	test("Model.findFirst: 조건 첫 번째", async () => {
		const admin = await userModel.findFirst({ role: "admin" });
		expect(admin).not.toBeNull();
		expect((admin as any).name).toBe("Admin");
	});

	test("Model.exists: 존재 확인", async () => {
		const hasAdmin = await userModel.exists({ role: "admin" });
		expect(hasAdmin).toBe(true);
	});

	test("Model.updateWhere: 조건부 수정", async () => {
		const result = await userModel.updateWhere({ role: "guest" }, { age: 23 });
		expect(result.affectedRows).toBeGreaterThan(0);
	});

	test("Model.deleteWhere: 조건부 삭제", async () => {
		// 임시 사용자 생성 후 삭제
		await userModel.create({
			name: "Temp",
			email: "temp@test.com",
			role: "temp",
			age: 1,
		});
		const deleted = await userModel.deleteWhere({ role: "temp" });
		expect(deleted).toBeGreaterThan(0);
	});
});

// ─── SQL 인젝션 방어 ────────────────────────────
describe("QueryBuilder - SQL 인젝션 방어", () => {
	test("where: 악의적 컬럼명 차단", () => {
		const qb = new QueryBuilder();
		expect(() => qb.where("id; DROP TABLE users--", 1)).toThrow("Invalid column name");
	});

	test("where: OR 조건 인젝션 차단", () => {
		const qb = new QueryBuilder();
		expect(() => qb.where("id = 1 OR 1=1", 1)).toThrow("Invalid column name");
	});

	test("whereIn: 악의적 컬럼명 차단", () => {
		const qb = new QueryBuilder();
		expect(() => qb.whereIn("1=1; DROP TABLE", [1])).toThrow("Invalid column name");
	});

	test("insert: 악의적 컬럼명 차단", async () => {
		const qb = new QueryBuilder();
		await expect(qb.insert("users", { "role; DROP TABLE users--": "admin" })).rejects.toThrow(
			"Invalid column name",
		);
	});

	test("정상 컬럼명은 통과", () => {
		const qb = new QueryBuilder();
		expect(() => qb.where("published", 1)).not.toThrow();
		expect(() => qb.where("age >", 25)).not.toThrow();
		expect(() => qb.where("id", 1)).not.toThrow();
	});

	// ─── 새로운 검증: select, orderBy, groupBy, having, join ───

	test("select: 서브쿼리 인젝션 차단", () => {
		const qb = new QueryBuilder();
		expect(() => qb.select("(SELECT password FROM users LIMIT 1) as leaked")).toThrow(
			"Subquery not allowed",
		);
	});

	test("select: 위험 함수 차단", () => {
		const qb = new QueryBuilder();
		expect(() => qb.select("LOAD_FILE('/etc/passwd') as data")).toThrow("Dangerous function");
		expect(() => qb.select("SLEEP(5) as delay")).toThrow("Dangerous function");
	});

	test("select: 정상 컬럼명 통과", () => {
		const qb = new QueryBuilder();
		expect(() => qb.select("id, title, created_at")).not.toThrow();
		expect(() => qb.select("p.id, u.name as author_name")).not.toThrow();
		expect(() => qb.select("*")).not.toThrow();
	});

	test("selectRaw: 복합 표현식 허용", () => {
		const qb = new QueryBuilder();
		expect(() => qb.selectRaw("COUNT(*) as count")).not.toThrow();
		expect(() => qb.selectRaw("(SELECT name FROM users WHERE id = 1) as name")).not.toThrow();
	});

	test("orderBy: 악의적 컬럼명 차단", () => {
		const qb = new QueryBuilder();
		expect(() => qb.orderBy("id; DROP TABLE users")).toThrow("Invalid column name");
		expect(() => qb.orderBy("(SELECT password FROM users)")).toThrow("Invalid column name");
	});

	test("orderBy: 정상 컬럼명 통과", () => {
		const qb = new QueryBuilder();
		expect(() => qb.orderBy("created_at", "DESC")).not.toThrow();
		expect(() => qb.orderBy("p.id")).not.toThrow();
	});

	test("orderByRaw: 복합 정렬 허용", () => {
		const qb = new QueryBuilder();
		expect(() => qb.orderByRaw("FIELD(status, 'active', 'pending')")).not.toThrow();
	});

	test("groupBy: 악의적 컬럼명 차단", () => {
		const qb = new QueryBuilder();
		expect(() => qb.groupBy("id; DROP TABLE users")).toThrow("Invalid column name");
	});

	test("groupBy: 정상 컬럼명 통과", () => {
		const qb = new QueryBuilder();
		expect(() => qb.groupBy("author_id")).not.toThrow();
		expect(() => qb.groupBy("p.author_id")).not.toThrow();
	});

	test("having: 악의적 컬럼명 차단 (값 있을 때)", () => {
		const qb = new QueryBuilder();
		expect(() => qb.having("count; DROP TABLE users", 5)).toThrow("Invalid column name");
	});

	test("having: 정상 컬럼명 통과 (값 있을 때)", () => {
		const qb = new QueryBuilder();
		expect(() => qb.having("count", 5)).not.toThrow();
		expect(() => qb.having("count >", 5)).not.toThrow();
	});

	test("join: 악의적 테이블명 차단", () => {
		const qb = new QueryBuilder();
		expect(() => qb.join("users; DROP TABLE posts", "u.id = p.id")).toThrow("Invalid join table");
	});

	test("join: 정상 테이블명 통과", () => {
		const qb = new QueryBuilder();
		expect(() => qb.join("users u", "u.id = p.author_id")).not.toThrow();
		expect(() => qb.leftJoin("comments c", "c.post_id = p.id")).not.toThrow();
	});
});
