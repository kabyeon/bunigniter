// ============================================================
// BunIgniter - Text 헬퍼
// CodeIgniter3 의 Text Helper 와 동일
// ============================================================

/**
 * 단어 수 제한
 * CI3: word_limiter($str, 20, '...')
 */
export function wordLimiter(str: string, limit: number = 100, suffix: string = "&hellip;"): string {
	const words = str.trim().split(/\s+/);
	if (words.length <= limit) return str;
	return `${words.slice(0, limit).join(" ")}${suffix}`;
}

/**
 * 글자 수 제한
 * CI3: character_limiter($str, 100, '...')
 * HTML 태그 보존하지 않음 (안전한 텍스트 전용)
 */
export function characterLimiter(
	str: string,
	limit: number = 500,
	suffix: string = "&hellip;",
): string {
	if (str.length <= limit) return str;
	// 단어 경계에서 자르기
	const truncated = str.slice(0, limit);
	const lastSpace = truncated.lastIndexOf(" ");
	if (lastSpace > limit * 0.8) {
		return `${truncated.slice(0, lastSpace)}${suffix}`;
	}
	return `${truncated}${suffix}`;
}

/**
 * ASCII 문자만 추출
 * CI3: ascii_only($str)
 */
export function asciiOnly(str: string): string {
	let result = "";
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		if (code >= 0x00 && code <= 0x7f) {
			result += str[i];
		}
	}
	return result;
}

/**
 * 악센트 제거 (영문 변환)
 * CI3: convert_accented_characters($str)
 */
export function convertAccentedChars(str: string): string {
	const map: Record<string, string> = {
		À: "A",
		Á: "A",
		Â: "A",
		Ã: "A",
		Ä: "A",
		Å: "A",
		à: "a",
		á: "a",
		â: "a",
		ã: "a",
		ä: "a",
		å: "a",
		Ò: "O",
		Ó: "O",
		Ô: "O",
		Õ: "O",
		Ö: "O",
		Ø: "O",
		ò: "o",
		ó: "o",
		ô: "o",
		õ: "o",
		ö: "o",
		ø: "o",
		È: "E",
		É: "E",
		Ê: "E",
		Ë: "E",
		è: "e",
		é: "e",
		ê: "e",
		ë: "e",
		Ì: "I",
		Í: "I",
		Î: "I",
		Ï: "I",
		ì: "i",
		í: "i",
		î: "i",
		ï: "i",
		Ù: "U",
		Ú: "U",
		Û: "U",
		Ü: "U",
		ù: "u",
		ú: "u",
		û: "u",
		ü: "u",
		Ñ: "N",
		ñ: "n",
		Ç: "C",
		ç: "c",
		Ð: "D",
		ð: "d",
		Ý: "Y",
		ý: "y",
		ÿ: "y",
		Þ: "Th",
		þ: "th",
		ß: "ss",
		Æ: "Ae",
		æ: "ae",
		Œ: "Oe",
		œ: "oe",
	};
	return str.replace(/[À-ÿ]/g, (c) => map[c] ?? c);
}

/**
 * 욕설/금지어 필터
 * CI3: word_censor($str, $censored, '***')
 */
export function wordCensor(str: string, censored: string[], replacement: string = "***"): string {
	let result = str;
	for (const word of censored) {
		const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
		result = result.replace(regex, replacement);
	}
	return result;
}

/**
 * 구문 하이라이트
 * CI3: highlight_phrase($str, '검색어', '<mark>', '</mark>')
 */
export function highlightPhrase(
	str: string,
	phrase: string,
	tagOpen: string = "<mark>",
	tagClose: string = "</mark>",
): string {
	if (!phrase) return str;
	const escaped = escapeRegex(phrase);
	const regex = new RegExp(`(${escaped})`, "gi");
	return str.replace(regex, `${tagOpen}$1${tagClose}`);
}

/**
 * 줄바꿈 처리 (word wrap)
 * CI3: word_wrap($str, 75)
 */
export function wordWrap(str: string, length: number = 75, breakChar: string = "\n"): string {
	let result = "";
	const lines = str.split("\n");

	for (const line of lines) {
		if (line.length <= length) {
			result += line + breakChar;
			continue;
		}
		let current = line;
		while (current.length > length) {
			let breakPoint = length;
			// 단어 경계 찾기
			const spaceIndex = current.lastIndexOf(" ", length);
			if (spaceIndex > 0) breakPoint = spaceIndex;
			result += current.slice(0, breakPoint) + breakChar;
			current = current.slice(breakPoint).trimStart();
		}
		result += current + breakChar;
	}

	return result.trimEnd();
}

/**
 * 말줄임 (가운데/앞/뒤)
 * CI3: ellipsize($str, 32, 0.5)
 *
 * @param position 말줄임 위치 (0=앞, 0.5=가운데, 1=뒤)
 */
export function ellipsize(str: string, maxLength: number, position: number = 0.5): string {
	if (str.length <= maxLength) return str;

	const ellipsis = "&hellip;";
	const targetLength = maxLength - 1; // ellipsis 1자리 차감

	if (position <= 0) {
		return `${ellipsis}${str.slice(-targetLength)}`;
	}
	if (position >= 1) {
		return `${str.slice(0, targetLength)}${ellipsis}`;
	}

	// 가운데 말줄임
	const before = Math.ceil(targetLength * position);
	const after = targetLength - before;
	return `${str.slice(0, before)}${ellipsis}${str.slice(-after)}`;
}

/**
 * 텍스트 자동 링크 (URL을 <a> 태그로 변환)
 */
export function autoLink(str: string, attributes: Record<string, string> = {}): string {
	const attrStr = Object.entries(attributes)
		.map(([k, v]) => `${k}="${v}"`)
		.join(" ");
	const extra = attrStr ? ` ${attrStr}` : "";

	// URL 자동 링크
	const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
	let result = str.replace(urlRegex, `<a href="$1"${extra}>$1</a>`);

	// 이메일 자동 링크
	const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
	result = result.replace(emailRegex, `<a href="mailto:$1"${extra}>$1</a>`);

	return result;
}

/**
 * 줄바꿈을 <br>로 변환
 * CI3: nl2br()와 유사 (PHP 내장)
 */
export function nl2br(str: string): string {
	return str.replace(/\n/g, "<br />\n");
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
