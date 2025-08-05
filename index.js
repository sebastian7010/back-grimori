import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from './routes/auth.js';
import articleRoutes from "./routes/articles.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes); // <- Solo esto para login/register
app.use("/api/articles", articleRoutes);

mongoose.connect(process.env.MONGODB_URI, {})
    .then(() => console.log("✅ Conectado a MongoDB"))
    .catch((err) => console.error("❌ Error conectando MongoDB:", err));

app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});