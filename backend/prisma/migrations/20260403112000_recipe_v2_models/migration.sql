DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecipeDifficulty') THEN
    CREATE TYPE "RecipeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecipeGoalMode') THEN
    CREATE TYPE "RecipeGoalMode" AS ENUM ('WEIGHT_LOSS', 'LEAN', 'BULK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "meal_type" "MealType" NOT NULL,
  "difficulty" "RecipeDifficulty" NOT NULL DEFAULT 'MEDIUM',
  "cook_time_mins" INTEGER NOT NULL DEFAULT 25,
  "is_veg" BOOLEAN NOT NULL DEFAULT true,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "popularity_score" INTEGER NOT NULL DEFAULT 0,
  "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
  "id" TEXT NOT NULL,
  "recipe_id" TEXT NOT NULL,
  "food_id" TEXT,
  "ingredient_name" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_instructions" (
  "id" TEXT NOT NULL,
  "recipe_id" TEXT NOT NULL,
  "step_number" INTEGER NOT NULL,
  "instruction" TEXT NOT NULL,
  CONSTRAINT "recipe_instructions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_nutrition" (
  "id" TEXT NOT NULL,
  "recipe_id" TEXT NOT NULL,
  "servings" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "recipe_nutrition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_modifications" (
  "id" TEXT NOT NULL,
  "recipe_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "goal_mode" "RecipeGoalMode" NOT NULL,
  "portion_multiplier" DOUBLE PRECISION NOT NULL,
  "original_nutrition" JSONB NOT NULL,
  "modified_nutrition" JSONB NOT NULL,
  "change_summary" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipe_modifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_saved_recipes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "recipe_id" TEXT NOT NULL,
  "is_favorite" BOOLEAN NOT NULL DEFAULT true,
  "times_logged" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_saved_recipes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_custom_recipes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "base_recipe_id" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "meal_type" "MealType" NOT NULL,
  "difficulty" "RecipeDifficulty" NOT NULL DEFAULT 'MEDIUM',
  "cook_time_mins" INTEGER NOT NULL DEFAULT 20,
  "ingredients_json" JSONB NOT NULL,
  "instructions_json" JSONB NOT NULL,
  "nutrition_json" JSONB NOT NULL,
  "goal_mode" "RecipeGoalMode" NOT NULL,
  "portion_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_custom_recipes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fridge_ingredients" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "food_id" TEXT,
  "ingredient_name" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fridge_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "recipes_meal_type_idx" ON "recipes"("meal_type");
CREATE INDEX IF NOT EXISTS "recipes_is_veg_idx" ON "recipes"("is_veg");
CREATE INDEX IF NOT EXISTS "recipes_popularity_score_idx" ON "recipes"("popularity_score");
CREATE INDEX IF NOT EXISTS "recipes_user_id_idx" ON "recipes"("user_id");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_food_id_idx" ON "recipe_ingredients"("food_id");
CREATE INDEX IF NOT EXISTS "recipe_instructions_recipe_id_idx" ON "recipe_instructions"("recipe_id");
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_nutrition_recipe_id_key" ON "recipe_nutrition"("recipe_id");
CREATE INDEX IF NOT EXISTS "recipe_modifications_recipe_id_user_id_idx" ON "recipe_modifications"("recipe_id", "user_id");
CREATE INDEX IF NOT EXISTS "recipe_modifications_created_at_idx" ON "recipe_modifications"("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "user_saved_recipes_user_id_recipe_id_key" ON "user_saved_recipes"("user_id", "recipe_id");
CREATE INDEX IF NOT EXISTS "user_saved_recipes_user_id_idx" ON "user_saved_recipes"("user_id");
CREATE INDEX IF NOT EXISTS "user_custom_recipes_user_id_created_at_idx" ON "user_custom_recipes"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "user_custom_recipes_base_recipe_id_idx" ON "user_custom_recipes"("base_recipe_id");
CREATE INDEX IF NOT EXISTS "fridge_ingredients_user_id_updated_at_idx" ON "fridge_ingredients"("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "fridge_ingredients_food_id_idx" ON "fridge_ingredients"("food_id");

DO $$ BEGIN
  ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "food_database"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_instructions" ADD CONSTRAINT "recipe_instructions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_nutrition" ADD CONSTRAINT "recipe_nutrition_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_modifications" ADD CONSTRAINT "recipe_modifications_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_modifications" ADD CONSTRAINT "recipe_modifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "user_saved_recipes" ADD CONSTRAINT "user_saved_recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "user_saved_recipes" ADD CONSTRAINT "user_saved_recipes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "user_custom_recipes" ADD CONSTRAINT "user_custom_recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "user_custom_recipes" ADD CONSTRAINT "user_custom_recipes_base_recipe_id_fkey" FOREIGN KEY ("base_recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "fridge_ingredients" ADD CONSTRAINT "fridge_ingredients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "fridge_ingredients" ADD CONSTRAINT "fridge_ingredients_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "food_database"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
