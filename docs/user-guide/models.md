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
| `create(data)` | 레코드 생성 | `$this->db->insert($data)` |
| `update(id, data)` | 레코드 수정 | `$this->db->where('id', $id)->update($data)` |
| `delete(id)` | 레코드 삭제 | `$this->db->where('id', $id)->delete()` |
| `count(conditions?)` | 개수 조회 | `$this->db->count_all_results()` |
| `limit(limit, offset)` | LIMIT 조회 | `$this->db->limit()->get()->result()` |
| `paginate(page, perPage)` | 페이지네이션 | - |
| `transaction(callback)` | 트랜잭션 | `$this->db->trans_start()` |

## 사용 예시

```typescript
import userModel from "app/models/user_model.ts";

const users = await userModel.findAll();
const user = await userModel.findById(1);
const active = await userModel.findWhere({ email: "test@example.com" });
const newUser = await userModel.create({ name: "Alice" });
await userModel.update(1, { name: "Updated" });
await userModel.delete(1);
const total = await userModel.count();

const result = await userModel.paginate(2, 15);
// { data: [...], total: 100, page: 2, perPage: 15, totalPages: 7 }

await userModel.transaction(async (tx) => {
  await tx`INSERT INTO users (name) VALUES (${"Alice"})`;
});
```

## 직접 SQL

```typescript
import { getDB } from "system/core/database.ts";
const sql = await getDB();

const users = await sql`SELECT * FROM users WHERE age > ${20}`;
await sql`INSERT INTO users ${sql({ name: "Alice" })}`;
```
