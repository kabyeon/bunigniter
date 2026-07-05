import { Model } from "system/core/model.ts";

export interface CommentInterface {
	id?: number;
	post_id?: number;
	author_name?: string;
	content?: string;
	created_at?: string;
}

export class CommentModel extends Model<CommentInterface> {
	override tableName = "comments";
}

export default new CommentModel();
