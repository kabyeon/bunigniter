// ============================================================
// CLI Command Registry
// ============================================================

export interface Command {
	name: string;
	description: string;
	usage: string;
	options?: { flag: string; description: string }[];
	run(args: string[]): Promise<void>;
}

export class CommandRegistry {
	private commands = new Map<string, Command>();

	register(name: string, command: Command): void {
		this.commands.set(name, command);
	}

	get(name: string): Command | undefined {
		return this.commands.get(name);
	}

	showHelp(): void {
		console.log(`
╔══════════════════════════════════════════════════════════╗
║                    🔥 BunIgniter CLI                     ║
║          CodeIgniter 3-Style MVC Framework               ║
╚══════════════════════════════════════════════════════════╝

사용법:
  bun run igniter <command> <name> [options]

명령어:
${[...this.commands.values()]
	.map((c) => `  ${c.name.padEnd(22)}${c.description}`)
	.join("\n")}

스캐폴딩 (한 번에 MVC 전체 생성):
  bun run igniter make:scaffold <name>   Controller + Model + View + Migration

예시:
  bun run igniter make:controller users
  bun run igniter make:controller users --resource
  bun run igniter make:model user
  bun run igniter make:view posts/create
  bun run igniter make:migration create_users_table
  bun run igniter make:middleware auth
  bun run igniter make:scaffold post
  bun run igniter list:routes
  bun run igniter serve
  bun run igniter migrate
`);
	}
}
