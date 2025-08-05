import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import articleRoutes from "./routes/articles.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware CORS para permitir solicitudes desde el frontend
app.use(cors());

// Middleware para parsear JSON y aumentar el límite a 10mb (para manejar imágenes base64 en artículos)
app.use(express.json({ limit: "10mb" }));

// Middleware para parsear datos urlencoded (formularios)
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rutas
app.use("/api", authRoutes);
app.use("/api/articles", articleRoutes);

// Conexión a MongoDB y arranque del servidor
mongoose.connect(process.env.MONGODB_URI, {})
    .then(() => {
        console.log("✅ Conectado a MongoDB");
        app.listen(PORT, () => {
            console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error("❌ Error conectando MongoDB:", err);
    });