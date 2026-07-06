// ============================================================
// create-bunigniter - bunx create-bunigniter@latest [이름]
// BunIgniter 프로젝트 생성 스크립트
// 내부적으로 bunigniter CLI의 init 명령어를 호출
// ============================================================

const projectName = process.argv[2];

if (!projectName) {
	console.log("");
	console.log("\x1b[33m\x1b[3m🔥 create-bunigniter\x1b[0m");
	console.log("");
	console.log("  사용법: bunx create-bunigniter@latest <프로젝트명>");
	console.log("");
	console.log("  예시:");
	console.log("    bunx create-bunigniter@latest my-app");
	console.log("    bunx create-bunigniter@latest blog");
	console.log("");
	process.exit(1);
}

console.log("");
console.log("\x1b[33m\x1b[3m🔥 BunIgniter 프로젝트 생성\x1b[0m");
console.log(`  📁 ${projectName}`);
console.log("");

// 프로젝트 디렉토리 생성
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const targetDir = join(process.cwd(), projectName);

try {
	mkdirSync(targetDir, { recursive: true });
} catch (_e) {
	// 이미 존재
}

// 프로젝트 디렉토리에 bunigniter 설치
console.log("\x1b[2m📦 bunigniter 패키지 설치 중...\x1b[0m");
const installProc = Bun.spawn(["bun", "add", "bunigniter"], {
	cwd: targetDir,
	stdout: "inherit",
	stderr: "inherit",
});
const installExit = await installProc.exited;

if (installExit !== 0) {
	console.error("\x1b[31m❌ 패키지 설치 실패. 네트워크 연결을 확인하세요.\x1b[0m");
	process.exit(1);
}

console.log("");

// bunigniter CLI init 명령어 실행
const initProc = Bun.spawn(["bun", "run", "node_modules/bunigniter/cli/index.ts", "init", "."], {
	cwd: targetDir,
	stdout: "inherit",
	stderr: "inherit",
	env: { ...process.env },
});

const initExit = await initProc.exited;

if (initExit !== 0) {
	console.error("\x1b[31m❌ 프로젝트 생성 실패\x1b[0m");
	process.exit(1);
}

console.log("\x1b[36m다음 단계:\x1b[0m");
console.log(`  cd ${projectName}`);
console.log("  bun run dev");
console.log("");
