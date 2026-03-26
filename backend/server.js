import 'dotenv/config';

import express from 'express';
const app = express();

import cookieParser from 'cookie-parser';
import cors from 'cors';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoute.js';
import fileRoutes from './routes/fileRoutes.js';

app.use(cors({
   origin: [process.env.CLIENT_URL1, process.env.CLIENT_URL2],
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE'],
   allowedHeaders: ['Content-Type', 'x-access-token', 'x-refresh-token']
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
   console.log(`Server is running on PORT ${PORT}`);
});
