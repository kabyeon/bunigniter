// ============================================================
// CLI 유틸리티 - 파일 생성, 이름 변환 등
// ============================================================

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** 프로젝트 루트 경로 */
export const PROJECT_ROOT = join(import.meta.dir, "..");

/**
 * PascalCase 변환
 * user_profile -> UserProfile
 */
export function toPascalCase(str: string): string {
	return str
		.split(/[-_]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join("");
}

/**
 * camelCase 변환
 * user_profile -> userProfile
 */
export function toCamelCase(str: string): string {
	const pascal = toPascalCase(str);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * snake_case 변환
 * UserProfile -> user_profile
 */
export function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, "_$1")
		.replace(/^_/, "")
		.toLowerCase();
}

/**
 * 복수형 변환 (간단한 규칙)
 */
export function toPlural(str: string): string {
	if (
		str.endsWith("s") ||
		str.endsWith("sh") ||
		str.endsWith("ch") ||
		str.endsWith("x") ||
		str.endsWith("z")
	) {
		return `${str}es`;
	}
	if (str.endsWith("y") && !["a", "e", "i", "o", "u"].includes(str.charAt(str.length - 2))) {
		return `${str.slice(0, -1)}ies`;
	}
	return `${str}s`;
}

/**
 * 단수형 변환 (간단한 규칙)
 */
export function toSingular(str: string): string {
	if (str.endsWith("ies")) return `${str.slice(0, -3)}y`;
	if (str.endsWith("ses") || str.endsWith("shes") || str.endsWith("ches") || str.endsWith("xes")) {
		return str.slice(0, -2);
	}
	if (str.endsWith("s") && !str.endsWith("ss")) return str.slice(0, -1);
	return str;
}

/**
 * 파일 생성 (디렉토리 자동 생성)
 */
export function createFile(filePath: string, content: string): void {
	const fullPath = join(PROJECT_ROOT, filePath);
	if (existsSync(fullPath)) {
		console.log(`  ⚠️  이미 존재: ${filePath}`);
		return;
	}
	mkdirSync(dirname(fullPath), { recursive: true });
	writeFileSync(fullPath, content, "utf-8");
	console.log(`  ✅ 생성됨: ${filePath}`);
}

/**
 * CLI 인자 파싱
 */
export function parseArgs(args: string[]): {
	positional: string[];
	flags: Record<string, string | boolean>;
} {
	const positional: string[] = [];
	const flags: Record<string, string | boolean> = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const key = arg.slice(2);
			const next = args[i + 1];
			if (next && !next.startsWith("--")) {
				flags[key] = next;
				i++;
			} else {
				flags[key] = true;
			}
		} else {
			positional.push(arg);
		}
	}

	return { positional, flags };
}
