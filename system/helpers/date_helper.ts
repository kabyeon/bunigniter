// ============================================================
// BunIgniter - 날짜 헬퍼
// CodeIgniter3 의 Date Helper 와 동일
// ============================================================

/**
 * 날짜 포맷팅
 * CI3: standard_date() / mdate() 유사
 *
 * 포맷 문자:
 *   Y - 연도 (4자리)
 *   m - 월 (2자리, 01-12)
 *   d - 일 (2자리, 01-31)
 *   H - 시 (2자리, 00-23)
 *   i - 분 (2자리, 00-59)
 *   s - 초 (2자리, 00-59)
 */
export function formatDate(date: Date | string, format: string = "Y-m-d H:i:s"): string {
	const d = typeof date === "string" ? new Date(date) : date;

	const map: Record<string, string> = {
		Y: d.getFullYear().toString(),
		m: (d.getMonth() + 1).toString().padStart(2, "0"),
		d: d.getDate().toString().padStart(2, "0"),
		H: d.getHours().toString().padStart(2, "0"),
		i: d.getMinutes().toString().padStart(2, "0"),
		s: d.getSeconds().toString().padStart(2, "0"),
	};

	let result = format;
	for (const [key, val] of Object.entries(map)) {
		result = result.replace(key, val);
	}
	return result;
}

/**
 * 상대 시간 표시
 * CI3: timespan() 의 간소화 버전
 */
export function timeAgo(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

	if (seconds < 60) return "방금 전";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
	if (seconds < 2592000) return `${Math.floor(seconds / 86400)}일 전`;
	if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}개월 전`;
	return `${Math.floor(seconds / 31536000)}년 전`;
}

/**
 * 현재 타임스탬프 반환
 * CI3: now()
 */
export function now(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * 현재 날짜/시간 포맷팅
 * CI3: mdate("%Y-%m-%d %H:%i:%s", now())
 */
export function nowFormatted(format: string = "Y-m-d H:i:s"): string {
	return formatDate(new Date(), format);
}

/**
 * 두 날짜 사이의 일수
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
	const d1 = typeof date1 === "string" ? new Date(date1) : date1;
	const d2 = typeof date2 === "string" ? new Date(date2) : date2;
	const diff = Math.abs(d2.getTime() - d1.getTime());
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * 날짜가 유효한지 확인
 */
export function isValidDate(date: Date | string): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	return !Number.isNaN(d.getTime());
}

/**
 * 날짜가 오늘인지 확인
 */
export function isToday(date: Date | string): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	const today = new Date();
	return (
		d.getFullYear() === today.getFullYear() &&
		d.getMonth() === today.getMonth() &&
		d.getDate() === today.getDate()
	);
}

/**
 * 날짜가 어제인지 확인
 */
export function isYesterday(date: Date | string): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	return (
		d.getFullYear() === yesterday.getFullYear() &&
		d.getMonth() === yesterday.getMonth() &&
		d.getDate() === yesterday.getDate()
	);
}

/**
 * 타임스탬프를 Date로 변환
 */
export function fromTimestamp(ts: number): Date {
	return new Date(ts * 1000);
}

/**
 * Date를 타임스탬프로 변환
 */
export function toTimestamp(date: Date | string): number {
	const d = typeof date === "string" ? new Date(date) : date;
	return Math.floor(d.getTime() / 1000);
}
