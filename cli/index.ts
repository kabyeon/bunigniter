// ============================================================
// BunIgniter CLI - AdonisJS Ace 스타일 스캐폴딩 CLI
// 사용법: bun run igniter <command> <name> [options]
// ============================================================

import { CommandRegistry } from "./registry.ts";
import { makeController } from "./commands/makecontroller.ts";
import { makeModel } from "./commands/makemodel.ts";
import { makeView } from "./commands/makeview.ts";
import { makeMigration } from "./commands/makemigration.ts";
import { makeMiddleware } from "./commands/makemiddleware.ts";
import { makeScaffold } from "./commands/makescaffold.ts";
import { makeHelper } from "./commands/makehelper.ts";
import { makeLibrary } from "./commands/makelibrary.ts";
import { listRoutes } from "./commands/listroutes.ts";
import { serve } from "./commands/serve.ts";
import { migrate } from "./commands/migrate.ts";
import { migrateRollback } from "./commands/migraterollback.ts";
import { makeSeed, dbSeed } from "./commands/dbseed.ts";
import { replCommand } from "./commands/repl.ts";

const registry = new CommandRegistry();

// 명령어 등록
registry.register("make:controller", makeController);
registry.register("make:model", makeModel);
registry.register("make:view", makeView);
registry.register("make:migration", makeMigration);
registry.register("make:middleware", makeMiddleware);
registry.register("make:scaffold", makeScaffold);
registry.register("make:helper", makeHelper);
registry.register("make:library", makeLibrary);
registry.register("make:seed", makeSeed);
registry.register("list:routes", listRoutes);
registry.register("serve", serve);
registry.register("migrate", migrate);
registry.register("migrate:rollback", migrateRollback);
registry.register("db:seed", dbSeed);
registry.register("repl", replCommand);

// CLI 실행
const args = process.argv.slice(2);

if (
	args.length === 0 ||
	args[0] === "help" ||
	args[0] === "--help" ||
	args[0] === "-h"
) {
	registry.showHelp();
	process.exit(0);
}

const commandName = args[0];
const commandArgs = args.slice(1);

const command = registry.get(commandName);
if (!command) {
	console.log(`\n❌ 알 수 없는 명령어: ${commandName}\n`);
	registry.showHelp();
	process.exit(1);
}

command.run(commandArgs).catch((err: Error) => {
	console.error(`\n❌ 오류: ${err.message}\n`);
	process.exit(1);
});
