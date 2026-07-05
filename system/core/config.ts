// ============================================================
// BunIgniter - CodeIgniter 3 Style MVC Framework
// 설정 로더
// ============================================================

import { join } from "node:path";

const APP_ROOT = join(import.meta.dir, "..", "..", "app");

/** 설정 파일 캐시 */
const configCache: Record<string, any> = {};

/**
 * app/config/ 폴더에서 설정 파일을 로드합니다.
 * CodeIgniter3 의 $this->config->load() 와 동일
 */
export async function loadConfig<T = any>(name: string): Promise<T> {
	if (configCache[name]) return configCache[name] as T;

	const filePath = join(APP_ROOT, "config", `${name}.ts`);
	try {
		const mod = await import(filePath);
		const config = mod.default ?? mod;
		configCache[name] = config;
		return config as T;
	} catch (e) {
		throw new Error(`Config file not found: ${filePath}`);
	}
}

/** 캐시 초기화 (핫리로드용) */
export function clearConfigCache(): void {
	for (const key of Object.keys(configCache)) {
		delete configCache[key];
	}
}

export { APP_ROOT };
