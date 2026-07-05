import { Model } from "system/core/model.ts";

export interface PostInterface {
  id?: number;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export class PostModel extends Model<PostInterface> {
  override tableName = "posts";
}

export default new PostModel();
