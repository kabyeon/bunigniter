// ============================================================
// BunIgniter - Scheduled Job (Cron) System
// Bun.cron() 내장 기능 활용
// 인프로세스 + OS-레벨 크론잡 지원
// ============================================================

// ─── 스케줄드 잡 인터페이스 ──────────────────────────

export interface ScheduledJobConfig {
	/** 크론 표현식 (5-field) 또는 닉네임 (@hourly, @daily 등) */
	schedule: string;
	/** 잡 이름 (로깅/디버깅용) */
	name: string;
	/** 핸들러 */
	handler: (this: any) => unknown;
	/** 활성화 여부 */
	enabled?: boolean;
}

export interface OsCronConfig {
	/** 실행할 스크립트 경로 */
	scriptPath: string;
	/** 크론 표현식 */
	schedule: string;
	/** OS 크론 잡 식별자 */
	title: string;
}

// ─── 등록된 잡 추적 ──────────────────────────────────

interface TrackedJob {
	name: string;
	schedule: string;
	enabled: boolean;
	handler: () => unknown;
	cronJob: any; // CronJob handle from Bun.cron
	createdAt: number;
	lastRunAt: number | null;
	lastError: string | null;
	runCount: number;
	errorCount: number;
}

// ─── Scheduler 매니저 ─────────────────────────────────

/**
 * 스케줄드 잡 매니저
 * Bun.cron() 내장 기능을 래핑하여 관리
 *
 * 사용법:
 *   import { Scheduler } from "system/core/scheduler.ts";
 *
 *   Scheduler.add("cleanup-temp", "0 * * * *", async () => {
 *     await cleanupTempFiles();
 *   });
 *
 *   Scheduler.add("daily-report", "@daily", async () => {
 *     await generateDailyReport();
 *   });
 *
 *   Scheduler.startAll();
 *
 *   // OS-레벨 크론 (프로세스 재시작 후에도 유지)
 *   await Scheduler.registerOs("./jobs/report.ts", "30 2 * * MON", "weekly-report");
 */
export class Scheduler {
	private static jobs: Map<string, TrackedJob> = new Map();
	private static started: boolean = false;

	// ─── 인프로세스 크론 ──────────────────────────────

	/**
	 * 스케줄드 잡 추가
	 * Bun.cron(schedule, handler) 내장 사용
	 */
	static add(
		name: string,
		schedule: string,
		handler: () => unknown,
		options?: { enabled?: boolean },
	): void {
		if (Scheduler.jobs.has(name)) {
			Scheduler.remove(name);
		}

		const enabled = options?.enabled ?? true;
		let cronJob: any = null;

		if (enabled) {
			cronJob = Bun.cron(schedule, function (this: any) {
				const job = Scheduler.jobs.get(name);
				if (!job || !job.enabled) return;

				job.lastRunAt = Date.now();
				try {
					const result = handler.call(this);
					// Promise면 에러 캐치
					if (result instanceof Promise) {
						result.catch((err: any) => {
							job.lastError = err?.message ?? String(err);
							job.errorCount++;
							console.error(
								`[BunIgniter] Scheduled job "${name}" failed:`,
								err,
							);
						});
					}
					job.runCount++;
				} catch (err: any) {
					job.lastError = err?.message ?? String(err);
					job.errorCount++;
					console.error(
						`[BunIgniter] Scheduled job "${name}" failed:`,
						err,
					);
				}
			});
		}

		Scheduler.jobs.set(name, {
			name,
			schedule,
			enabled,
			handler,
			cronJob,
			createdAt: Date.now(),
			lastRunAt: null,
			lastError: null,
			runCount: 0,
			errorCount: 0,
		});
	}

	/**
	 * 여러 잡 일괄 추가
	 */
	static addMany(
		jobs: Array<{
			name: string;
			schedule: string;
			handler: () => unknown;
			enabled?: boolean;
		}>,
	): void {
		for (const job of jobs) {
			Scheduler.add(job.name, job.schedule, job.handler, {
				enabled: job.enabled,
			});
		}
	}

	/**
	 * 잡 제거
	 */
	static remove(name: string): boolean {
		const job = Scheduler.jobs.get(name);
		if (!job) return false;

		if (job.cronJob && typeof job.cronJob.stop === "function") {
			job.cronJob.stop();
		}
		Scheduler.jobs.delete(name);
		return true;
	}

	/**
	 * 잡 활성화
	 */
	static enable(name: string): boolean {
		const job = Scheduler.jobs.get(name);
		if (!job) return false;

		if (!job.enabled) {
			job.enabled = true;
			job.cronJob = Bun.cron(job.schedule, function (this: any) {
				if (!job.enabled) return;
				job.lastRunAt = Date.now();
				try {
					const result = job.handler.call(this);
					if (result instanceof Promise) {
						result.catch((err: any) => {
							job.lastError = err?.message ?? String(err);
							job.errorCount++;
						});
					}
					job.runCount++;
				} catch (err: any) {
					job.lastError = err?.message ?? String(err);
					job.errorCount++;
				}
			});
		}
		return true;
	}

	/**
	 * 잡 비활성화
	 */
	static disable(name: string): boolean {
		const job = Scheduler.jobs.get(name);
		if (!job) return false;

		if (job.enabled && job.cronJob && typeof job.cronJob.stop === "function") {
			job.cronJob.stop();
		}
		job.enabled = false;
		job.cronJob = null;
		return true;
	}

	/**
	 * 모든 잡 시작
	 */
	static startAll(): void {
		for (const [name, job] of Scheduler.jobs.entries()) {
			if (!job.enabled) {
				Scheduler.enable(name);
			}
		}
		Scheduler.started = true;
		console.log(
			`[BunIgniter] Scheduler started: ${Scheduler.jobs.size} jobs`,
		);
	}

	/**
	 * 모든 잡 정지
	 */
	static stopAll(): void {
		for (const [, job] of Scheduler.jobs.entries()) {
			if (job.cronJob && typeof job.cronJob.stop === "function") {
				job.cronJob.stop();
			}
			job.cronJob = null;
		}
		Scheduler.started = false;
		console.log("[BunIgniter] Scheduler stopped");
	}

	// ─── OS-레벨 크론 ─────────────────────────────────

	/**
	 * OS-레벨 크론 잡 등록
	 * Bun.cron(path, schedule, title) 내장 사용
	 * 프로세스 재시작 후에도 유지됨
	 */
	static async registerOs(config: OsCronConfig): Promise<void> {
		await Bun.cron(config.scriptPath, config.schedule, config.title);
		console.log(
			`[BunIgniter] OS cron registered: "${config.title}" (${config.schedule})`,
		);
	}

	/**
	 * OS-레벨 크론 잡 제거
	 */
	static async removeOs(title: string): Promise<void> {
		await Bun.cron.remove(title);
		console.log(`[BunIgniter] OS cron removed: "${title}"`);
	}

	// ─── 크론 표현식 파싱 ──────────────────────────────

	/**
	 * 크론 표현식의 다음 실행 시각 조회
	 * Bun.cron.parse() 내장 사용
	 */
	static nextRun(schedule: string, from?: Date | number): Date | null {
		return Bun.cron.parse(schedule, from ?? Date.now());
	}

	/**
	 * 다음 N번의 실행 시각 조회
	 */
	static upcomingRuns(
		schedule: string,
		count: number = 5,
		from?: Date | number,
	): Array<Date> {
		const runs: Array<Date> = [];
		let cursor: Date | number = from ?? Date.now();

		for (let i = 0; i < count; i++) {
			const next = Bun.cron.parse(schedule, cursor);
			if (!next) break;
			runs.push(next);
			cursor = next.getTime() + 1;
		}

		return runs;
	}

	// ─── 상태 조회 ──────────────────────────────────────

	/**
	 * 등록된 잡 목록
	 */
	static list(): Array<{
		name: string;
		schedule: string;
		enabled: boolean;
		createdAt: number;
		lastRunAt: number | null;
		lastError: string | null;
		runCount: number;
		errorCount: number;
		nextRun: Date | null;
	}> {
		return Array.from(Scheduler.jobs.values()).map((job) => ({
			name: job.name,
			schedule: job.schedule,
			enabled: job.enabled,
			createdAt: job.createdAt,
			lastRunAt: job.lastRunAt,
			lastError: job.lastError,
			runCount: job.runCount,
			errorCount: job.errorCount,
			nextRun: job.enabled ? Scheduler.nextRun(job.schedule) : null,
		}));
	}

	/**
	 * 특정 잡 조회
	 */
	static get(name: string): TrackedJob | undefined {
		return Scheduler.jobs.get(name);
	}

	/**
	 * 잡 개수
	 */
	static count(): number {
		return Scheduler.jobs.size;
	}

	/**
	 * 실행 중 여부
	 */
	static isStarted(): boolean {
		return Scheduler.started;
	}
}

/** 싱글톤 */
export const scheduler = Scheduler;
