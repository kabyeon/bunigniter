# 🛠 CLI Commands

BunIgniter provides an AdonisJS Ace-style CLI.

## Usage

```bash
bun run bi <command> [args] [options]
```

In npm package mode:

```bash
bun run node_modules/bunigniter/cli/index.ts <command> [args]
```

## Command List

### Project Initialization

| Command | Description |
|---------|-------------|
| `init <name>` | Create a new BunIgniter project |

### Server

| Command | Description |
|---------|-------------|
| `serve` | Run development server (hot reload, `--port`, `--host` options) |
| `repl` | Interactive REPL shell |

### Scaffolding

| Command | Description |
|---------|-------------|
| `make:controller <name>` | Create a controller (`--resource` CRUD methods) |
| `make:model <name>` | Create a model (`--fields=name:type,...`) |
| `make:view <dir/action>` | Create a view template (`--resource` CRUD views) |
| `make:migration <name>` | Create a migration (`--fields=name:type,...`) |
| `make:middleware <name>` | Create middleware |
| `make:helper <name>` | Create a helper file |
| `make:library <name>` | Create a library class |
| `make:seed <name>` | Create a seeder file |
| `make:scaffold <name>` | Create full MVC (`--api` JSON mode, `--fields=name:type,...`) |

### Database

| Command | Description |
|---------|-------------|
| `migrate` | Run pending migrations |
| `migrate:rollback` | Rollback migrations (`--steps=N`, `--all`) |
| `migrate:status` | Check migration status (applied/pending list) |
| `db:seed` | Run seeders (`--files=name1,name2`) |

### Information

| Command | Description |
|---------|-------------|
| `list:routes` | Display registered routes |

## serve Details

```bash
bun run bi serve                # Default 0.0.0.0:3000
bun run bi serve --port=8080    # Change port
bun run bi serve --host=127.0.0.1  # Change host
```

Runs `bun run --hot` via `Bun.spawn`. Supports hot reload.

## migrate Details

```bash
bun run bi migrate
```

- Checks the `migrations` tracking table for already executed migrations
- Runs `up()` only for pending migrations
- Records completion in the tracking table

## migrate:rollback Details

```bash
bun run bi migrate:rollback           # Rollback most recent 1
bun run bi migrate:rollback --steps=3  # Rollback 3
bun run bi migrate:rollback --all      # Rollback all
```

## init Details

```bash
bun run bi init my-app      # Create new project directory
bun run bi init .            # Initialize in current directory
bun run bi init my-app --force  # Overwrite existing files
```

Generated files:

- `package.json` — includes bunigniter dependency
- `tsconfig.json` — system/* path mapping
- `.env` — environment variables
- `.gitignore`
- `app/config/` — app, database, routes, autoload config
- `app/controllers/welcome_controller.ts` — default controller
- `app/views/` — layout, partials, welcome, errors views
- `database/migrate.ts` — migration runner
- `public/css/style.css` — default styles

## list:routes Details

```bash
bun run bi list:routes
```

Parses `app/config/routes.ts` and outputs color-coded routes by HTTP method.
Resource routes are expanded to 7 RESTful routes.

## make:scaffold Details

```bash
bun run bi make:scaffold post
bun run bi make:scaffold post --fields=title:string,content:text
bun run bi make:scaffold post --api --fields=title:string
```

- Generates Model + Controller + Views + Migration all at once
- `--api`: JSON API controller (no views)
- Auto-registers routes (`app/config/routes.ts`)

## migrate:status Details

```bash
bun run bi migrate:status
```

Displays migration file list and their application status:

- ✅ Applied — shows batch number and execution time
- ⏳ Pending — waiting to run

Managed by batch units; rollbacks are processed per batch.
