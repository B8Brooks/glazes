import {
  pgTable,
  serial,
  text,
  doublePrecision,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Raw glaze materials in the studio. quantity_grams is the canonical on-hand
// amount; display_unit only controls how it is shown/entered (usually pounds).
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayUnit: text("display_unit").notNull().default("lb"),
  quantityGrams: doublePrecision("quantity_grams").notNull().default(0),
  reorderThresholdGrams: doublePrecision("reorder_threshold_grams"),
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// A glaze recipe: a name plus a set of ingredient percentages.
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One line of a recipe: this ingredient at this percentage of the base batch.
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  percentage: doublePrecision("percentage").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// A mixed batch: the history log that powers auto-deduct and undo.
export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  batchGrams: doublePrecision("batch_grams").notNull(),
  notes: text("notes"),
  mixedAt: timestamp("mixed_at").notNull().defaultNow(),
});

// Snapshot of grams deducted per ingredient at mix time (so undo is exact even
// if the recipe later changes).
export const batchLines = pgTable("batch_lines", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  gramsDeducted: doublePrecision("grams_deducted").notNull(),
});

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(
  recipeIngredients,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeIngredients.recipeId],
      references: [recipes.id],
    }),
    ingredient: one(ingredients, {
      fields: [recipeIngredients.ingredientId],
      references: [ingredients.id],
    }),
  })
);

export const batchesRelations = relations(batches, ({ one, many }) => ({
  recipe: one(recipes, {
    fields: [batches.recipeId],
    references: [recipes.id],
  }),
  lines: many(batchLines),
}));

export const batchLinesRelations = relations(batchLines, ({ one }) => ({
  batch: one(batches, {
    fields: [batchLines.batchId],
    references: [batches.id],
  }),
  ingredient: one(ingredients, {
    fields: [batchLines.ingredientId],
    references: [ingredients.id],
  }),
}));

export type Ingredient = typeof ingredients.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type BatchLine = typeof batchLines.$inferSelect;
