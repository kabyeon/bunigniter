// ============================================================
// BunIgniter - Base Model
// CodeIgniter3 의 CI_Model 과 동일
// Bun SQL (tagged template literal) 기반
// ============================================================

import { getDB } from "./database.ts";

/**
 * 기본 모델 클래스
 * 모든 앱 모델은 이 클래스를 상속받습니다.
 *
 * 사용예:
 *   class UserModel extends Model<UserInterface> {
 *     override tableName = "users";
 *   }
 */
export class Model<T extends Record<string, any> = Record<string, any>> {
	/** 테이블 이름 (하위 클래스에서 반드시 오버라이드) */
	tableName: string = "";

	/** 기본 PK 컬럼명 */
	primaryKey: string = "id";

	/** DB 연결 가져오기 */
	protected async db() {
		return getDB();
	}

	/**
	 * 전체 레코드 조회
	 * CodeIgniter3: $this->db->get()->result()
	 */
	async findAll(): Promise<T[]> {
		const sql = await this.db();
		return sql`SELECT * FROM ${sql(this.tableName)}` as Promise<T[]>;
	}

	/**
	 * ID로 레코드 조회
	 * CodeIgniter3: $this->db->where('id', $id)->get()->row()
	 */
	async findById(id: number): Promise<T | null> {
		const sql = await this.db();
		const rows =
			sql`SELECT * FROM ${sql(this.tableName)} WHERE ${sql(this.primaryKey)} = ${id}` as Promise<
				T[]
			>;
		const results = await rows;
		return results[0] ?? null;
	}

	/**
	 * 조건으로 레코드 조회
	 * CodeIgniter3: $this->db->where($conditions)->get()->result()
	 *
	 * 주의: 컬럼명은 화이트리스트 검증을 통해 SQL 인젝션을 방지합니다.
	 * 키값은 알파벳/숫자/언더스코어만 허용됩니다.
	 */
	async findWhere(conditions: Partial<T>): Promise<T[]> {
		const sql = await this.db();
		const entries = Object.entries(conditions);
		if (entries.length === 0) return this.findAll();

		// 컬럼명 화이트리스트 검증 (SQL 인젝션 방지)
		const whereClauses = entries.map(([key, _]) => {
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
				throw new Error(`Invalid column name: ${key}`);
			}
			return `${key} = ?`;
		});
		const values = entries.map(([_, val]) => val);
		const whereStr = whereClauses.join(" AND ");

		// 안전한 방식: sql fragment + 바인딩
		const query = `SELECT * FROM ${this.tableName} WHERE ${whereStr}`;
		return sql.unsafe(query, values) as Promise<T[]>;
	}

	/**
	 * 레코드 생성
	 * CodeIgniter3: $this->db->insert($data)
	 */
	async create(data: Partial<T>): Promise<T> {
		const sql = await this.db();
		const result =
			await sql`INSERT INTO ${sql(this.tableName)} ${sql(data as Record<string, any>)} RETURNING *`;
		return result[0] as T;
	}

	/**
	 * 레코드 수정
	 * CodeIgniter3: $this->db->where('id', $id)->update($data)
	 */
	async update(id: number, data: Partial<T>): Promise<T | null> {
		const sql = await this.db();
		const result =
			await sql`UPDATE ${sql(this.tableName)} SET ${sql(data as Record<string, any>)} WHERE ${sql(this.primaryKey)} = ${id} RETURNING *`;
		return (result[0] as T) ?? null;
	}

	/**
	 * 레코드 삭제
	 * CodeIgniter3: $this->db->where('id', $id)->delete()
	 */
	async delete(id: number): Promise<boolean> {
		const sql = await this.db();
		const result =
			await sql`DELETE FROM ${sql(this.tableName)} WHERE ${sql(this.primaryKey)} = ${id}`;
		return (result as any).affectedRows > 0;
	}

	/**
	 * 레코드 개수 조회
	 * CodeIgniter3: $this->db->count_all_results()
	 *
	 * 주의: 컬럼명은 화이트리스트 검증을 통해 SQL 인젝션을 방지합니다.
	 */
	async count(conditions?: Partial<T>): Promise<number> {
		const sql = await this.db();

		if (conditions && Object.keys(conditions).length > 0) {
			const entries = Object.entries(conditions);
			const whereClauses = entries.map(([key, _]) => {
				if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
					throw new Error(`Invalid column name: ${key}`);
				}
				return `${key} = ?`;
			});
			const values = entries.map(([_, val]) => val);
			const whereStr = whereClauses.join(" AND ");
			const result = await sql.unsafe(
				`SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereStr}`,
				values,
			);
			return (result[0] as any).count;
		}

		const result =
			await sql`SELECT COUNT(*) as count FROM ${sql(this.tableName)}`;
		return (result[0] as any).count;
	}

	/**
	 * 트랜잭션 실행
	 * CodeIgniter3: $this->db->trans_start() ... trans_complete()
	 */
	async transaction<R>(callback: (tx: any) => Promise<R>): Promise<R> {
		const sql = await this.db();
		return sql.begin(async (tx) => {
			return callback(tx);
		});
	}

	/**
	 * 페이지네이션
	 * CodeIgniter3: $this->db->limit($limit, $offset)->get()->result()
	 */
	async paginate(
		page: number = 1,
		perPage: number = 15,
	): Promise<{
		data: T[];
		total: number;
		page: number;
		perPage: number;
		totalPages: number;
	}> {
		const offset = (page - 1) * perPage;
		const total = await this.count();
		const data = await this.limit(perPage, offset);

		return {
			data,
			total,
			page,
			perPage,
			totalPages: Math.ceil(total / perPage),
		};
	}

	/**
	 * LIMIT + OFFSET 조회
	 */
	async limit(limit: number, offset: number = 0): Promise<T[]> {
		const sql = await this.db();
		return sql`SELECT * FROM ${sql(this.tableName)} LIMIT ${limit} OFFSET ${offset}` as Promise<
			T[]
		>;
	}
}
