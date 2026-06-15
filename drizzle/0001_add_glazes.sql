CREATE TABLE "glazes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"recipe_id" integer,
	"volume_ml" double precision DEFAULT 0 NOT NULL,
	"display_volume_unit" text DEFAULT 'quart' NOT NULL,
	"status" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "glaze_id" integer;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "produced_ml" double precision;--> statement-breakpoint
ALTER TABLE "glazes" ADD CONSTRAINT "glazes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_glaze_id_glazes_id_fk" FOREIGN KEY ("glaze_id") REFERENCES "public"."glazes"("id") ON DELETE set null ON UPDATE no action;