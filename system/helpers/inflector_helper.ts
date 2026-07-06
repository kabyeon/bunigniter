// ============================================================
// BunIgniter - Inflector 헬퍼
// CodeIgniter3 의 Inflector Helper 와 동일
// 단수/복수 변환, 케이스 변환 등
// ============================================================

/**
 * 단수→복수 변환 (영문)
 * CI3: plural()
 *
 * 규칙 기반 변환. 불규칙 복수형 지원.
 */
export function pluralize(word: string): string {
	if (!word) return word;

	// 불규칙 복수형
	const irregulars: Record<string, string> = {
		person: "people",
		man: "men",
		woman: "women",
		child: "children",
		mouse: "mice",
		goose: "geese",
		ox: "oxen",
		foot: "feet",
		tooth: "teeth",
		louse: "lice",
		die: "dice",
		elf: "elves",
		knife: "knives",
		leaf: "leaves",
		life: "lives",
		loaf: "loaves",
		potato: "potatoes",
		tomato: "tomatoes",
		cactus: "cacti",
		focus: "foci",
		fungus: "fungi",
		nucleus: "nuclei",
		syllabus: "syllabi",
		analysis: "analyses",
		basis: "bases",
		crisis: "crises",
		diagnosis: "diagnoses",
		thesis: "theses",
		phenomenon: "phenomena",
		criterion: "criteria",
		datum: "data",
		index: "indices",
		matrix: "matrices",
		vertex: "vertices",
	};

	const lower = word.toLowerCase();
	if (irregulars[lower]) {
		return preserveCase(word, irregulars[lower]);
	}

	// 이미 복수형인 경우
	const alreadyPlural = [
		"sheep",
		"fish",
		"deer",
		"species",
		"series",
		"aircraft",
		"moose",
		"swine",
	];
	if (alreadyPlural.includes(lower)) return word;

	// 규칙 기반 변환
	if (lower.endsWith("ies") && lower.length > 3) return word; // 이미 복수
	if (lower.endsWith("es") && lower.length > 3) {
		// -ses, -xes, -zes, -ches, -shes → 이미 복수
		if (/(?:s|x|z|ch|sh)es$/.test(lower)) return word;
	}

	// 변환 규칙 (순서 중요)
	if (lower.endsWith("y") && !/[aeiou]y$/i.test(lower)) {
		return preserveCase(word, `${word.slice(0, -1)}ies`);
	}
	if (/(?:s|x|z|ch|sh)$/i.test(lower)) {
		return preserveCase(word, `${word}es`);
	}
	if (lower.endsWith("f")) {
		return preserveCase(word, `${word.slice(0, -1)}ves`);
	}
	if (lower.endsWith("fe")) {
		return preserveCase(word, `${word.slice(0, -2)}ves`);
	}

	return preserveCase(word, `${word}s`);
}

/**
 * 복수→단수 변환 (영문)
 * CI3: singular()
 */
export function singularize(word: string): string {
	if (!word) return word;

	// 불규칙 단수형
	const irregulars: Record<string, string> = {
		people: "person",
		men: "man",
		women: "woman",
		children: "child",
		mice: "mouse",
		geese: "goose",
		oxen: "ox",
		feet: "foot",
		teeth: "tooth",
		lice: "louse",
		dice: "die",
		elves: "elf",
		knives: "knife",
		leaves: "leaf",
		lives: "life",
		loaves: "loaf",
		potatoes: "potato",
		tomatoes: "tomato",
		cacti: "cactus",
		foci: "focus",
		fungi: "fungus",
		nuclei: "nucleus",
		syllabi: "syllabus",
		analyses: "analysis",
		bases: "basis",
		crises: "crisis",
		diagnoses: "diagnosis",
		theses: "thesis",
		phenomena: "phenomenon",
		criteria: "criterion",
		data: "datum",
		indices: "index",
		matrices: "matrix",
		vertices: "vertex",
	};

	const lower = word.toLowerCase();
	if (irregulars[lower]) {
		return preserveCase(word, irregulars[lower]);
	}

	// 변환 규칙
	if (lower.endsWith("ies") && lower.length > 3) {
		return preserveCase(word, `${word.slice(0, -3)}y`);
	}
	if (lower.endsWith("ves")) {
		// knives → knife, leaves → leaf, lives → life
		if (lower.endsWith("ives")) {
			return preserveCase(word, `${word.slice(0, -3)}ife`);
		}
		return preserveCase(word, `${word.slice(0, -3)}f`);
	}
	if (/(?:ses|xes|zes|ches|shes)$/i.test(lower)) {
		return preserveCase(word, word.slice(0, -2));
	}
	if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 1) {
		return preserveCase(word, word.slice(0, -1));
	}

	return word;
}

/**
 * 테이블명 → 모델명 변환
 * users → User, post_categories → PostCategory
 */
export function classify(tableName: string): string {
	return tableName
		.split(/[_\s]+/)
		.map((part) => {
			const singular = singularize(part);
			return singular.charAt(0).toUpperCase() + singular.slice(1);
		})
		.join("");
}

/**
 * 모델명 → 테이블명 변환
 * User → users, PostCategory → post_categories
 *
 * 마지막 단어만 복수형으로 변환 (Laravel/CI3 규칙)
 */
export function tableize(className: string): string {
	// PascalCase → snake_case
	const parts = className
		.replace(/([A-Z])/g, "_$1")
		.replace(/^_/, "")
		.toLowerCase()
		.split("_");

	// 마지막 단어만 복수형
	const last = parts.pop()!;
	return [...parts, pluralize(last)].join("_");
}

/**
 * 사람이 읽기 쉬운 형태로 변환
 * user_name → User name, post_id → Post id
 * CI3: humanize()
 */
export function humanize(str: string): string {
	return str
		.replace(/[_-]+/g, " ")
		.replace(/([A-Z])/g, " $1")
		.replace(/^\s/, "")
		.toLowerCase()
		.replace(/^[a-z]/, (c) => c.toUpperCase());
}

/**
 * 대소문자 보존
 * User → People (X), User → Users (O)
 */
function preserveCase(original: string, transformed: string): string {
	if (original === original.toUpperCase()) return transformed.toUpperCase();
	if (original[0] === original[0].toUpperCase()) {
		return transformed.charAt(0).toUpperCase() + transformed.slice(1);
	}
	return transformed.toLowerCase();
}
