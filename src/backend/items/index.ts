import { Elysia, t } from "elysia"
import {
	createItem,
	deleteItem,
	getAllItems,
	getItemById,
	updateItem,
} from "./service"

const itemType = t.Union([
	t.Literal("Clothes"),
	t.Literal("Wig"),
	t.Literal("Shoes"),
	t.Literal("Accessories"),
	t.Literal("Prop"),
	t.Literal("Materials"),
])

export const itemsController = new Elysia({ prefix: "/items" })
	.get("/", () => getAllItems())
	.get(
		"/:id",
		async ({ params, set }) => {
			const item = await getItemById(params.id)
			if (!item) {
				set.status = 404
				return { error: "Not found" }
			}
			return item
		},
		{ params: t.Object({ id: t.Numeric() }) },
	)
	.post(
		"/",
		async ({ body, set }) => {
			set.status = 201
			return createItem(
				body.name,
				body.type,
				body.series_id ?? null,
				body.character_id ?? null,
				body.location ?? null,
				body.notes ?? null,
			)
		},
		{
			body: t.Object({
				name: t.String(),
				type: itemType,
				series_id: t.Optional(t.Nullable(t.Number())),
				character_id: t.Optional(t.Nullable(t.Number())),
				location: t.Optional(t.Nullable(t.String())),
				notes: t.Optional(t.Nullable(t.String())),
			}),
		},
	)
	.put(
		"/:id",
		async ({ params, body, set }) => {
			const item = await updateItem(
				params.id,
				body.name,
				body.type,
				body.series_id,
				body.character_id,
				body.location,
				body.notes,
			)
			if (!item) {
				set.status = 404
				return { error: "Not found" }
			}
			return item
		},
		{
			params: t.Object({ id: t.Numeric() }),
			body: t.Object({
				name: t.String(),
				type: itemType,
				series_id: t.Nullable(t.Number()),
				character_id: t.Nullable(t.Number()),
				location: t.Nullable(t.String()),
				notes: t.Nullable(t.String()),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, set }) => {
			const deleted = await deleteItem(params.id)
			if (!deleted) {
				set.status = 404
				return { error: "Not found" }
			}
			return { success: true }
		},
		{ params: t.Object({ id: t.Numeric() }) },
	)
