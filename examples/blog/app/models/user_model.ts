import { Model } from "system/core/model.ts";

export interface UserInterface {
	id?: number;
	email?: string;
	password?: string;
	name?: string;
	role?: string;
	created_at?: string;
	updated_at?: string;
}

export class UserModel extends Model<UserInterface> {
	override tableName = "users";
}

export default new UserModel();
