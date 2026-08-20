CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Seed the five categories that were the enum's values. The slug carries the
-- old value verbatim: categorizeExpense matches on it during CSV import, and
-- the message catalog keys off it so these five still translate.
INSERT INTO "expense_categories" ("slug", "name") VALUES
  ('zarade_bonusi', 'Zarade i bonusi'),
  ('rezije', 'Režije'),
  ('zalihe', 'Zalihe'),
  ('odrzavanje', 'Održavanje'),
  ('ostalo', 'Ostalo')
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
-- Carry every existing expense over to its new category by matching the old
-- enum value to the slug. Done before category_id is made NOT NULL, so a row
-- that failed to match would surface as a constraint error rather than being
-- silently relabelled.
UPDATE "expenses" e
SET "category_id" = c."id"
FROM "expense_categories" c
WHERE c."slug" = e."category"::text;
