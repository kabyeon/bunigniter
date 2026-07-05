// ============================================================
// BunIgniter - Base Model
// CodeIgniter3 의 CI_Model 과 동일
// Bun SQL (tagged template literal) + Active Record (QueryBuilder)
// ============================================================

import { getDB } from "./database.ts";
import { type QueryBuilder, createQueryBuilder } from "./query_builder.ts";

/**
 * 기본 모델 클래스
 * 모든 앱 모델은 이 클래스를 상속받습니다.
 *
 * 사용예:
 *   class UserModel extends Model<UserInterface> {
 *     override tableName = "users";
 *   }
 *
 * Active Record 패턴 (CI3 스타일):
 *   const posts = await PostModel.qb()
 *     .select('id, title, created_at')
 *     .where('published', 1)
 *     .like('title', 'BunIgniter')
 *     .orderBy('created_at', 'DESC')
 *     .limit(10)
 *     .get();
 *
 *   const post = await PostModel.qb()
 *     .select('p.*, u.name as author_name')
 *     .from('posts p')
 *     .join('users u', 'u.id = p.author_id')
 *     .where('p.slug', 'hello-world')
 *     .first();
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
	 * Query Builder 인스턴스 생성 (이미 from 설정됨)
	 * CI3: $this->db->select()->from()->where()...
	 *
	 * 사용예:
	 *   const posts = await this.qb()
	 *     .select('id, title')
	 *     .where('published', 1)
	 *     .orderBy('created_at', 'DESC')
	 *     .limit(10)
	 *     .get();
	 */
	qb(): QueryBuilder {
		const builder = createQueryBuilder();
		builder.from(this.tableName);
		return builder;
	}

	/**
	 * 정적 Query Builder (인스턴스 없이 사용)
	 * UserModel.query().where('role', 'admin').get()
	 */
	static query(): QueryBuilder {
		const instance = new this();
		return instance.qb();
	}

	// ─── 기존 편의 메서드 (하위 호환) ────────────────

	/**
	 * 전체 레코드 조회
	 * CI3: $this->db->get()->result()
	 */
	async findAll(): Promise<T[]> {
		return this.qb().get<T>();
	}

	/**
	 * ID로 레코드 조회
	 * CI3: $this->db->where('id', $id)->get()->row()
	 */
	async findById(id: number): Promise<T | null> {
		return this.qb().where(this.primaryKey, id).first<T>();
	}

	/**
	 * 조건으로 레코드 조회
	 * CI3: $this->db->where($conditions)->get()->result()
	 */
	async findWhere(conditions: Partial<T>): Promise<T[]> {
		return this.qb().whereObject(conditions as Record<string, any>).get<T>();
	}

	/**
	 * 조건으로 첫 번째 레코드 조회
	 */
	async findFirst(conditions: Partial<T>): Promise<T | null> {
		return this.qb().whereObject(conditions as Record<string, any>).first<T>();
	}

	/**
	 * 레코드 생성
	 * CI3: $this->db->insert($data)
	 */
	async create(data: Partial<T>): Promise<T> {
		return this.qb().insertReturning<T>(this.tableName, data as Record<string, any>);
	}

	/**
	 * 레코드 수정
	 * CI3: $this->db->where('id', $id)->update($data)
	 */
	async update(id: number, data: Partial<T>): Promise<T | null> {
		return this.qb()
			.where(this.primaryKey, id)
			.updateReturning<T>(this.tableName, data as Record<string, any>);
	}

	/**
	 * 조건부 수정
	 * CI3: $this->db->where($conditions)->update($data)
	 */
	async updateWhere(conditions: Partial<T>, data: Partial<T>): Promise<{ affectedRows: number }> {
		return this.qb()
			.whereObject(conditions as Record<string, any>)
			.update(this.tableName, data as Record<string, any>);
	}

	/**
	 * 레코드 삭제
	 * CI3: $this->db->where('id', $id)->delete()
	 */
	async delete(id: number): Promise<boolean> {
		const { affectedRows } = await this.qb()
			.where(this.primaryKey, id)
			.delete(this.tableName);
		return affectedRows > 0;
	}

	/**
	 * 조건부 삭제
	 * CI3: $this->db->where($conditions)->delete()
	 */
	async deleteWhere(conditions: Partial<T>): Promise<number> {
		const { affectedRows } = await this.qb()
			.whereObject(conditions as Record<string, any>)
			.delete(this.tableName);
		return affectedRows;
	}

	/**
	 * 레코드 개수 조회
	 * CI3: $this->db->count_all_results()
	 */
	async count(conditions?: Partial<T>): Promise<number> {
		const qb = this.qb();
		if (conditions && Object.keys(conditions).length > 0) {
			qb.whereObject(conditions as Record<string, any>);
		}
		return qb.count();
	}

	/**
	 * 존재 여부 확인
	 */
	async exists(conditions: Partial<T>): Promise<boolean> {
		return this.qb().whereObject(conditions as Record<string, any>).exists();
	}

	/**
	 * 트랜잭션 실행
	 * CI3: $this->db->trans_start() ... trans_complete()
	 */
	async transaction<R>(callback: (tx: any) => Promise<R>): Promise<R> {
		const sql = await this.db();
		return sql.begin(async (tx) => {
			return callback(tx);
		});
	}

	/**
	 * 페이지네이션
	 * CI3: $this->db->limit($limit, $offset)->get()->result()
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
		hasNext: boolean;
		hasPrev: boolean;
	}> {
		return this.qb().paginate<T>(page, perPage);
	}

	/**
	 * LIMIT + OFFSET 조회
	 */
	async limit(limit: number, offset: number = 0): Promise<T[]> {
		return this.qb().limit(limit, offset).get<T>();
	}
}
