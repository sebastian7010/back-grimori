// Diagnóstico de arranque
console.log('🟢 index.js desde:',
    import.meta.url);
console.log('📂 process.cwd():', process.cwd());

// @ts-nocheck
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

// Rutas
import authRoutes from "./routes/auth.js";
import articleRoutes from "./routes/articles.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // usa 3000 como en tu front/proxy

/* ───────────────── middlewares básicos ───────────────── */
app.use(cors()); // ajusta "origin" en prod si hace falta
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ─────────────── GridFS: inicialización y helper ─────────────── */
export let gfsBucket = null;

mongoose.connection.once("open", () => {
    gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "images", // crea images.files / images.chunks
    });
    console.log("✅ GridFS bucket listo (images)");
});

// Inyecta el bucket en cada request (puede ser null hasta que abra la conexión)
app.use((req, _res, next) => {
    req.gfsBucket = gfsBucket;
    // Descomenta si quieres ver el estado en cada request:
    // console.log('req.gfsBucket listo?', !!req.gfsBucket);
    next();
});

/* ─────────── servir una imagen por id (GridFS) ─────────── */
app.get("/api/images/:id", async(req, res) => {
    try {
        if (!gfsBucket) {
            return res.status(503).json({ message: "Storage no disponible aún" });
        }

        const id = new mongoose.Types.ObjectId(req.params.id);

        res.set("Cache-Control", "public, max-age=31536000, immutable");

        gfsBucket
            .openDownloadStream(id)
            .on("file", (f) => {
                if (f && f.contentType) res.type(f.contentType);
            })
            .on("error", (err) => {
                console.error("❌ Error leyendo GridFS:", (err && err.message) ? err.message : err);
                res.status(404).json({ message: "Imagen no encontrada" });
            })
            .pipe(res);
    } catch {
        return res.status(400).json({ message: "ID inválido" });
    }
});

/* ─────────────────────── rutas API ─────────────────────── */
app.use("/api", authRoutes);
app.use("/api/articles", articleRoutes);

/* ─────────────── conexión Mongo y arranque ─────────────── */
mongoose
    .connect(process.env.MONGODB_URI, {})
    .then(() => {
        console.log("✅ Conectado a MongoDB");
        app.listen(PORT, () => {
            console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Error conectando MongoDB:", err);
        process.exit(1);
    });

// Opcional: captura errores no manejados para no tumbar el proceso
process.on("unhandledRejection", (err) => {
    console.error("🧯 UnhandledRejection:", err);
});
process.on("uncaughtException", (err) => {
    console.error("🧯 UncaughtException:", err);
});