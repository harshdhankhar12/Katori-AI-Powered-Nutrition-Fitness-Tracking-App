import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import userRoutes from './routes/user';
import foodRoutes from './routes/food';
import recipeRoutes from './routes/recipe';
import coachRoutes from './routes/coach';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const app = express();

export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const API_PREFIX = '/api';
const HOST = '0.0.0.0';

app.get('/', (req: Request, res: Response) => {
  res.send('Katori Backend is running!');
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/user`, userRoutes);
app.use(`${API_PREFIX}/food`, foodRoutes);
app.use(`${API_PREFIX}/recipes`, recipeRoutes);
app.use(`${API_PREFIX}/coach`, coachRoutes);

app.listen(Number(PORT), HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});