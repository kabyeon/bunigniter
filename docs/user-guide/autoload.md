# 🔄 Autoload (자동 로드)

CodeIgniter 3의 `application/config/autoload.php` 와 동일합니다. 매번 import하지 않아도 헬퍼, 라이브러리, 모델을 전역에서 접근할 수 있습니다.

## 설정 파일

`app/config/autoload.ts`:

```typescript
import type { AutoloadConfig } from "../../system/core/autoload.ts";

const autoload: AutoloadConfig = {
  /** 자동 로드할 라이브러리 */
  libraries: [],

  /** 자동 로드할 헬퍼 */
  helpers: ["url", "string", "date"],

  /** 자동 로드할 모델 */
  models: [],

  /** 모든 라우트에 적용할 미들웨어 */
  middleware: [],
};

export default autoload;
```

## 부트스트랩에서 자동 실행

`system/core/bootstrap.ts` 에서 `autoload()` 함수가 설정 파일을 읽어 자동으로 로드합니다. 헬퍼, 라이브러리, 모델이 `autoloadRegistry` 에 등록됩니다.

## 레지스트리 사용

### 헬퍼 접근

```typescript
import { autoloadRegistry } from "system/core/autoload.ts";

// 자동 로드된 헬퍼 함수 가져오기
const { siteUrl, baseUrl } = autoloadRegistry.getHelper("url")!;
console.log(siteUrl("posts/1")); // "http://localhost:3000/posts/1"
```

### 라이브러리 접근

```typescript
// CI3: $this->load->library('email') → $this->email
const email = autoloadRegistry.getLibrary<Email>("email");
await email.send({ to: "user@example.com", subject: "안녕" });
```

### 모델 접근

```typescript
// CI3: $this->load->model('user_model') → $this->user_model
const userModel = autoloadRegistry.getModel<UserModel>("user_model");
const users = await userModel.findAll();
```

### 템플릿에서 헬퍼 직접 사용

```typescript
// getAllHelperFunctions()로 모든 헬퍼 함수 병합
const helperFunctions = autoloadRegistry.getAllHelperFunctions();

// View.render()에 전달 → 템플릿에서 헬퍼 직접 호출
return this.view("posts/index", {
  ...data,
  ...helperFunctions,  // slug(), truncate() 등 직접 사용 가능
});
```

템플릿에서:

```html
<h1>{{ slug(title) }}</h1>
<p>{{ truncate(content, 100) }}</p>
```

## 로드된 항목 확인

```typescript
const info = autoloadRegistry.getLoadedInfo();
console.log(info.helpers);    // ["url", "string", "date"]
console.log(info.libraries);  // ["session"]
console.log(info.models);     // ["user_model"]
```

## CI3 ↔ BunIgniter 대조표

| CodeIgniter 3 | BunIgniter |
|---------------|-----------|
| `$autoload['helper'] = ['url', 'form']` | `autoload.helpers = ["url", "form"]` |
| `$autoload['libraries'] = ['session']` | `autoload.libraries = ["session"]` |
| `$autoload['model'] = ['user_model']` | `autoload.models = ["user_model"]` |
| `$this->load->helper('url')` | `autoloadRegistry.getHelper("url")` |
| `$this->load->library('email')` | `autoloadRegistry.getLibrary("email")` |
| `$this->load->model('user_model')` | `autoloadRegistry.getModel("user_model")` |
| `$this->email->send()` | `autoloadRegistry.getLibrary("email").send()` |
