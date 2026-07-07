# 🔄 Autoload

Equivalent to CodeIgniter 3's `application/config/autoload.php`. Allows global access to helpers, libraries, and models without importing them every time.

## Configuration File

`app/config/autoload.ts`:

```typescript
import type { AutoloadConfig } from "../../system/core/autoload.ts";

const autoload: AutoloadConfig = {
  /** Libraries to auto-load */
  libraries: [],

  /** Helpers to auto-load */
  helpers: ["url", "string", "date"],

  /** Models to auto-load */
  models: [],

  /** Middleware applied to all routes */
  middleware: [],
};

export default autoload;
```

## Automatic Execution in Bootstrap

In `system/core/bootstrap.ts`, the `autoload()` function reads the config file and loads everything automatically. Helpers, libraries, and models are registered in the `autoloadRegistry`.

## Using the Registry

### Accessing Helpers

```typescript
import { autoloadRegistry } from "system/core/autoload.ts";

// Get an auto-loaded helper function
const { siteUrl, baseUrl } = autoloadRegistry.getHelper("url")!;
console.log(siteUrl("posts/1")); // "http://localhost:3000/posts/1"
```

### Accessing Libraries

```typescript
// CI3: $this->load->library('email') → $this->email
const email = autoloadRegistry.getLibrary<Email>("email");
await email.send({ to: "user@example.com", subject: "Hello" });
```

### Accessing Models

```typescript
// CI3: $this->load->model('user_model') → $this->user_model
const userModel = autoloadRegistry.getModel<UserModel>("user_model");
const users = await userModel.findAll();
```

### Using Helpers Directly in Templates

```typescript
// Merge all helper functions via getAllHelperFunctions()
const helperFunctions = autoloadRegistry.getAllHelperFunctions();

// Pass to View.render() → helpers callable directly in templates
return this.view("posts/index", {
  ...data,
  ...helperFunctions,  // slug(), truncate() etc. available directly
});
```

In templates:

```html
<h1>{{ slug(title) }}</h1>
<p>{{ truncate(content, 100) }}</p>
```

## Checking Loaded Items

```typescript
const info = autoloadRegistry.getLoadedInfo();
console.log(info.helpers);    // ["url", "string", "date"]
console.log(info.libraries);  // ["session"]
console.log(info.models);     // ["user_model"]
```

## CI3 ↔ BunIgniter Comparison

| CodeIgniter 3 | BunIgniter |
|---------------|------------|
| `$autoload['helper'] = ['url', 'form']` | `autoload.helpers = ["url", "form"]` |
| `$autoload['libraries'] = ['session']` | `autoload.libraries = ["session"]` |
| `$autoload['model'] = ['user_model']` | `autoload.models = ["user_model"]` |
| `$this->load->helper('url')` | `autoloadRegistry.getHelper("url")` |
| `$this->load->library('email')` | `autoloadRegistry.getLibrary("email")` |
| `$this->load->model('user_model')` | `autoloadRegistry.getModel("user_model")` |
| `$this->email->send()` | `autoloadRegistry.getLibrary("email").send()` |
