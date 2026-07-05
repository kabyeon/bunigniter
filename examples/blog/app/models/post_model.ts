import { Model } from "system/core/model.ts";

export interface PostInterface {
	id?: number;
	title?: string;
	slug?: string;
	content?: string;
	excerpt?: string;
	author_id?: number;
	published?: number;
	created_at?: string;
	updated_at?: string;
}

export class PostModel extends Model<PostInterface> {
	override tableName = "posts";
}

export default new PostModel();
