// ============================================================
// BunIgniter - Query Builder (Active Record 패턴)
// CodeIgniter3 의 $this->db->select()->from()->where() 와 동일
// SQLite / PostgreSQL / MySQL 3종 어댑터 방언 자동 분기
// ============================================================

import type { SQL } from "bun";
import { getDB, getDBAdapter } from "./database.ts";

/** 지원 어댑터 타입 */
type AdapterType = "sqlite" | "postgres" | "mysql";

/**
 * WHERE 절 유형
 */
type WhereClause =
	| { type: "and"; column: string; operator: string; value: any }
	| { type: "or"; column: string; operator: string; value: any }
	| { type: "and_raw"; sql: string; bindings: any[] }
	| { type: "or_raw"; sql: string; bindings: any[] }
	| { type: "and_in"; column: string; values: any[] }
	| { type: "or_in"; column: string; values: any[] }
	| { type: "and_not_in"; column: string; values: any[] }
	| { type: "and_between"; column: string; low: any; high: any }
	| { type: "and_null"; column: string }
	| { type: "and_not_null"; column: string }
	| {
			type: "and_like";
			column: string;
			value: string;
			side: "both" | "before" | "after";
	  }
	| {
			type: "or_like";
			column: string;
			value: string;
			side: "both" | "before" | "after";
	  };

/**
 * JOIN 절
 */
interface JoinClause {
	type: "INNER" | "LEFT" | "RIGHT" | "CROSS";
	table: string;
	condition: string;
}

/**
 * ORDER BY 절
 */
interface OrderClause {
	column: string;
	direction: "ASC" | "DESC";
}

/**
 * Query Builder — CodeIgniter3 Active Record 패턴
 *
 * CI3 스타일:
 *   $this->db->select('id, title')
 *            ->from('posts')
 *            ->where('published', 1)
 *            ->order_by('created_at', 'DESC')
 *            ->limit(10, 0)
 *            ->get()
 *            ->result();
 *
 * BunIgniter:
 *   const results = await qb.select('id, title')
 *     .from('posts')
 *     .where('published', 1)
 *     .orderBy('created_at', 'DESC')
 *     .limit(10, 0)
 *     .get();
 */
export class QueryBuilder {
	private _select: string[] = [];
	private _from: string = "";
	private _joins: JoinClause[] = [];
	private _wheres: WhereClause[] = [];
	private _groupBy: string[] = [];
	private _havings: WhereClause[] = [];
	private _orders: OrderClause[] = [];
	private _limitVal: number | null = null;
	private _offsetVal: number | null = null;
	private _distinctVal = false;
	private _dbGroup?: string;

	/** 어댑터 타입 (지연 로딩: 첫 쿼리 실행 시 결정) */
	private _adapter: AdapterType | null = null;

	constructor(dbGroup?: string) {
		this._dbGroup = dbGroup;
	}

	// ─── 어댑터 감지 ────────────────────────────────

	/**
	 * 현재 DB 어댑터 타입 반환
	 * 첫 호출 시 getDBAdapter()에서 가져와 캐시
	 */
	private detectAdapter(): AdapterType {
		if (!this._adapter) {
			this._adapter = getDBAdapter(this._dbGroup);
		}
		return this._adapter;
	}

	// ─── SELECT ──────────────────────────────────────

	/**
	 * SELECT 컬럼 지정
	 * CI3: $this->db->select('id, title, content')
	 *
	 * 컬럼명에 validateColumnName() 적용으로 SQL 인젝션 방지.
	 * 함수/서브쿼리가 필요하면 selectRaw() 사용.
	 */
	select(...columns: string[]): this {
		for (const col of columns) {
			const parts = col.split(",").map((c) => c.trim());
			for (const part of parts) {
				this.validateSelectColumn(part);
			}
			this._select.push(...parts);
		}
		return this;
	}

	/**
	 * SELECT (raw SQL)
	 * 함수, 서브쿼리 등 복합 표현식이 필요한 경우 사용.
	 * ⚠️ 사용자 입력을 직접 전달하지 마세요.
	 *
	 * 예: qb.selectRaw("COUNT(*) as count")
	 *     qb.selectRaw("(SELECT name FROM users WHERE id = p.author_id) as author_name")
	 */
	selectRaw(sql: string): this {
		this._select.push(sql);
		return this;
	}

	/**
	 * SELECT 컬럼 설정 (기존 선택 초기화)
	 */
	selectOnly(...columns: string[]): this {
		this._select = [];
		return this.select(...columns);
	}
	/**
	 * DISTINCT 조회
	 * CI3: $this->db->distinct()
	 */
	distinct(): this {
		this._distinctVal = true;
		return this;
	}

	/**
	 * 집계 함수: SELECT COUNT(*) as count
	 */
	selectCount(alias = "count"): this {
		this._select.push(`COUNT(*) as ${this.escapeIdentifier(alias)}`);
		return this;
	}

	/**
	 * 집계 함수: SELECT SUM(column) as alias
	 */
	selectSum(column: string, alias?: string): this {
		this.validateColumnName(column);
		this._select.push(
			`SUM(${this.escapeIdentifier(column)}) as ${this.escapeIdentifier(alias ?? column)}`,
		);
		return this;
	}

	/**
	 * 집계 함수: SELECT AVG(column) as alias
	 */
	selectAvg(column: string, alias?: string): this {
		this.validateColumnName(column);
		this._select.push(
			`AVG(${this.escapeIdentifier(column)}) as ${this.escapeIdentifier(alias ?? column)}`,
		);
		return this;
	}

	/**
	 * 집계 함수: SELECT MAX(column) as alias
	 */
	selectMax(column: string, alias?: string): this {
		this.validateColumnName(column);
		this._select.push(
			`MAX(${this.escapeIdentifier(column)}) as ${this.escapeIdentifier(alias ?? column)}`,
		);
		return this;
	}

	/**
	 * 집계 함수: SELECT MIN(column) as alias
	 */
	selectMin(column: string, alias?: string): this {
		this.validateColumnName(column);
		this._select.push(
			`MIN(${this.escapeIdentifier(column)}) as ${this.escapeIdentifier(alias ?? column)}`,
		);
		return this;
	}

	// ─── FROM ────────────────────────────────────────

	/**
	 * FROM 테이블 지정
	 * CI3: $this->db->from('posts')
	 */
	from(table: string): this {
		// 테이블 별칭("posts p", "users u")이면 그대로, 단일 테이블명이면 이스케이프
		if (table.includes(" ") || table.includes(".")) {
			this._from = table;
		} else {
			this._from = this.escapeIdentifier(table);
		}
		return this;
	}

	/**
	 * FROM 테이블 + 별칭
	 * CI3: $this->db->from('posts as p')
	 */
	fromAs(table: string, alias: string): this {
		this._from = `${this.escapeIdentifier(table)} as ${this.escapeIdentifier(alias)}`;
		return this;
	}

	// ─── JOIN ────────────────────────────────────────

	/**
	 * INNER JOIN
	 * CI3: $this->db->join('users u', 'u.id = p.author_id', 'inner')
	 *
	 * 테이블명에 validateJoinTable() 적용으로 SQL 인젝션 방지.
	 * ⚠️ condition은 raw SQL이므로 사용자 입력을 직접 전달하지 마세요.
	 */
	join(
		table: string,
		condition: string,
		type: "INNER" | "LEFT" | "RIGHT" | "CROSS" = "INNER",
	): this {
		this.validateJoinTable(table);
		this._joins.push({ type, table, condition });
		return this;
	}

	/**
	 * LEFT JOIN
	 */
	leftJoin(table: string, condition: string): this {
		return this.join(table, condition, "LEFT");
	}

	/**
	 * RIGHT JOIN
	 * ⚠️ MySQL을 제외한 대부분의 DB에서 RIGHT JOIN 미지원
	 *     SQLite 3.39.0+ 지원, PostgreSQL 지원
	 */
	rightJoin(table: string, condition: string): this {
		return this.join(table, condition, "RIGHT");
	}

	// ─── WHERE ───────────────────────────────────────

	/**
	 * WHERE 조건 추가 (AND)
	 * CI3: $this->db->where('published', 1)
	 * CI3: $this->db->where('created_at >', '2025-01-01')
	 * CI3: $this->db->where('title IS NOT NULL')
	 */
	where(column: string, value?: any): this {
		if (value === undefined) {
			this._wheres.push({ type: "and_raw", sql: column, bindings: [] });
		} else {
			const { col, op } = this.parseColumnOperator(column);
			this.validateColumnName(col);
			this._wheres.push({ type: "and", column: col, operator: op, value });
		}
		return this;
	}

	/**
	 * OR WHERE 조건 추가
	 * CI3: $this->db->or_where('status', 'draft')
	 */
	orWhere(column: string, value?: any): this {
		if (value === undefined) {
			this._wheres.push({ type: "or_raw", sql: column, bindings: [] });
		} else {
			const { col, op } = this.parseColumnOperator(column);
			this.validateColumnName(col);
			this._wheres.push({ type: "or", column: col, operator: op, value });
		}
		return this;
	}

	/**
	 * WHERE IN
	 * CI3: $this->db->where_in('id', [1, 2, 3])
	 */
	whereIn(column: string, values: any[]): this {
		this.validateColumnName(column);
		this._wheres.push({ type: "and_in", column, values });
		return this;
	}

	/**
	 * OR WHERE IN
	 */
	orWhereIn(column: string, values: any[]): this {
		this.validateColumnName(column);
		this._wheres.push({ type: "or_in", column, values });
		return this;
	}

	/**
	 * WHERE NOT IN
	 * CI3: $this->db->where_not_in('id', [1, 2])
	 */
	whereNotIn(column: string, values: any[]): this {
		this.validateColumnName(column);
		this._wheres.push({ type: "and_not_in", column, values });
		return this;
	}

	/**
	 * WHERE BETWEEN
	 * CI3: $this->db->where('age BETWEEN', [20, 30]) — 비표준
	 */
	whereBetween(column: string, low: any, high: any): this {
		this.validateColumnName(column);
		this._wheres.push({ type: "and_between", column, low, high });
		return this;
	}

	/**
	 * WHERE column IS NULL
	 * CI3: $this->db->where('deleted_at IS NULL') — 또는 whereNull 사용
	 */
	whereNull(column: string): this {
		this.validateColumnName(column);
		this._wheres.push({ type: "and_null", column });
		return this;
	}

	/**
	 * WHERE column IS NOT NULL
	 */
	whereNotNull(column: string): this {
		this.validateColumnName(column);
		this._wheres.push({ type: "and_not_null", column });
		return this;
	}

	/**
	 * LIKE 검색
	 * CI3: $this->db->like('title', '검색어')
	 * CI3: $this->db->like('title', '검색어', 'before')  — %검색어
	 * CI3: $this->db->like('title', '검색어', 'after')   — 검색어%
	 */
	like(column: string, value: string, side: "both" | "before" | "after" = "both"): this {
		this.validateColumnName(column);
		this._wheres.push({ type: "and_like", column, value, side });
		return this;
	}

	/**
	 * OR LIKE 검색
	 * CI3: $this->db->or_like('content', '검색어')
	 */
	orLike(column: string, value: string, side: "both" | "before" | "after" = "both"): this {
		this.validateColumnName(column);
		this._wheres.push({ type: "or_like", column, value, side });
		return this;
	}

	/**
	 * 객체로 WHERE 조건 일괄 설정
	 * CI3: $this->db->where(['published' => 1, 'author_id' => 1])
	 */
	whereObject(conditions: Record<string, any>): this {
		for (const [key, val] of Object.entries(conditions)) {
			this.where(key, val);
		}
		return this;
	}

	// ─── GROUP BY / HAVING ──────────────────────────

	/**
	 * GROUP BY
	 * CI3: $this->db->group_by('author_id')
	 *
	 * 컬럼명에 validateColumnName() 적용으로 SQL 인젝션 방지.
	 * 복합 표현식이 필요하면 groupByRaw() 사용.
	 */
	groupBy(...columns: string[]): this {
		for (const col of columns) {
			this.validateColumnName(col);
		}
		this._groupBy.push(...columns);
		return this;
	}

	/**
	 * GROUP BY (raw SQL)
	 * 복합 그룹핑이 필요한 경우 사용.
	 * ⚠️ 사용자 입력을 직접 전달하지 마세요.
	 */
	groupByRaw(sql: string): this {
		this._groupBy.push(sql);
		return this;
	}

	/**
	 * HAVING
	 * CI3: $this->db->having('count >', 5)
	 */
	having(column: string, value?: any): this {
		if (value === undefined) {
			this._havings.push({ type: "and_raw", sql: column, bindings: [] });
		} else {
			const { col, op } = this.parseColumnOperator(column);
			this.validateColumnName(col);
			this._havings.push({ type: "and", column: col, operator: op, value });
		}
		return this;
	}

	// ─── ORDER BY ────────────────────────────────────

	/**
	 * ORDER BY
	 * CI3: $this->db->order_by('created_at', 'DESC')
	 *
	 * 컬럼명에 validateColumnName() 적용으로 SQL 인젝션 방지.
	 * 복합 표현식이 필요하면 orderByRaw() 사용.
	 */
	orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): this {
		this.validateColumnName(column);
		this._orders.push({ column, direction });
		return this;
	}

	/**
	 * ORDER BY (raw SQL)
	 * 복합 정렬이 필요한 경우 사용.
	 * ⚠️ 사용자 입력을 직접 전달하지 마세요.
	 *
	 * 예: qb.orderByRaw("FIELD(status, 'active', 'pending', 'closed')")
	 */
	orderByRaw(sql: string): this {
		this._orders.push({ column: sql, direction: "ASC" as const });
		return this;
	}

	/**
	 * 최신순 정렬 (created_at DESC)
	 */
	latest(column = "created_at"): this {
		return this.orderBy(column, "DESC");
	}

	/**
	 * 오래된순 정렬 (created_at ASC)
	 */
	oldest(column = "created_at"): this {
		return this.orderBy(column, "ASC");
	}

	// ─── LIMIT / OFFSET ─────────────────────────────

	/**
	 * LIMIT
	 * CI3: $this->db->limit(10)
	 * CI3: $this->db->limit(10, 20)  — limit + offset
	 */
	limit(limit: number, offset?: number): this {
		this._limitVal = limit;
		if (offset !== undefined) {
			this._offsetVal = offset;
		}
		return this;
	}

	/**
	 * OFFSET
	 * CI3: $this->db->offset(20)
	 */
	offset(offset: number): this {
		this._offsetVal = offset;
		return this;
	}

	// ─── 실행 메서드 ──────────────────────────────────

	/**
	 * SELECT 쿼리 실행
	 * CI3: $this->db->get()->result()
	 */
	async get<T = any>(): Promise<T[]> {
		const { query, bindings } = this.buildSelect();
		this.reset();
		const sql = await this.getSQL();
		return sql.unsafe(query, bindings) as Promise<T[]>;
	}

	/**
	 * SELECT 쿼리 실행 — 첫 번째 행만 반환
	 * CI3: $this->db->get()->row()
	 */
	async first<T = any>(): Promise<T | null> {
		this._limitVal = 1;
		const { query, bindings } = this.buildSelect();
		this.reset();
		const sql = await this.getSQL();
		const results = await sql.unsafe(query, bindings);
		return (results as T[])[0] ?? null;
	}

	/**
	 * INSERT 실행
	 * CI3: $this->db->insert($data)
	 *
	 * @param table 테이블명 (생략 시 from()에서 설정한 테이블 사용)
	 * @param data 삽입할 데이터
	 */
	async insert<T = any>(
		table?: string,
		data?: Record<string, any>,
	): Promise<{ insertId: number; affectedRows: number; row?: T }> {
		const tableName = table ?? this._from;
		if (!tableName) throw new Error("Table name is required for insert");
		const insertData = data ?? this._insertData;
		if (!insertData || Object.keys(insertData).length === 0) {
			throw new Error("Data is required for insert");
		}

		const adapter = this.detectAdapter();
		const { query, bindings } = this.buildInsert(tableName, insertData);
		this.reset();
		const sql = await this.getSQL();
		const result = await sql.unsafe(query, bindings);

		const insertId = (result as any).lastInsertRowid ?? (result as any).insertId ?? 0;
		const affectedRows = (result as any).affectedRows ?? (result as any).count ?? 0;

		// MySQL은 RETURNING 미지원 → 별도 SELECT로 생성된 행 조회
		let row: T | undefined;
		if (adapter === "mysql" && insertId > 0) {
			const pk = this._lastPrimaryKey ?? "id";
			const rows = await sql.unsafe(
				`SELECT * FROM ${this.escapeIdentifier(tableName)} WHERE ${this.escapeIdentifier(pk)} = ?`,
				[insertId],
			);
			row = (rows as T[])[0];
		}

		return { insertId, affectedRows, row };
	}

	/**
	 * INSERT 후 생성된 행 반환
	 * - PostgreSQL/SQLite: RETURNING * 사용
	 * - MySQL: INSERT 후 SELECT로 재조회
	 *
	 * CI3: $this->db->insert($data) + $this->db->insert_id()
	 */
	async insertReturning<T = any>(table?: string, data?: Record<string, any>): Promise<T> {
		const tableName = table ?? this._from;
		if (!tableName) throw new Error("Table name is required for insert");
		const insertData = data ?? this._insertData;
		if (!insertData || Object.keys(insertData).length === 0) {
			throw new Error("Data is required for insert");
		}

		const adapter = this.detectAdapter();

		if (adapter === "mysql") {
			// MySQL: RETURNING 미지원 → INSERT 후 lastInsertId로 SELECT
			const insertResult = await this.insert<T>(tableName, insertData);
			return insertResult.row as T;
		}

		// PostgreSQL / SQLite: RETURNING * 지원
		const { query, bindings } = this.buildInsertReturning(tableName, insertData);
		this.reset();
		const sql = await this.getSQL();
		const result = await sql.unsafe(query, bindings);
		return (result as T[])[0];
	}

	/**
	 * UPDATE 실행
	 * CI3: $this->db->where('id', $id)->update($data)
	 */
	async update<T = any>(
		table?: string,
		data?: Record<string, any>,
	): Promise<{ affectedRows: number; row?: T }> {
		const tableName = table ?? this._from;
		if (!tableName) throw new Error("Table name is required for update");
		const updateData = data ?? this._updateData;
		if (!updateData || Object.keys(updateData).length === 0) {
			throw new Error("Data is required for update");
		}
		if (this._wheres.length === 0) {
			throw new Error("WHERE clause is required for update (safety)");
		}

		const { query, bindings } = this.buildUpdate(tableName, updateData);
		this.reset();
		const sql = await this.getSQL();
		const result = await sql.unsafe(query, bindings);
		const affectedRows = (result as any).affectedRows ?? (result as any).count ?? 0;

		return { affectedRows };
	}

	/**
	 * UPDATE 후 수정된 행 반환
	 * - PostgreSQL/SQLite: RETURNING * 사용
	 * - MySQL: UPDATE 후 WHERE 조건으로 SELECT 재조회
	 */
	async updateReturning<T = any>(table?: string, data?: Record<string, any>): Promise<T> {
		const tableName = table ?? this._from;
		if (!tableName) throw new Error("Table name is required for update");
		const updateData = data ?? this._updateData;
		if (!updateData || Object.keys(updateData).length === 0) {
			throw new Error("Data is required for update");
		}
		if (this._wheres.length === 0) {
			throw new Error("WHERE clause is required for update (safety)");
		}

		const adapter = this.detectAdapter();

		if (adapter === "mysql") {
			// MySQL: RETURNING 미지원 → UPDATE 후 WHERE 조건으로 SELECT
			const whereBindings: any[] = [];
			const whereSql = this.buildWhereClauses(this._wheres, whereBindings);

			const { query, bindings } = this.buildUpdate(tableName, updateData);
			this.reset();
			const sql = await this.getSQL();
			await sql.unsafe(query, bindings);

			// WHERE 조건으로 다시 SELECT
			const rows = await sql.unsafe(
				`SELECT * FROM ${this.escapeIdentifier(tableName)} WHERE ${whereSql}`,
				whereBindings,
			);
			return (rows as T[])[0];
		}

		// PostgreSQL / SQLite: RETURNING * 지원
		const { query, bindings } = this.buildUpdateReturning(tableName, updateData);
		this.reset();
		const sql = await this.getSQL();
		const result = await sql.unsafe(query, bindings);
		return (result as T[])[0];
	}

	/**
	 * DELETE 실행
	 * CI3: $this->db->where('id', $id)->delete()
	 */
	async delete(table?: string): Promise<{ affectedRows: number }> {
		const tableName = table ?? this._from;
		if (!tableName) throw new Error("Table name is required for delete");
		if (this._wheres.length === 0) {
			throw new Error("WHERE clause is required for delete (safety)");
		}

		const { query, bindings } = this.buildDelete(tableName);
		this.reset();
		const sql = await this.getSQL();
		const result = await sql.unsafe(query, bindings);
		const affectedRows = (result as any).affectedRows ?? (result as any).count ?? 0;

		return { affectedRows };
	}

	/**
	 * COUNT 조회
	 * CI3: $this->db->count_all_results()
	 */
	async count(alias = "count"): Promise<number> {
		this._select = [`COUNT(*) as ${this.escapeIdentifier(alias)}`];
		const { query, bindings } = this.buildSelect();
		this.reset();
		const sql = await this.getSQL();
		const result = await sql.unsafe(query, bindings);
		return (result as any[])[0]?.[alias] ?? 0;
	}

	/**
	 * 존재 여부 확인
	 */
	async exists(): Promise<boolean> {
		return (await this.count()) > 0;
	}

	/**
	 * 페이지네이션
	 * CI3: $this->db->limit($perPage, $offset)->get()
	 */
	async paginate<T = any>(
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
		const total = await this.clone().count();

		const offset = (page - 1) * perPage;
		this._limitVal = perPage;
		this._offsetVal = offset;
		const data = await this.get<T>();

		const totalPages = Math.ceil(total / perPage);

		return {
			data,
			total,
			page,
			perPage,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		};
	}

	/**
	 * 쿼리 빌더 상태 복제 (count 후 원래 쿼리 유지용)
	 */
	clone(): QueryBuilder {
		const cloned = new QueryBuilder(this._dbGroup);
		cloned._select = [...this._select];
		cloned._from = this._from;
		cloned._joins = [...this._joins];
		cloned._wheres = [...this._wheres];
		cloned._groupBy = [...this._groupBy];
		cloned._havings = [...this._havings];
		cloned._orders = [...this._orders];
		cloned._limitVal = this._limitVal;
		cloned._offsetVal = this._offsetVal;
		cloned._distinctVal = this._distinctVal;
		cloned._adapter = this._adapter;
		return cloned;
	}

	/**
	 * 현재 빌드된 SQL 문자열 반환 (디버그용)
	 */
	toSQL(): { query: string; bindings: any[] } {
		return this.buildSelect();
	}

	// ─── 내부: 데이터 설정용 (Model에서 사용) ──────
	private _insertData: Record<string, any> | null = null;
	private _updateData: Record<string, any> | null = null;
	private _lastPrimaryKey: string = "id";

	/** Model에서 PK 이름 설정 (insertReturning fallback용) */
	_setPrimaryKey(key: string): this {
		this._lastPrimaryKey = key;
		return this;
	}

	/** Model.set() / Model.setData()에서 사용 */
	_setInsertData(data: Record<string, any>): this {
		this._insertData = data;
		return this;
	}

	_setUpdateData(data: Record<string, any>): this {
		this._updateData = data;
		return this;
	}

	// ─── 내부: SQL 빌드 ──────────────────────────────

	private buildSelect(): { query: string; bindings: any[] } {
		const bindings: any[] = [];
		const parts: string[] = [];

		// SELECT
		const selectCols = this._select.length > 0 ? this._select.join(", ") : "*";
		parts.push(this._distinctVal ? `SELECT DISTINCT ${selectCols}` : `SELECT ${selectCols}`);

		// FROM
		if (!this._from) throw new Error("FROM table is required. Call .from() first.");
		parts.push(`FROM ${this._from}`);

		// JOIN
		for (const join of this._joins) {
			parts.push(`${join.type} JOIN ${join.table} ON ${join.condition}`);
		}

		// WHERE
		const whereSql = this.buildWhereClauses(this._wheres, bindings);
		if (whereSql) parts.push(`WHERE ${whereSql}`);

		// GROUP BY
		if (this._groupBy.length > 0) {
			parts.push(`GROUP BY ${this._groupBy.join(", ")}`);
		}

		// HAVING
		if (this._havings.length > 0) {
			const havingSql = this.buildWhereClauses(this._havings, bindings);
			if (havingSql) parts.push(`HAVING ${havingSql}`);
		}

		// ORDER BY
		if (this._orders.length > 0) {
			const orderParts = this._orders.map(
				(o) => `${this.escapeIdentifier(o.column)} ${o.direction}`,
			);
			parts.push(`ORDER BY ${orderParts.join(", ")}`);
		}

		// LIMIT / OFFSET — 어댑터별 방언 분기
		this.buildLimitOffset(parts, bindings);

		return { query: parts.join(" "), bindings };
	}

	/**
	 * LIMIT / OFFSET SQL 생성 (어댑터별 방언)
	 *
	 * - PostgreSQL: LIMIT ? OFFSET ?      (표준)
	 * - SQLite:     LIMIT ? OFFSET ?      (표준, 3.8.6+)
	 * - MySQL:      LIMIT ? OFFSET ?      (8.0+ 표준)
	 *               LIMIT offset, count   (5.7 이전 레거시)
	 *
	 * 기본적으로 표준 LIMIT/OFFSET 사용.
	 * MySQL 레거시 호환이 필요한 경우 buildLimitOffsetLegacy 사용.
	 */
	private buildLimitOffset(parts: string[], bindings: any[]): void {
		const adapter = this.detectAdapter();

		if (adapter === "mysql" && this._offsetVal !== null && this._limitVal !== null) {
			// MySQL 레거시: LIMIT offset, count
			// MySQL 8.0+도 표준 LIMIT/OFFSET 지원하지만,
			// 레거시 호환을 위해 LIMIT offset, count 사용
			parts.push(`LIMIT ?, ?`);
			bindings.push(this._offsetVal, this._limitVal);
		} else {
			// 표준: LIMIT count OFFSET offset
			if (this._limitVal !== null) {
				parts.push(`LIMIT ?`);
				bindings.push(this._limitVal);
			}
			if (this._offsetVal !== null) {
				parts.push(`OFFSET ?`);
				bindings.push(this._offsetVal);
			}
		}
	}

	private buildInsert(
		table: string,
		data: Record<string, any>,
	): { query: string; bindings: any[] } {
		const bindings: any[] = [];
		const columns: string[] = [];
		const placeholders: string[] = [];

		for (const [key, value] of Object.entries(data)) {
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
				throw new Error(`Invalid column name: ${key}`);
			}
			columns.push(this.escapeIdentifier(key));
			placeholders.push("?");
			bindings.push(value);
		}

		const query = `INSERT INTO ${this.escapeIdentifier(table)} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
		return { query, bindings };
	}

	private buildInsertReturning(
		table: string,
		data: Record<string, any>,
	): { query: string; bindings: any[] } {
		const { query, bindings } = this.buildInsert(table, data);
		// PostgreSQL / SQLite만 호출됨 (MySQL은 insertReturning에서 분기)
		return { query: `${query} RETURNING *`, bindings };
	}

	private buildUpdate(
		table: string,
		data: Record<string, any>,
	): { query: string; bindings: any[] } {
		const bindings: any[] = [];
		const setParts: string[] = [];

		for (const [key, value] of Object.entries(data)) {
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
				throw new Error(`Invalid column name: ${key}`);
			}
			setParts.push(`${this.escapeIdentifier(key)} = ?`);
			bindings.push(value);
		}

		const whereBindings: any[] = [];
		const whereSql = this.buildWhereClauses(this._wheres, whereBindings);
		bindings.push(...whereBindings);

		if (!whereSql) throw new Error("WHERE clause is required for update (safety)");

		const query = `UPDATE ${this.escapeIdentifier(table)} SET ${setParts.join(", ")} WHERE ${whereSql}`;
		return { query, bindings };
	}

	private buildUpdateReturning(
		table: string,
		data: Record<string, any>,
	): { query: string; bindings: any[] } {
		const { query, bindings } = this.buildUpdate(table, data);
		// PostgreSQL / SQLite만 호출됨
		return { query: `${query} RETURNING *`, bindings };
	}

	private buildDelete(table: string): { query: string; bindings: any[] } {
		const bindings: any[] = [];
		const whereBindings: any[] = [];
		const whereSql = this.buildWhereClauses(this._wheres, whereBindings);
		bindings.push(...whereBindings);

		if (!whereSql) throw new Error("WHERE clause is required for delete (safety)");

		const query = `DELETE FROM ${this.escapeIdentifier(table)} WHERE ${whereSql}`;
		return { query, bindings };
	}

	private buildWhereClauses(clauses: WhereClause[], bindings: any[]): string {
		const parts: string[] = [];

		for (const clause of clauses) {
			const prefix = parts.length > 0 ? (clause.type.startsWith("or") ? " OR " : " AND ") : "";

			switch (clause.type) {
				case "and":
				case "or":
					parts.push(`${prefix}${this.escapeIdentifier(clause.column)} ${clause.operator} ?`);
					bindings.push(clause.value);
					break;

				case "and_raw":
				case "or_raw":
					parts.push(`${prefix}${clause.sql}`);
					bindings.push(...clause.bindings);
					break;

				case "and_in":
				case "or_in":
					parts.push(
						`${prefix}${this.escapeIdentifier(clause.column)} IN (${clause.values.map(() => "?").join(", ")})`,
					);
					bindings.push(...clause.values);
					break;

				case "and_not_in":
					parts.push(
						`${prefix}${this.escapeIdentifier(clause.column)} NOT IN (${clause.values.map(() => "?").join(", ")})`,
					);
					bindings.push(...clause.values);
					break;

				case "and_between":
					parts.push(`${prefix}${this.escapeIdentifier(clause.column)} BETWEEN ? AND ?`);
					bindings.push(clause.low, clause.high);
					break;

				case "and_null":
					parts.push(`${prefix}${this.escapeIdentifier(clause.column)} IS NULL`);
					break;

				case "and_not_null":
					parts.push(`${prefix}${this.escapeIdentifier(clause.column)} IS NOT NULL`);
					break;

				case "and_like":
				case "or_like": {
					const likeValue =
						clause.side === "both"
							? `%${clause.value}%`
							: clause.side === "before"
								? `%${clause.value}`
								: `${clause.value}%`;
					parts.push(`${prefix}${this.escapeIdentifier(clause.column)} LIKE ?`);
					bindings.push(likeValue);
					break;
				}
			}
		}

		return parts.join("");
	}

	/**
	 * 컬럼명에서 연산자 파싱
	 * 'created_at >' → { col: 'created_at', op: '>' }
	 * 'title' → { col: 'title', op: '=' }
	 */
	private parseColumnOperator(column: string): { col: string; op: string } {
		const match = column.match(/^(\w+(?:\.\w+)?)\s*(>=|<=|!=|<>|>|<|=)?\s*$/);
		if (!match) return { col: column.trim(), op: "=" };
		return { col: match[1], op: match[2] ?? "=" };
	}

	/** 컬럼명 화이트리스트 검증 (SQL 인젝션 방지) */
	private validateColumnName(name: string): void {
		// table.column 형식 허용 (p.published, users.name 등)
		const parts = name.split(".");
		for (const part of parts) {
			if (!/^[a-zA-Z_*][a-zA-Z0-9_*]*$/.test(part)) {
				throw new Error(`Invalid column name: ${name}`);
			}
		}
	}

	/**
	 * SELECT 컬럼명 검증
	 *
	 * 허용 패턴:
	 *   - 단순 컬럼: id, title, created_at
	 *   - 테이블.컬럼: p.id, u.name
	 *   - 별칭: id AS user_id, p.name AS author_name
	 *   - 카디널리티: *
	 *
	 * 차단: 서브쿼리 (SELECT ...), 함수 호출 중 의심 패턴
	 */
	private validateSelectColumn(col: string): void {
		// 별칭 분리: "p.name AS author_name" → ["p.name", "author_name"]
		const aliasParts = col.split(/\s+[aA][sS]\s+/);
		const mainPart = aliasParts[0].trim();

		// 서브쿼리 차단
		if (/\(\s*SELECT\s/i.test(mainPart)) {
			throw new Error(`Subquery not allowed in select(). Use selectRaw() instead: ${col}`);
		}

		// 의심 함수 차단 (LOAD_FILE, BENCHMARK 등 위험 함수)
		if (/\b(LOAD_FILE|BENCHMARK|SLEEP|WAITFOR|DELAY)\s*\(/i.test(mainPart)) {
			throw new Error(`Dangerous function in select(). Use selectRaw() if needed: ${col}`);
		}

		// 단순 컬럼명 또는 table.column 형식인지 확인
		// 허용: id, p.id, *, p.*
		const simpleCol = /^[a-zA-Z_*][a-zA-Z0-9_*]*(\.[a-zA-Z_*][a-zA-Z0-9_*]*)?$/;
		if (simpleCol.test(mainPart)) return; // ✅ 안전

		// 허용된 집계/내장 함수: COUNT, SUM, AVG, MAX, MIN
		const aggregatePattern = /^(COUNT|SUM|AVG|MAX|MIN)\s*\(\s*([a-zA-Z_*][a-zA-Z0-9_*.]*)\s*\)$/i;
		if (aggregatePattern.test(mainPart)) return; // ✅ 안전

		// 그 외 복합 표현식 → selectRaw() 사용 유도
		throw new Error(`Complex expression not allowed in select(). Use selectRaw() instead: ${col}`);
	}

	/**
	 * JOIN 테이블명 검증
	 * 허용: users, users u, schema.users u
	 */
	private validateJoinTable(table: string): void {
		// "table alias" 또는 "schema.table alias" 형식
		const parts = table.trim().split(/\s+/);
		for (const part of parts) {
			// 각 파트는 식별자만 허용 (키워드/as 제외)
			if (part.toLowerCase() === "as") continue;
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(part)) {
				throw new Error(`Invalid join table: ${table}`);
			}
		}
	}

	/**
	 * 식별자 이스케이프 — 어댑터별 방언
	 *
	 * - PostgreSQL: "column"  (쌍따옴표)
	 * - SQLite:     "column"  (쌍따옴표)
	 * - MySQL:      `column`  (백틱)
	 *
	 * 함수 호출, 별칭, 테이블.컬럼 형식은 그대로 통과
	 */
	private escapeIdentifier(name: string): string {
		if (
			name.includes("(") ||
			name.includes(".") ||
			name.includes("*") ||
			name.includes(" as ") ||
			name.includes(" AS ")
		) {
			return name;
		}

		const adapter = this.detectAdapter();

		if (adapter === "mysql") {
			return `\`${name.replace(/`/g, "``")}\``;
		}

		// PostgreSQL, SQLite
		return `"${name.replace(/"/g, '""')}"`;
	}

	/** DB 연결 가져오기 */
	private async getSQL(): Promise<SQL> {
		return getDB(this._dbGroup);
	}

	/** 쿼리 빌더 상태 초기화 */
	private reset(): void {
		this._select = [];
		this._from = "";
		this._joins = [];
		this._wheres = [];
		this._groupBy = [];
		this._havings = [];
		this._orders = [];
		this._limitVal = null;
		this._offsetVal = null;
		this._distinctVal = false;
		this._insertData = null;
		this._updateData = null;
		// _adapter는 초기화하지 않음 — 동일 연결 그룹에서 재사용
	}
}

/**
 * QueryBuilder 팩토리 함수
 * CI3: $this->db = $this->load->database();
 *
 * 사용예:
 *   const qb = createQueryBuilder();
 *   const posts = await qb.select('id, title')
 *     .from('posts')
 *     .where('published', 1)
 *     .orderBy('created_at', 'DESC')
 *     .limit(10)
 *     .get();
 */
export function createQueryBuilder(dbGroup?: string): QueryBuilder {
	return new QueryBuilder(dbGroup);
}
