# 🚀 Quick Start

## Installation

### 1. bunx create (recommended)

```bash
bunx create-bunigniter@latest my-app
cd my-app
bun run dev
```

### 2. bun init + bunigniter install

```bash
mkdir my-app && cd my-app
bun init -y
bun add bunigniter
bun run bi init .
bun run dev
```

### 3. GitHub clone

```bash
git clone https://github.com/kabyeon/bunigniter.git my-app
cd my-app
bun install
bun run dev
```

## Running the Server

```bash
# Development server (hot reload)
bun run dev

# Production
bun run start
```

Visit `http://localhost:3000` in your browser → 🔥 Welcome page

## Environment Variables

Configured in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | BunIgniter | Application name |
| `BASE_URL` | http://localhost:3000 | Base URL |
| `NODE_ENV` | development | Environment (development/production/testing) |
| `APP_DEBUG` | true | Debug mode |
| `PORT` | 3000 | Server port |

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | [Bun](https://bun.sh) | Latest |
| HTTP Server | [Bun.serve](https://bun.sh/docs/runtime/http) | Built-in (SIMD accelerated routing) |
| Database | [Bun SQL](https://bun.sh/docs/runtime/sql) | Built-in (SQLite/PostgreSQL/MySQL) |
| Template Engine | Custom built-in | No external dependencies |
| Lint/Format | [Biome](https://biomejs.dev/) | ^2.5.2 |
| Testing | [bun:test](https://bun.sh/docs/cli/test) | Built-in |

## Project Structure

### npm Package Mode (bunx create / bun add bunigniter)

```
my-app/
├── app/
│   ├── config/           # Configuration files
│   ├── controllers/      # Controllers
│   ├── models/           # Models
│   ├── views/            # View templates
│   ├── middleware/        # Middleware
│   ├── helpers/          # Custom helpers
│   └── libraries/        # Custom libraries
├── database/
│   ├── migrations/       # Migrations
│   └── seeds/            # Seeders
├── public/               # Static files
├── storage/              # Runtime storage
├── node_modules/
│   └── bunigniter/       # Framework core
│       ├── system/core/  # System core
│       ├── system/helpers/ # System helpers
│       └── cli/          # CLI tools
├── package.json
└── tsconfig.json
```

### Clone Mode (git clone)

```
bunigniter/
├── system/core/          # Framework core (do not modify)
│   ├── bootstrap.ts      # Server entry point
│   ├── router.ts         # Router
│   ├── controller.ts     # Base controller
│   ├── model.ts          # Base model
│   ├── view.ts           # View rendering
│   └── ...
├── system/helpers/       # System helpers
├── app/                  # User application
│   ├── config/           # Configuration
│   ├── controllers/      # Controllers
│   ├── models/           # Models
│   ├── views/            # Views
│   ├── middleware/       # Middleware
│   ├── helpers/          # Helpers
│   └── libraries/        # Libraries
├── cli/                  # CLI scaffolding
├── database/             # Migrations & Seeds
├── public/               # Static files
├── storage/              # Runtime storage
└── tests/                # Tests
```

## CLI Commands

```bash
# Project creation
bun run bi init my-app

# Scaffolding
bun run bi make:controller posts
bun run bi make:controller posts --resource
bun run bi make:model user
bun run bi make:view posts/index
bun run bi make:migration create_posts_table
bun run bi make:middleware auth
bun run bi make:scaffold post       # Controller + Model + View + Migration

# Database
bun run bi migrate
bun run bi migrate:rollback
bun run bi migrate:status
bun run bi db:seed

# Development tools
bun run bi serve                    # Development server
bun run bi list:routes              # List routes
bun run bi repl                     # Interactive REPL
```

## Your First Controller

```bash
bun run bi make:controller hello
```

Generated file: `app/controllers/hello_controller.ts`

```typescript
import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";

export class HelloController extends Controller {
  async index(_ctx: Context) {
    return this.view("hello/index", { title: "Hello!" });
  }
}

export default new HelloController();
```

Add route: `app/config/routes.ts`

```typescript
import helloController from "app/controllers/hello_controller.ts";

router.get("/hello", helloController, "index");
```

Create view: `app/views/hello/index.html`

```html
<!-- layout:default -->

<!-- slot:title -->Hello<!-- endslot -->

<h1>{{ title }}</h1>
<p>Welcome to BunIgniter!</p>
```
