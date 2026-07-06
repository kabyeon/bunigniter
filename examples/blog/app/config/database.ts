import type { DatabaseConfig } from "system/core/config_types.ts";

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
