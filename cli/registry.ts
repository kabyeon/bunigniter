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
  bun run bi <command> <name> [options]

명령어:
${[...this.commands.values()].map((c) => `  ${c.name.padEnd(22)}${c.description}`).join("\n")}

스캐폴딩 (한 번에 MVC 전체 생성):
  bun run bi make:scaffold <name>   Controller + Model + View + Migration

예시:
  bun run bi make:controller users
  bun run bi make:controller users --resource
  bun run bi make:model user
  bun run bi make:view posts/create
  bun run bi make:migration create_users_table
  bun run bi make:middleware auth
  bun run bi make:scaffold post
  bun run bi list:routes
  bun run bi serve
  bun run bi migrate
`);
	}
}
