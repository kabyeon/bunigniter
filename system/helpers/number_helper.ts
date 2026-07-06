// ============================================================
// BunIgniter - 숫자 헬퍼
// CodeIgniter3 의 Number Helper 와 동일
// ============================================================

/**
 * 숫자 포맷팅 (천 단위 구분)
 * CI3: number_format()
 */
export function formatNumber(num: number): string {
	return num.toLocaleString("ko-KR");
}

/**
 * 통화 포맷팅 (원화)
 */
export function formatCurrency(amount: number, currency: string = "원"): string {
	return `${amount.toLocaleString("ko-KR")}${currency}`;
}

/**
 * 바이트 단위 포맷팅
 * CI3: byte_format()
 */
export function formatBytes(bytes: number, precision: number = 1): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB", "PB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / 1024 ** i;
	return `${value.toFixed(precision)} ${units[i]}`;
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: number, total: number, precision: number = 1): string {
	if (total === 0) return "0%";
	return `${((value / total) * 100).toFixed(precision)}%`;
}

/**
 * 단수/복수 표시
 * CI3: plural() 헬퍼
 */
export function plural(count: number, singular: string, pluralStr?: string): string {
	return count === 1 ? singular : (pluralStr ?? `${singular}s`);
}

/**
 * 범위 내 숫자 클램프
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * 로마 숫자 변환
 */
export function toRoman(num: number): string {
	if (num <= 0 || num > 3999) return String(num);
	const map: [number, string][] = [
		[1000, "M"],
		[900, "CM"],
		[500, "D"],
		[400, "CD"],
		[100, "C"],
		[90, "XC"],
		[50, "L"],
		[40, "XL"],
		[10, "X"],
		[9, "IX"],
		[5, "V"],
		[4, "IV"],
		[1, "I"],
	];
	let result = "";
	for (const [value, symbol] of map) {
		while (num >= value) {
			result += symbol;
			num -= value;
		}
	}
	return result;
}
