-- CreateEnum
CREATE TYPE "CoachMode" AS ENUM ('FAT_LOSS', 'MUSCLE_GAIN', 'MAINTAIN', 'INDIAN_HOME_STYLE');

-- CreateTable
CREATE TABLE "coach_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "actions_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_checkins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checkin_date" TIMESTAMP(3) NOT NULL,
    "hunger_level" INTEGER NOT NULL,
    "energy_level" INTEGER NOT NULL,
    "cravings_note" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mode" "CoachMode" NOT NULL DEFAULT 'MAINTAIN',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_messages_user_id_created_at_idx" ON "coach_messages"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "coach_checkins_user_id_checkin_date_key" ON "coach_checkins"("user_id", "checkin_date");

-- CreateIndex
CREATE INDEX "coach_checkins_user_id_checkin_date_idx" ON "coach_checkins"("user_id", "checkin_date");

-- CreateIndex
CREATE UNIQUE INDEX "coach_preferences_user_id_key" ON "coach_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_checkins" ADD CONSTRAINT "coach_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_preferences" ADD CONSTRAINT "coach_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
