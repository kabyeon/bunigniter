# 🖥 REPL

AdonisJS Ace REPL-style interactive shell. A conversational environment with framework context injected.

## Starting

```bash
bun run bi repl
```

## Basic Commands

| Command | Description |
|---------|-------------|
| `.ls` | List context properties/methods |
| `.models` | List available models |
| `.routes` | List registered routes |
| `.config` | Display application configuration |
| `.load <path>` | Load a module |
| `.help` | Show help |
| `.exit` | Exit REPL |

## Framework Context

The following modules are auto-injected when REPL starts:

- `Controller`, `Model`, `Router`
- `Validator`, `validate`
- `Auth`, `Cache`, `Queue`, `Scheduler`
- `Email`, `Logger`, `Upload`
- `AuditLog`, `DistributedLock`
- `Archive`, `Shell`
- `getCookie`, `setCookie`, `paginationHtml`
- `config` — application configuration
- `env` — environment variables
- `app` — runtime info (name, version, pid)
- `db` — database connection function

## Usage Examples

```bash
bun run bi repl

> Validator.validate({ email: "bad" }, { email: "required|email" })
{ success: false, errors: [...] }

> Crypto.hash("hello world")
"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"

> .models
  post_model

> .load ./app/models/post_model
Loaded: post_model

> .config
{ name: "BunIgniter", ... }
```

## Custom Methods

Global methods available within the REPL:

- `clear <name>` — remove a context property
- `p <function>` — convert a callback function to a Promise
