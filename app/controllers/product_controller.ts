import { Controller } from "system/core/controller.ts";
import type { Context } from "system/core/controller.ts";
import productModel from "app/models/product_model.ts";

export class ProductController extends Controller {
	// GET /products
	async index({}: Context) {
		const products = await productModel.findAll();
		return this.json(products);
	}

	// GET /products/:id
	async show({ params }: Context) {
		const product = await productModel.findById(Number(params.id));
		if (!product) return this.json({ error: "Not Found" }, 404);
		return this.json(product);
	}

	// POST /products
	async store({ body }: Context) {
		const data = body();
		const product = await productModel.create(data);
		return this.json(product, 201);
	}

	// PUT /products/:id
	async update({ body, params }: Context) {
		const data = body();
		const product = await productModel.update(Number(params.id), data);
		if (!product) return this.json({ error: "Not Found" }, 404);
		return this.json(product);
	}

	// DELETE /products/:id
	async delete({ params }: Context) {
		const ok = await productModel.delete(Number(params.id));
		if (!ok) return this.json({ error: "Not Found" }, 404);
		return this.json({ success: true });
	}
}

export default new ProductController();
