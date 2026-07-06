// ============================================================
// BunIgniter - Audit Log
// 모델 이벤트 추적 + 로깅 통합
// CI3의 $this->db->insert_id() + 로깅 대체
// ============================================================

import { getDB } from "./database.ts";
import { logger } from "./logger.ts";
import { Model } from "./model.ts";

// ─── 인터페이스 ──────────────────────────────────────

export interface AuditLogEntry {
	id?: number;
	/** 이벤트 타입: "create" | "update" | "delete" | "login" | "custom" */
	event: string;
	/** 대상 모델/리소스 */
	entity_type: string;
	/** 대상 ID */
	entity_id: string;
	/** 변경 전 데이터 (JSON) */
	old_values: string | null;
	/** 변경 후 데이터 (JSON) */
	new_values: string | null;
	/** 사용자 ID */
	user_id: number | null;
	/** IP 주소 */
	ip_address: string;
	/** 설명 */
	description: string | null;
	/** 생성 시각 */
	created_at?: string;
}

export interface AuditLogConfig {
	/** 감사 로그 활성화 */
	enabled: boolean;
	/** 추적할 이벤트 */
	trackEvents: string[];
	/** 로그 파일에도 기록 */
	logToFile: boolean;
	/** 사용자 ID 해결 함수 */
	userIdResolver?: () => number | null;
}

// ─── AuditLogModel ──────────────────────────────────────

export class AuditLogModel extends Model<AuditLogEntry> {
	override tableName = "audit_logs";
}

// ─── AuditLog 매니저 ────────────────────────────────────

/**
 * 감사 로그 매니저
 * 모델 이벤트(생성/수정/삭제)를 자동 추적
 *
 * 사용법:
 *   import { AuditLog } from "system/core/audit_log.ts";
 *
 *   // 감사 로그 테이블 생성 (마이그레이션)
 *   await AuditLog.createTable();
 *
 *   // 모델 이벤트 추적 설정
 *   AuditLog.configure({
 *     enabled: true,
 *     trackEvents: ["create", "update", "delete"],
 *     userIdResolver: () => Auth.user()?.id ?? null,
 *   });
 *
 *   // 수동 로그 기록
 *   await AuditLog.log("login", "users", "42", null, { ip: "127.0.0.1" });
 *
 *   // 모델에 감사 추적 추가
 *   AuditLog.track(postModel, ["create", "update", "delete"]);
 *
 *   // 로그 조회
 *   const logs = await AuditLog.getLogs("users", "42");
 */
export class AuditLog {
	private static config: AuditLogConfig = {
		enabled: false,
		trackEvents: ["create", "update", "delete"],
		logToFile: true,
	};

	private static trackedModels: Map<string, any> = new Map();
	private static modelInstance: AuditLogModel | null = null;

	// ─── 설정 ────────────────────────────────────────────

	/**
	 * 감사 로그 설정
	 */
	static configure(config: Partial<AuditLogConfig>): void {
		AuditLog.config = { ...AuditLog.config, ...config };
	}

	// ─── 테이블 생성 ──────────────────────────────────────

	/**
	 * 감사 로그 테이블 생성 (마이그레이션)
	 */
	static async createTable(): Promise<void> {
		const db = await getDB();
		await db`CREATE TABLE IF NOT EXISTS audit_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			event TEXT NOT NULL,
			entity_type TEXT NOT NULL,
			entity_id TEXT NOT NULL,
			old_values TEXT,
			new_values TEXT,
			user_id INTEGER,
			ip_address TEXT,
			description TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`;
		console.log("[BunIgniter] Audit log table created");
	}

	// ─── 로그 기록 ────────────────────────────────────────

	/**
	 * 감사 로그 기록
	 */
	static async log(
		event: string,
		entityType: string,
		entityId: string,
		newValues: any = null,
		options?: {
			oldValues?: any;
			userId?: number | null;
			ipAddress?: string;
			description?: string;
		},
	): Promise<AuditLogEntry | null> {
		if (!AuditLog.config.enabled) return null;

		// 이벤트 필터링
		if (AuditLog.config.trackEvents.length > 0 && !AuditLog.config.trackEvents.includes(event)) {
			return null;
		}

		const userId = options?.userId ?? AuditLog.config.userIdResolver?.() ?? null;
		const ipAddress = options?.ipAddress ?? "unknown";
		const description = options?.description ?? null;

		const entry: AuditLogEntry = {
			event,
			entity_type: entityType,
			entity_id: entityId,
			old_values: options?.oldValues ? JSON.stringify(options.oldValues) : null,
			new_values: newValues ? JSON.stringify(newValues) : null,
			user_id: userId,
			ip_address: ipAddress,
			description,
		};

		// DB에 저장
		try {
			if (!AuditLog.modelInstance) {
				AuditLog.modelInstance = new AuditLogModel();
			}
			await AuditLog.modelInstance.create(entry as any);
		} catch (err) {
			console.error("[BunIgniter] Audit log save error:", err);
		}

		// 파일 로그에도 기록
		if (AuditLog.config.logToFile) {
			logger.info(
				`[Audit] ${event} ${entityType}:${entityId} by user:${userId ?? "unknown"} from ${ipAddress}`,
			);
		}

		return entry;
	}

	// ─── 편의 메서드 ──────────────────────────────────────

	/**
	 * 생성 이벤트 로그
	 */
	static async logCreate(
		entityType: string,
		entityId: string,
		newValues: any,
		options?: { userId?: number | null; ipAddress?: string },
	): Promise<AuditLogEntry | null> {
		return AuditLog.log("create", entityType, entityId, newValues, options);
	}

	/**
	 * 수정 이벤트 로그
	 */
	static async logUpdate(
		entityType: string,
		entityId: string,
		oldValues: any,
		newValues: any,
		options?: { userId?: number | null; ipAddress?: string },
	): Promise<AuditLogEntry | null> {
		return AuditLog.log("update", entityType, entityId, newValues, {
			...options,
			oldValues,
		});
	}

	/**
	 * 삭제 이벤트 로그
	 */
	static async logDelete(
		entityType: string,
		entityId: string,
		oldValues: any,
		options?: { userId?: number | null; ipAddress?: string },
	): Promise<AuditLogEntry | null> {
		return AuditLog.log("delete", entityType, entityId, null, {
			...options,
			oldValues,
		});
	}

	/**
	 * 로그인 이벤트 로그
	 */
	static async logLogin(
		entityType: string = "users",
		entityId: string,
		ipAddress: string,
		options?: { userId?: number | null; description?: string },
	): Promise<AuditLogEntry | null> {
		return AuditLog.log("login", entityType, entityId, null, {
			ipAddress,
			...options,
		});
	}

	/**
	 * 커스텀 이벤트 로그
	 */
	static async logCustom(
		event: string,
		entityType: string,
		entityId: string,
		description: string,
		options?: { userId?: number | null; ipAddress?: string; newValues?: any },
	): Promise<AuditLogEntry | null> {
		return AuditLog.log(event, entityType, entityId, options?.newValues, {
			description,
			...options,
		});
	}

	// ─── 로그 조회 ────────────────────────────────────────

	/**
	 * 엔티티의 감사 로그 조회
	 */
	static async getLogs(
		entityType: string,
		entityId?: string,
		limit: number = 50,
	): Promise<AuditLogEntry[]> {
		if (!AuditLog.modelInstance) {
			AuditLog.modelInstance = new AuditLogModel();
		}

		const conditions: any = { entity_type: entityType };
		if (entityId) conditions.entity_id = entityId;

		const all = await AuditLog.modelInstance.findWhere(conditions);
		return all.slice(0, limit) as AuditLogEntry[];
	}

	/**
	 * 특정 이벤트 타입의 로그 조회
	 */
	static async getLogsByEvent(event: string, limit: number = 50): Promise<AuditLogEntry[]> {
		if (!AuditLog.modelInstance) {
			AuditLog.modelInstance = new AuditLogModel();
		}
		const all = await AuditLog.modelInstance.findWhere({ event } as any);
		return all.slice(0, limit) as AuditLogEntry[];
	}

	/**
	 * 사용자의 감사 로그 조회
	 */
	static async getLogsByUser(userId: number, limit: number = 50): Promise<AuditLogEntry[]> {
		if (!AuditLog.modelInstance) {
			AuditLog.modelInstance = new AuditLogModel();
		}
		const all = await AuditLog.modelInstance.findWhere({
			user_id: userId,
		} as any);
		return all.slice(0, limit) as AuditLogEntry[];
	}

	// ─── 모델 추적 ────────────────────────────────────────

	/**
	 * 모델에 감사 추적 설정
	 * 모델의 create/update/delete 후 자동 로그 기록
	 */
	static track(model: any, events: string[] = ["create", "update", "delete"]): void {
		const tableName = model.tableName ?? "unknown";
		AuditLog.trackedModels.set(tableName, { model, events });
	}

	/**
	 * 추적된 모델의 이벤트 발생 시 자동 로그 기록
	 * 모델 옵저버에서 호출
	 */
	static async onModelEvent(
		event: string,
		tableName: string,
		entityId: string,
		oldValues?: any,
		newValues?: any,
		options?: { userId?: number | null; ipAddress?: string },
	): Promise<void> {
		const tracked = AuditLog.trackedModels.get(tableName);
		if (!tracked) return;
		if (!tracked.events.includes(event)) return;

		await AuditLog.log(event, tableName, entityId, newValues, {
			oldValues,
			...options,
		});
	}

	/**
	 * 추적된 모델 목록
	 */
	static getTrackedModels(): string[] {
		return Array.from(AuditLog.trackedModels.keys());
	}

	/**
	 * 활성화 여부
	 */
	static isEnabled(): boolean {
		return AuditLog.config.enabled;
	}
}

/** 싱글톤 */
export const auditLog = AuditLog;
