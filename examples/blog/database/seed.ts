import { SQL } from "bun";

async function seed() {
	const sql = new SQL({
		adapter: "sqlite",
		filename: "./database/blog.db",
	});

	const adminPassword = await Bun.password.hash("admin123", {
		algorithm: "bcrypt",
		cost: 10,
	});

	await sql`
    INSERT OR IGNORE INTO users (email, password, name, role)
    VALUES ('admin@blog.dev', ${adminPassword}, '관리자', 'admin')
  `;

	const authorPassword = await Bun.password.hash("author123", {
		algorithm: "bcrypt",
		cost: 10,
	});

	await sql`
    INSERT OR IGNORE INTO users (email, password, name, role)
    VALUES ('author@blog.dev', ${authorPassword}, '김작가', 'author')
  `;

	const posts = [
		{
			title: "BunIgniter로 블로그 만들기",
			slug: "bunigniter-blog-tutorial",
			content:
				"BunIgniter는 CodeIgniter 3 스타일의 Bun 프레임워크입니다.\n\n## 설치\n\nbun install 명령으로 쉽게 시작할 수 있습니다.\n\n## 라우팅\n\nRouter를 사용해 URL을 컨트롤러에 매핑합니다.",
			excerpt: "BunIgniter를 사용해 블로그를 만드는 방법을 알아봅니다.",
			author_id: 1,
			published: 1,
		},
		{
			title: "Bun.serve 네이티브 라우팅",
			slug: "bun-serve-native-routing",
			content:
				"Bun 1.3.14부터 SIMD 가속 라우팅이 내장되었습니다.\n\n## 라우트 정의\n\nBun.serve의 routes 옵션으로 라우트를 정의합니다.",
			excerpt: "Bun.serve 네이티브 라우팅의 작동 원리를 알아봅니다.",
			author_id: 1,
			published: 1,
		},
		{
			title: "BunIgniter 템플릿 엔진 가이드",
			slug: "bunigniter-template-guide",
			content:
				"BunIgniter 자체 템플릿 엔진은 PHP/CI3 친화적 문법을 제공합니다.\n\n## 변수 출력\n\n중괄호 두 개로 변수를 출력합니다.\n\n## 반복문\n\nPHP 스타일의 for 문을 사용할 수 있습니다.",
			excerpt: "BunIgniter 템플릿 엔진의 기본 문법을 알아봅니다.",
			author_id: 2,
			published: 1,
		},
		{
			title: "작성 중인 초안",
			slug: "draft-post",
			content: "이 포스트는 아직 작성 중입니다.",
			excerpt: "작성 중인 초안 포스트입니다.",
			author_id: 2,
			published: 0,
		},
	];

	for (const post of posts) {
		await sql`INSERT OR IGNORE INTO posts (title, slug, content, excerpt, author_id, published) VALUES (${post.title}, ${post.slug}, ${post.content}, ${post.excerpt}, ${post.author_id}, ${post.published})`;
	}

	const comments = [
		{
			post_id: 1,
			author_name: "홍길동",
			content: "좋은 튜토리얼 감사합니다!",
		},
		{
			post_id: 1,
			author_name: "이몽룡",
			content: "BunIgniter 정말 편하네요.",
		},
		{
			post_id: 2,
			author_name: "성춘향",
			content: "네이티브 라우팅 성능이 놀랍습니다.",
		},
	];

	for (const comment of comments) {
		await sql`INSERT INTO comments (post_id, author_name, content) VALUES (${comment.post_id}, ${comment.author_name}, ${comment.content})`;
	}

	console.log("✅ 시드 데이터 삽입 완료");
	await sql.close();
}

seed().catch(console.error);
