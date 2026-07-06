// ============================================================
// BunIgniter - Auto-loading 시스템
// CodeIgniter3 의 $autoload 와 동일
// 컨트롤러에서 매번 import 하지 않아도 전역 접근 가능
// ============================================================

/**
 * 자동 로드 설정
 * CI3: application/config/autoload.php
 *
 * $autoload['libraries'] = ['session', 'email'];
 * $autoload['helper'] = ['url', 'form'];
 * $autoload['model'] = ['user_model'];
 */
export interface AutoloadConfig {
	/** 자동 로드할 라이브러리 */
	libraries: string[];
	/** 자동 로드할 헬퍼 */
	helpers: string[];
	/** 자동 로드할 모델 */
	models: string[];
	/** 자동 로드할 미들웨어 (모든 라우트에 적용) */
	middleware: string[];
}

/**
 * 자동 로드 레지스트리
 * 부트스트랩 시 설정에 따라 전역 등록
 */
class AutoloadRegistry {
	/** 로드된 헬퍼 함수들 */
	private loadedHelpers: Map<string, Record<string, any>> = new Map();

	/** 로드된 라이브러리 인스턴스들 */
	private loadedLibraries: Map<string, any> = new Map();

	/** 로드된 모델 인스턴스들 */
	private loadedModels: Map<string, any> = new Map();

	/**
	 * 헬퍼 등록
	 * autoload.helpers에 등록된 헬퍼는 컨트롤러에서 전역 접근 가능
	 *
	 * 사용법:
	 *   // bootstrap 시
	 *   registry.registerHelper('url', { siteUrl, baseUrl, redirect });
	 *
	 *   // 컨트롤러에서
	 *   const { siteUrl } = registry.getHelper('url');
	 */
	registerHelper(name: string, functions: Record<string, any>): void {
		this.loadedHelpers.set(name, functions);
	}

	/**
	 * 라이브러리 등록
	 *
	 * 사용법:
	 *   registry.registerLibrary('session', sessionDriver);
	 *   registry.registerLibrary('email', emailInstance);
	 */
	registerLibrary(name: string, instance: any): void {
		this.loadedLibraries.set(name, instance);
	}

	/**
	 * 모델 등록
	 *
	 * 사용법:
	 *   registry.registerModel('user', userModel);
	 */
	registerModel(name: string, instance: any): void {
		this.loadedModels.set(name, instance);
	}

	/**
	 * 헬퍼 가져오기
	 */
	getHelper(name: string): Record<string, any> | undefined {
		return this.loadedHelpers.get(name);
	}

	/**
	 * 라이브러리 가져오기
	 * CI3: $this->load->library('email') → $this->email
	 */
	getLibrary<T = any>(name: string): T | undefined {
		return this.loadedLibraries.get(name) as T | undefined;
	}

	/**
	 * 모델 가져오기
	 * CI3: $this->load->model('user_model') → $this->user_model
	 */
	getModel<T = any>(name: string): T | undefined {
		return this.loadedModels.get(name) as T | undefined;
	}

	/**
	 * 로드된 모든 헬퍼 함수를 글로벌로 병합
	 * 템플릿 엔진에서 헬퍼 함수 직접 사용 가능
	 */
	getAllHelperFunctions(): Record<string, any> {
		const merged: Record<string, any> = {};
		for (const functions of this.loadedHelpers.values()) {
			Object.assign(merged, functions);
		}
		return merged;
	}

	/**
	 * 로드된 항목 목록 반환
	 */
	getLoadedInfo(): { helpers: string[]; libraries: string[]; models: string[] } {
		return {
			helpers: [...this.loadedHelpers.keys()],
			libraries: [...this.loadedLibraries.keys()],
			models: [...this.loadedModels.keys()],
		};
	}

	/**
	 * 전체 초기화 (테스트용)
	 */
	reset(): void {
		this.loadedHelpers.clear();
		this.loadedLibraries.clear();
		this.loadedModels.clear();
	}
}

/**
 * 싱글톤 레지스트리 인스턴스
 */
export const autoloadRegistry = new AutoloadRegistry();

/**
 * 자동 로드 설정에 따라 헬퍼/라이브러리/모델 로드
 *
 * 사용법 (bootstrap.ts):
 *   import { autoload } from "system/core/autoload.ts";
 *   const config = { helpers: ["url", "form", "html"], libraries: [], models: [] };
 *   await autoload(config);
 *
 * 이후 컨트롤러에서:
 *   import { autoloadRegistry } from "system/core/autoload.ts";
 *   const { siteUrl } = autoloadRegistry.getHelper("url")!;
 *   const session = autoloadRegistry.getLibrary<SessionDriver>("session")!;
 */
export async function autoload(config: AutoloadConfig): Promise<void> {
	// ── 헬퍼 자동 로드 ──────────────────────────────
	for (const helperName of config.helpers) {
		try {
			const mod = await import(`../helpers/${helperName}_helper.ts`);
			// 모듈의 모든 export를 등록
			autoloadRegistry.registerHelper(helperName, mod);
		} catch {
			console.warn(`⚠️  Autoload: 헬퍼 '${helperName}' 로드 실패`);
		}
	}

	// ── 라이브러리 자동 로드 ────────────────────────
	for (const libName of config.libraries) {
		try {
			const mod = await import(`../core/${libName}.ts`);
			// 기본 export 또는 이름있는 export 인스턴스 사용
			const instance = mod.default ?? mod[camelize(libName)] ?? mod;
			autoloadRegistry.registerLibrary(libName, instance);
		} catch {
			console.warn(`⚠️  Autoload: 라이브러리 '${libName}' 로드 실패`);
		}
	}

	// ── 모델 자동 로드 ──────────────────────────────
	for (const modelName of config.models) {
		try {
			const mod = await import(`../../app/models/${modelName}.ts`);
			const instance = mod.default ?? mod[camelize(modelName)] ?? mod;
			autoloadRegistry.registerModel(modelName, instance);
		} catch {
			console.warn(`⚠️  Autoload: 모델 '${modelName}' 로드 실패`);
		}
	}

	const loaded = autoloadRegistry.getLoadedInfo();
	if (loaded.helpers.length + loaded.libraries.length + loaded.models.length > 0) {
		console.log(
			`  📦 Autoload: ${[
				loaded.helpers.length > 0 ? `helpers [${loaded.helpers.join(", ")}]` : "",
				loaded.libraries.length > 0 ? `libraries [${loaded.libraries.join(", ")}]` : "",
				loaded.models.length > 0 ? `models [${loaded.models.join(", ")}]` : "",
			]
				.filter(Boolean)
				.join(", ")}`,
		);
	}
}

/**
 * autoload 설정 파일 로드
 * app/config/autoload.ts에서 설정 읽기
 */
export async function loadAutoloadConfig(): Promise<AutoloadConfig> {
	try {
		const mod = await import("../../app/config/autoload.ts");
		return (
			mod.default ?? {
				libraries: [],
				helpers: [],
				models: [],
				middleware: [],
			}
		);
	} catch {
		return { libraries: [], helpers: [], models: [], middleware: [] };
	}
}

function camelize(str: string): string {
	return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
