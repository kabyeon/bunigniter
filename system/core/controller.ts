// ============================================================
// BunIgniter - Base Controller
// CodeIgniter3 의 CI_Controller 와 동일
// ============================================================

import { renderView } from "./view.ts";

/** response.status() 체이닝 빌더 */
export interface ResponseStatusBuilder {
	/** 본문과 함께 응답 */
	send: (body: string) => Response;
	/** JSON 본문과 함께 응답 */
	json: (data: any) => Response;
}

/** 컨트롤러 컨텍스트 타입 */
export interface Context {
	request: Request & {
		/** 파싱된 요청 본문 반환 (JSON/Form/URL-encoded 자동 파싱) */
		body: () => any;
	};
	response: {
		/** 상태 코드 설정 (체이닝 지원: response.status(404).send("Not Found")) */
		status: (code: number) => ResponseStatusBuilder;
		redirect: (url: string) => Response;
		json: (data: any) => Response;
		send: (body: string | Response) => Response;
		headers: (headers: Record<string, string>) => any;
		cookie: (name: string, value: string, options?: any) => void;
	};
	params: Record<string, string>;
	query: Record<string, string>;
	body: () => any;
}

/**
 * 기본 컨트롤러 클래스
 * 모든 앱 컨트롤러는 이 클래스를 상속받습니다.
 *
 * CodeIgniter3:
 *   class Welcome extends CI_Controller {
 *     public function index() { ... }
 *   }
 *
 * BunIgniter:
 *   class WelcomeController extends Controller {
 *     async index(ctx: Context) { ... }
 *   }
 */
export class Controller {
	/**
	 * 뷰 렌더링
	 * CodeIgniter3: $this->load->view('welcome_message', $data)
	 * BunIgniter: this.view('welcome/index', { title: 'Hello' })
	 */
	async view(
		viewPath: string,
		data: Record<string, any> = {},
	): Promise<Response> {
		return renderView(viewPath, data);
	}

	/**
	 * JSON 응답
	 * CodeIgniter3: $this->output->set_content_type('application/json')->set_output(json_encode($data))
	 */
	json(data: any, status: number = 200): Response {
		return new Response(JSON.stringify(data), {
			status,
			headers: { "Content-Type": "application/json" },
		});
	}

	/**
	 * 리다이렉트
	 * CodeIgniter3: redirect($url)
	 */
	redirect(url: string): Response {
		return new Response(null, {
			status: 302,
			headers: { Location: url },
		});
	}
}
