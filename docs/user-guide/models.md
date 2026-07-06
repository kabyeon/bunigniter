# 🗄 모델

`Model<T>` 제네릭 클래스를 상속받아 작성합니다.

## 기본 구조

```typescript
import { Model } from "system/core/model.ts";

export interface UserInterface {
  id?: number;
  name?: string;
  email?: string;
  age?: number;
  created_at?: string;
  updated_at?: string;
}

export class UserModel extends Model<UserInterface> {
  override tableName = "users";  // 반드시 오버라이드
}

export default new UserModel();
```

## CRUD 메서드

| 메서드 | 설명 | CI3 대응 |
|--------|------|----------|
| `findAll()` | 전체 조회 | `$this->db->get()->result()` |
| `findById(id)` | ID로 조회 | `$this->db->where('id', $id)->get()->row()` |
| `findWhere(conditions)` | 조건 조회 | `$this->db->where($conditions)->get()->result()` |
| `findFirst(conditions)` | 조건 첫 번째 행 | `$this->db->where($conditions)->get()->row()` |
| `create(data)` | 레코드 생성 | `$this->db->insert($data)` |
| `update(id, data)` | 레코드 수정 | `$this->db->where('id', $id)->update($data)` |
| `updateWhere(conds, data)` | 조건부 수정 | `$this->db->where($conds)->update($data)` |
| `delete(id)` | 레코드 삭제 | `$this->db->where('id', $id)->delete()` |
| `deleteWhere(conditions)` | 조건부 삭제 | `$this->db->where($conds)->delete()` |
| `count(conditions?)` | 개수 조회 | `$this->db->count_all_results()` |
| `exists(conditions)` | 존재 여부 | - |
| `limit(limit, offset)` | LIMIT 조회 | `$this->db->limit()->get()->result()` |
| `paginate(page, perPage)` | 페이지네이션 | - |
| `transaction(callback)` | 트랜잭션 | `$this->db->trans_start()` |

## 기본 사용 예시

```typescript
import userModel from "app/models/user_model.ts";

// 조회
const users = await userModel.findAll();
const user = await userModel.findById(1);
const active = await userModel.findWhere({ email: "test@example.com" });
const admin = await userModel.findFirst({ role: "admin" });

// 생성
const newUser = await userModel.create({ name: "Alice", email: "alice@test.com" });

// 수정
await userModel.update(1, { name: "Updated" });
await userModel.updateWhere({ role: "guest" }, { age: 25 }); // 조건부 수정

// 삭제
await userModel.delete(1);
const deleted = await userModel.deleteWhere({ role: "temp" }); // 조건부 삭제

// 개수 / 존재 여부
const total = await userModel.count();
const adminCount = await userModel.count({ role: "admin" });
const hasAdmin = await userModel.exists({ role: "admin" }); // true/false

// 페이지네이션
const result = await userModel.paginate(2, 15);
// { data: [...], total: 100, page: 2, perPage: 15, totalPages: 7, hasNext: true, hasPrev: true }

// 트랜잭션
await userModel.transaction(async (tx) => {
  await tx`INSERT INTO users (name) VALUES (${"Alice"})`;
});
```

## Query Builder (Active Record)

`qb()` 메서드로 CodeIgniter3 스타일의 쿼리 빌더를 사용할 수 있습니다:

```typescript
// 기본 — tableName 자동 설정
const posts = await postModel.qb()
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .limit(10)
  .get();

// JOIN + 별칭
const posts = await postModel.qb()
  .select("p.id, p.title, u.name as author_name")
  .from("posts p")
  .join("users u", "u.id = p.author_id")
  .where("p.published", 1)
  .orderBy("p.created_at", "DESC")
  .get();

// 검색
const results = await postModel.qb()
  .like("title", "BunIgniter")
  .orLike("content", "BunIgniter")
  .where("published", 1)
  .get();

// 페이지네이션
const page = await postModel.qb()
  .where("published", 1)
  .orderBy("created_at", "DESC")
  .paginate(1, 10);
// → { data, total, page, perPage, totalPages, hasNext, hasPrev }
```

> 💡 Query Builder의 전체 기능은 [Query Builder 문서](./query-builder.md)를 참조하세요.

## 정적 Query Builder

인스턴스 없이도 `query()` 정적 메서드를 사용할 수 있습니다:

```typescript
class UserModel extends Model<UserInterface> {
  override tableName = "users";
}

// 정적 호출
const admins = await UserModel.query()
  .where("role", "admin")
  .get();
```

## 직접 SQL

```typescript
import { getDB } from "system/core/database.ts";
const sql = await getDB();

// 태그드 템플릿 리터럴 (자동 이스케이프)
const users = await sql`SELECT * FROM users WHERE age > ${20}`;

// 객체 삽입
await sql`INSERT INTO users ${sql({ name: "Alice" })}`;
```
