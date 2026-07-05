export interface DatabaseConfig {
	defaultGroup: string;
	groups: Record<
		string,
		{
			adapter: "sqlite" | "postgres" | "mysql";
			filename?: string;
			create?: boolean;
		}
	>;
}

const config: DatabaseConfig = {
	defaultGroup: "default",
	groups: {
		default: {
			adapter: "sqlite",
			filename: "./database/blog.db",
			create: true,
		},
	},
};

export default config;
