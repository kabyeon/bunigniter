// ============================================================
// BunIgniter - 배열 헬퍼
// CodeIgniter3 의 Array Helper 와 동일
// ============================================================

/**
 * 배열에서 안전하게 요소 가져오기
 * CI3: element('key', $array, 'default')
 */
export function element<T>(
	item: string | number,
	array: Record<string, T> | T[],
	defaultValue?: T,
): T | undefined {
	if (Array.isArray(array)) {
		const val = array[item as number];
		return val !== undefined ? val : defaultValue;
	}
	const val = array[item as string];
	return val !== undefined ? val : defaultValue;
}

/**
 * 배열에서 여러 요소 가져오기
 * CI3: elements(['key1', 'key2'], $array, 'default')
 */
export function elements<T>(
	items: (string | number)[],
	array: Record<string, T> | T[],
	defaultValue?: T,
): T[] {
	return items.map((item) => element(item, array, defaultValue)) as T[];
}

/**
 * 랜덤 요소 선택
 * CI3: random_element($array)
 */
export function randomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

/**
 * 키로 그룹핑
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
	return array.reduce(
		(result, item) => {
			const groupKey = String(item[key]);
			if (!result[groupKey]) result[groupKey] = [];
			result[groupKey].push(item);
			return result;
		},
		{} as Record<string, T[]>,
	);
}

/**
 * 키로 중복 제거
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
	const seen = new Set();
	return array.filter((item) => {
		const k = item[key];
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

/**
 * 청크 분할
 */
export function chunk<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

/**
 * 플래튼 (1단계)
 */
export function flatten<T>(array: (T | T[])[]): T[] {
	return array.flat() as T[];
}

/**
 * 객체를 키-값 쌍 배열로
 */
export function toEntries<K extends string, V>(obj: Record<K, V>): [K, V][] {
	return Object.entries(obj) as [K, V][];
}

/**
 * 키-값 쌍 배열을 객체로
 */
export function fromEntries<K extends string, V>(entries: [K, V][]): Record<K, V> {
	return Object.fromEntries(entries) as Record<K, V>;
}

/**
 * 깊은 병합
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
	const result = { ...target };
	for (const source of sources) {
		for (const key of Object.keys(source)) {
			const targetVal = (result as any)[key];
			const sourceVal = (source as any)[key];
			if (
				targetVal &&
				sourceVal &&
				typeof targetVal === "object" &&
				typeof sourceVal === "object" &&
				!Array.isArray(targetVal) &&
				!Array.isArray(sourceVal)
			) {
				(result as any)[key] = deepMerge(targetVal, sourceVal);
			} else {
				(result as any)[key] = sourceVal;
			}
		}
	}
	return result;
}
