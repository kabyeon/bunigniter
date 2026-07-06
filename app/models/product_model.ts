import { Model } from "system/core/model.ts";

export interface ProductInterface {
	id?: number;
	name?: string;
	created_at?: string;
	updated_at?: string;
}

export class ProductModel extends Model<ProductInterface> {
	override tableName = "products";
}

export default new ProductModel();
