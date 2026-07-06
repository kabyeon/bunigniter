// ============================================================
// BunIgniter - 문자열 헬퍼
// CodeIgniter3 의 String Helper 와 동일
// ============================================================

/**
 * 슬러그 생성
 * CI3: url_title($str, 'dash', true)
 */
export function slug(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9가-힣]+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * 문자열 자르기
 * CI3: character_limiter() 의 간소화 버전
 */
export function truncate(str: string, length: number = 100, suffix: string = "..."): string {
	if (str.length <= length) return str;
	return str.slice(0, length) + suffix;
}

/**
 * HTML 엔티티 이스케이프 (XSS 방지)
 * CI3: htmlspecialchars() 와 동일
 */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * HTML 엔티티 디코딩
 */
export function unescapeHtml(str: string): string {
	return str
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/&#39;/g, "'");
}

/**
 * 따옴표 제거
 * CI3: strip_quotes()
 */
export function stripQuotes(str: string): string {
	return str.replace(/['""]/g, "");
}

/**
 * 카멜케이스 변환
 * CI3: camelize()
 */
export function camelize(str: string): string {
	return str
		.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
		.replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/**
 * 파스칼케이스 변환
 */
export function pascalize(str: string): string {
	return str
		.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
		.replace(/^[a-z]/, (c) => c.toUpperCase());
}

/**
 * 스네이크케이스 변환
 * CI3: underscore()
 */
export function snakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, "_$1")
		.replace(/[-\s]+/g, "_")
		.replace(/^_/, "")
		.toLowerCase();
}

/**
 * 스터디케이스 변환 (케밥케이스)
 */
export function kebabCase(str: string): string {
	return str
		.replace(/([A-Z])/g, "-$1")
		.replace(/[_\s]+/g, "-")
		.replace(/^-/, "")
		.toLowerCase();
}

/**
 * 단어 첫 글자 대문자
 * CI3: ucwords()
 */
export function ucwords(str: string): string {
	return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * 랜덤 문자열 생성
 * CI3: random_string('alnum', 16)
 */
export function randomString(
	type: "alpha" | "alnum" | "numeric" | "hex" = "alnum",
	length: number = 16,
): string {
	let chars = "";
	switch (type) {
		case "alpha":
			chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
			break;
		case "alnum":
			chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			break;
		case "numeric":
			chars = "0123456789";
			break;
		case "hex":
			chars = "0123456789abcdef";
			break;
	}
	let result = "";
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}
	return result;
}

/**
 * 반복 문자열 축소
 * CI3: reduce_multiples()
 */
export function reduceMultiples(str: string, char: string = "|", trim: boolean = false): string {
	const regex = new RegExp(`${escapeRegex(char)}+`, "g");
	let result = str.replace(regex, char);
	if (trim) {
		result = result.replace(new RegExp(`^${escapeRegex(char)}`), "");
		result = result.replace(new RegExp(`${escapeRegex(char)}$`), "");
	}
	return result;
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
