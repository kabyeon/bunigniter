# 🔗 Query Builder (Active Record)

CodeIgniter3의 Active Record 패턴을 구현한 쿼리 빌더입니다. 메서드 체이닝으로 직관적인 SQL 쿼리를 작성할 수 있습니다.

## 시작하기

### Model에서 사용

```typescript
import { Model } from "system/core/model.ts";

export class PostModel extends Model<PostInterface> {
  override tableName = "posts";
}

const postModel = new PostModel();

// qb() 메서드로 QueryBuilder 인스턴스 생성 (tableName 자동 설정)
const posts = await postModel.qb()
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .limit(10)
  .get();
```

### 독립 사용

```typescript
import { createQueryBuilder } from "system/core/query_builder.ts";

const posts = await createQueryBuilder()
  .select("id, title, created_at")
  .from("posts")
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .limit(10)
  .get();
```

## CI3 ↔ BunIgniter 대조표

| CodeIgniter 3 | BunIgniter |
|---------------|-----------|
| `$this->db->select('id, title')` | `.select('id, title')` |
| `$this->db->from('posts')` | `.from('posts')` |
| `$this->db->where('published', 1)` | `.where('published', 1)` |
| `$this->db->where('age >', 25)` | `.where('age >', 25)` |
| `$this->db->or_where('role', 'admin')` | `.orWhere('role', 'admin')` |
| `$this->db->where_in('id', [1,2])` | `.whereIn('id', [1,2])` |
| `$this->db->where_not_in('id', [1,2])` | `.whereNotIn('id', [1,2])` |
| `$this->db->like('title', '검색어')` | `.like('title', '검색어')` |
| `$this->db->or_like('title', '검색어')` | `.orLike('title', '검색어')` |
| `$this->db->join('users u', '...')` | `.join('users u', '...')` |
| `$this->db->order_by('id', 'DESC')` | `.orderBy('id', 'DESC')` |
| `$this->db->limit(10, 0)` | `.limit(10, 0)` |
| `$this->db->group_by('col')` | `.groupBy('col')` |
| `$this->db->distinct()` | `.distinct()` |
| `$this->db->get()->result()` | `.get()` |
| `$this->db->get()->row()` | `.first()` |
| `$this->db->insert($data)` | `.insert(table, data)` |
| `$this->db->update($data)` | `.update(table, data)` |
| `$this->db->delete()` | `.delete(table)` |
| `$this->db->count_all_results()` | `.count()` |

---

## 멀티 어댑터 SQL 방언

QueryBuilder는 DB 어댑터에 따라 자동으로 SQL 문법을 분기합니다:

### 식별자 이스케이프

| 어댑터 | 이스케이프 | 예시 |
|--------|-----------|------|
| SQLite | 쌍따옴표 | `"column"` |
| PostgreSQL | 쌍따옴표 | `"column"` |
| MySQL | 백틱 | `` `column` `` |

### LIMIT / OFFSET

| 어댑터 | 문법 | 예시 |
|--------|------|------|
| SQLite | 표준 | `LIMIT ? OFFSET ?` |
| PostgreSQL | 표준 | `LIMIT ? OFFSET ?` |
| MySQL | 레거시 | `LIMIT offset, count` |

### RETURNING * (INSERT/UPDATE 후 행 반환)

| 어댑터 | 지원 | 대체 방식 |
|--------|------|----------|
| SQLite | ✅ | `RETURNING *` 직접 사용 |
| PostgreSQL | ✅ | `RETURNING *` 직접 사용 |
| MySQL | ❌ | INSERT 후 `lastInsertId` → SELECT 재조회 |

```typescript
// insertReturning / updateReturning은 어댑터에 관계없이 동일하게 사용
const post = await qb.insertReturning("posts", { title: "Hello" });
const updated = await qb.where("id", 1).updateReturning("posts", { title: "Updated" });
```

---

## SELECT

```typescript
// 전체 컬럼
const posts = await postModel.qb().get();

// 특정 컬럼
const posts = await postModel.qb()
  .select("id, title, created_at")
  .get();

// 별칭
const posts = await postModel.qb()
  .select("id, title, u.name as author_name")
  .from("posts p")
  .join("users u", "u.id = p.author_id")
  .get();
```

### DISTINCT

```typescript
const authors = await postModel.qb()
  .select("author_id")
  .distinct()
  .get();
```

### 집계 함수

```typescript
// COUNT
const total = await postModel.qb().count();                    // 전체 개수
const published = await postModel.qb().where("published", 1).count(); // 조건부 개수

// SUM
const result = await createQueryBuilder()
  .selectSum("price", "total_price")
  .from("orders")
  .get();

// AVG, MAX, MIN
const result = await createQueryBuilder()
  .selectAvg("age", "avg_age")
  .selectMax("age", "max_age")
  .selectMin("age", "min_age")
  .from("users")
  .get();
```

### 첫 번째 행만 조회

```typescript
const post = await postModel.qb()
  .where("slug", "hello-world")
  .first();

// 결과가 없으면 null 반환
if (!post) return response.status(404).json({ error: "Not Found" });
```

### 존재 여부 확인

```typescript
const hasAdmin = await postModel.qb()
  .where("role", "admin")
  .exists();
// → true / false
```

---

## WHERE

### 기본 WHERE

```typescript
// 단순 조건 (= 연산자)
.where("published", 1)
// → WHERE "published" = 1

// 연산자 지정 (CI3: $this->db->where('age >', 25))
.where("age >", 25)
.where("created_at >=", "2025-01-01")
.where("id !=", 5)
```

### OR WHERE

```typescript
.where("role", "admin")
.orWhere("role", "author")
// → WHERE "role" = 'admin' OR "role" = 'author'
```

### WHERE IN

```typescript
.whereIn("id", [1, 2, 3])
// → WHERE "id" IN (1, 2, 3)

.whereNotIn("status", ["deleted", "banned"])
// → WHERE "status" NOT IN ('deleted', 'banned')
```

### WHERE BETWEEN

```typescript
.whereBetween("age", 20, 30)
// → WHERE "age" BETWEEN 20 AND 30
```

### NULL / NOT NULL

```typescript
.whereNull("deleted_at")
// → WHERE "deleted_at" IS NULL

.whereNotNull("email")
// → WHERE "email" IS NOT NULL
```

### LIKE 검색

```typescript
// 양쪽 %검색어% (기본)
.like("title", "BunIgniter")
// → WHERE "title" LIKE '%BunIgniter%'

// 앞에만 %검색어
.like("title", "튜토리얼", "before")
// → WHERE "title" LIKE '%튜토리얼'

// 뒤에만 검색어%
.like("slug", "bun", "after")
// → WHERE "slug" LIKE 'bun%'

// OR LIKE
.like("title", "Bun")
.orLike("content", "Bun")
// → WHERE "title" LIKE '%Bun%' OR "content" LIKE '%Bun%'
```

### 객체 조건 일괄 설정

```typescript
.whereObject({ published: 1, author_id: 1 })
// → WHERE "published" = 1 AND "author_id" = 1
```

### Raw 조건

```typescript
// 값 없이 SQL 조건 직접 입력
.where("published = 1")
.where("created_at IS NOT NULL")
```

---

## JOIN

```typescript
// INNER JOIN (기본)
.join("users u", "u.id = p.author_id")

// LEFT JOIN
.leftJoin("comments c", "c.post_id = p.id")

// RIGHT JOIN
.rightJoin("categories cat", "cat.id = p.category_id")

// CROSS JOIN
.join("tags t", "", "CROSS")
```

### JOIN 예시

```typescript
const posts = await postModel.qb()
  .select("p.id, p.title, p.created_at, u.name as author_name, COUNT(c.id) as comment_count")
  .from("posts p")
  .join("users u", "u.id = p.author_id")
  .leftJoin("comments c", "c.post_id = p.id")
  .where("p.published", 1)
  .groupBy("p.id")
  .orderBy("p.created_at", "DESC")
  .get();
```

---

## ORDER BY / LIMIT / OFFSET

### 정렬

```typescript
.orderBy("created_at", "DESC")
.orderBy("title", "ASC")

// 편의 메서드
.latest()            // created_at DESC
.oldest()            // created_at ASC
.latest("updated_at") // updated_at DESC
```

### LIMIT / OFFSET

```typescript
.limit(10)           // LIMIT 10
.limit(10, 20)       // LIMIT 10 OFFSET 20
.offset(20)          // OFFSET 20
```

---

## GROUP BY / HAVING

```typescript
const stats = await createQueryBuilder()
  .select("author_id, COUNT(*) as post_count, AVG(views) as avg_views")
  .from("posts")
  .groupBy("author_id")
  .having("post_count >", 5)
  .get();
```

---

## INSERT

```typescript
// 기본 INSERT (insertId, affectedRows 반환)
const result = await createQueryBuilder()
  .insert("posts", {
    title: "새 포스트",
    slug: "new-post",
    content: "내용",
    author_id: 1,
    published: 0,
  });
// result.insertId, result.affectedRows

// INSERT + 생성된 행 반환 (SQLite RETURNING *)
const post = await postModel.qb()
  .insertReturning("posts", {
    title: "새 포스트",
    slug: "new-post",
    content: "내용",
    author_id: 1,
  });
// post.id, post.title, post.slug, ...
```

---

## UPDATE

```typescript
// WHERE 필수 (안전 장치)
const result = await postModel.qb()
  .where("id", 1)
  .update("posts", { title: "수정된 제목", published: 1 });
// result.affectedRows

// UPDATE + 수정된 행 반환
const post = await postModel.qb()
  .where("id", 1)
  .updateReturning("posts", { title: "수정된 제목" });

// WHERE 없이 UPDATE → 에러 발생 (안전 장치)
await postModel.qb().update("posts", { title: "해킹" });
// → Error: WHERE clause is required for update (safety)
```

---

## DELETE

```typescript
// WHERE 필수 (안전 장치)
const result = await postModel.qb()
  .where("id", 1)
  .delete("posts");
// result.affectedRows

// WHERE 없이 DELETE → 에러 발생
await postModel.qb().delete("posts");
// → Error: WHERE clause is required for delete (safety)
```

---

## 페이지네이션

```typescript
const result = await postModel.qb()
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .paginate(1, 10);
// → {
//     data: [...],        // 현재 페이지 데이터
//     total: 57,          // 전체 레코드 수
//     page: 1,            // 현재 페이지
//     perPage: 10,        // 페이지당 항목 수
//     totalPages: 6,      // 전체 페이지 수
//     hasNext: true,      // 다음 페이지 존재
//     hasPrev: false,     // 이전 페이지 존재
//   }
```

---

## 유틸리티

### clone — 쿼리 복제

```typescript
const baseQuery = postModel.qb()
  .where("published", 1);

// 원본 유지하면서 복제본에 조건 추가
const recentPosts = await baseQuery.clone()
  .orderBy("created_at", "DESC")
  .limit(5)
  .get();

const popularPosts = await baseQuery.clone()
  .orderBy("views", "DESC")
  .limit(5)
  .get();
```

### toSQL — SQL 확인 (디버그)

```typescript
const { query, bindings } = postModel.qb()
  .select("id, title")
  .where("published", 1)
  .orderBy("id", "DESC")
  .limit(10)
  .toSQL();

console.log(query);    // SELECT id, title FROM "posts" WHERE "published" = ? ORDER BY "id" DESC LIMIT ?
console.log(bindings); // [1, 10]
```

---

## SQL 인젝션 방어

QueryBuilder는 모든 컬럼명에 화이트리스트 검증을 수행합니다:

```typescript
// ✅ 안전 — 정상 컬럼명
.where("published", 1)
.where("age >", 25)
.whereIn("id", [1, 2, 3])

// ✅ 안전 — 테이블.컬럼 형식
.where("p.published", 1)

// ❌ 차단 — SQL 메타문자 포함
.where("id; DROP TABLE users--", 1)    // → Error: Invalid column name
.where("id = 1 OR 1=1", 1)            // → Error: Invalid column name

// ❌ 차단 — INSERT/UPDATE 악의적 컬럼명
.insert("users", { "role; DROP TABLE": "admin" })  // → Error: Invalid column name
```

값은 항상 파라미터 바인딩으로 전달되어 SQL 인젝션을 방지합니다.

---

## 실전 예시 — Blog API

```typescript
// GET /api/posts — 페이지네이션 + JOIN
async index({ query }: Context) {
  const page = Number(query.page ?? "1");
  const perPage = Number(query.per_page ?? "10");

  const result = await postModel.qb()
    .select("p.id, p.title, p.slug, p.excerpt, p.published, p.created_at, u.name as author_name")
    .from("posts p")
    .join("users u", "u.id = p.author_id")
    .where("p.published", 1)
    .orderBy("p.created_at", "DESC")
    .paginate(page, perPage);

  return this.json(result);
}

// GET /api/posts/:id — 상세 + 댓글
async show({ params, response }: Context) {
  const post = await postModel.qb()
    .select("p.*, u.name as author_name")
    .from("posts p")
    .join("users u", "u.id = p.author_id")
    .where("p.id", Number(params.id))
    .first();

  if (!post) return response.status(404).json({ error: "Not Found" });

  const comments = await postModel.qb()
    .select("id, author_name, content, created_at")
    .from("comments")
    .where("post_id", post.id)
    .orderBy("created_at", "DESC")
    .get();

  return this.json({ data: { ...post, comments } });
}

// POST /api/posts — 생성
async store({ body, response }: Context) {
  const data = body();
  if (!data.title) return response.status(422).json({ error: "title required" });

  const exists = await postModel.exists({ slug: data.slug });
  if (exists) return response.status(409).json({ error: "Duplicate slug" });

  const created = await postModel.create({ ...data, author_id: 1 });
  return this.json({ data: created }, 201);
}

// PUT /api/posts/:id — 수정
async update({ body, params, response }: Context) {
  const existing = await postModel.findById(Number(params.id));
  if (!existing) return response.status(404).json({ error: "Not Found" });

  const updated = await postModel.update(Number(params.id), body());
  return this.json({ data: updated });
}

// DELETE /api/posts/:id — 삭제
async delete({ params, response }: Context) {
  const deleted = await postModel.delete(Number(params.id));
  if (!deleted) return response.status(404).json({ error: "Not Found" });
  return this.json({ data: { deleted: true } });
}

// 검색 — LIKE + OR
async search({ query }: Context) {
  const keyword = query.q ?? "";
  const posts = await postModel.qb()
    .like("title", keyword)
    .orLike("content", keyword)
    .where("published", 1)
    .orderBy("created_at", "DESC")
    .limit(20)
    .get();

  return this.json({ data: posts });
}
```
