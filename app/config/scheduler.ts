// ============================================================
// BunIgniter - 스케줄러 설정
// app/config/scheduler.ts
// ============================================================

export interface SchedulerConfig {
	/** 스케줄러 활성화 */
	enabled: boolean;
	/** 크론 표현식의 타임존 (기본 UTC) */
	timezone: string;
	/** OS-레벨 크론 사용 */
	useOsCron: boolean;
}

const config: SchedulerConfig = {
	enabled: process.env.SCHEDULER_ENABLED !== "false",
	timezone: process.env.TZ ?? "UTC",
	useOsCron: process.env.SCHEDULER_OS_CRON === "true",
};

export default config;
