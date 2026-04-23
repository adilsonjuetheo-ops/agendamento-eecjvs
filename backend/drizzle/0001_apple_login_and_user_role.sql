ALTER TABLE "teachers"
ADD COLUMN IF NOT EXISTS "apple_sub" text;
--> statement-breakpoint
ALTER TABLE "teachers"
ADD COLUMN IF NOT EXISTS "user_role" text DEFAULT 'visitante' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "teachers"
  ADD CONSTRAINT "teachers_apple_sub_unique" UNIQUE("apple_sub");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "teachers"
SET "user_role" = CASE
  WHEN lower("email") LIKE '%@educacao.mg.gov.br' THEN 'autorizado'
  WHEN lower("email") LIKE '%@escola.com' THEN 'autorizado'
  ELSE 'visitante'
END
WHERE "user_role" IS DISTINCT FROM CASE
  WHEN lower("email") LIKE '%@educacao.mg.gov.br' THEN 'autorizado'
  WHEN lower("email") LIKE '%@escola.com' THEN 'autorizado'
  ELSE 'visitante'
END;
