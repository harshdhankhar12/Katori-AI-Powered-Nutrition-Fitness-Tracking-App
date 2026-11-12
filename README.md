# Katori — AI-Powered Nutrition & Fitness Tracking App

Katori is a full-stack mobile application for tracking daily calories, macronutrients, fitness activity, and personalized nutrition coaching.

## Project Structure

- `application/` — Cross-platform mobile app built with React Native and TypeScript
- `backend/` — REST API built with Node.js, Express, Prisma ORM (PostgreSQL), Redis, and the Google Gemini API

## Core Features

- **Voice & Manual Meal Logging:** Speech-to-text meal entry parsed by Google Gemini AI into structured food items and macro breakdowns, alongside food search and quick presets.
- **AI Nutrition Coach:** Multi-mode coaching (`FAT_LOSS`, `MUSCLE_GAIN`, `MAINTAIN`, `INDIAN_HOME_STYLE`) with contextual action suggestions and daily check-ins.
- **Smart Recipe Engine:** Fridge-based recipe generation, macro-gap recommendations, and goal-based recipe adaptation.
- **Activity & Personalization:** BMR/macro target personalization, streak tracking, Google Fit activity sync, and JWT + Redis OTP authentication.
