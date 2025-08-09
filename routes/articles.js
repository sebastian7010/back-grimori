import express from "express";
import Article from "../models/Article.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

/**
 * Crear artículo (incluye imageUrl)
 * Si aún no quieres auth mientras pruebas, puedes quitar verifyToken temporalmente.
 */
router.post("/", verifyToken, async(req, res) => {
    try {
        const { title, content, category, imageUrl } = req.body;

        const newArticle = new Article({
            title,
            content,
            category,
            imageUrl: imageUrl || "" // si no envían, queda vacío
        });

        await newArticle.save();
        return res.status(201).json({ ok: true, article: newArticle });
    } catch (err) {
        console.error("❌ Error creando artículo:", err);
        return res.status(500).json({ ok: false, message: "Error creando artículo" });
    }
});

/**
 * Listar artículos (opcionalmente por categoría ?category=...)
 * Ordenados del más reciente al más antiguo.
 */
router.get("/", async(req, res) => {
    try {
        const { category } = req.query;
        const filter = category ? { category } : {};
        const articles = await Article.find(filter).sort({ createdAt: -1 });
        return res.status(200).json(articles);
    } catch (err) {
        console.error("❌ Error obteniendo artículos:", err);
        return res.status(500).json({ ok: false, message: "Error obteniendo artículos" });
    }
});

/**
 * Obtener por categoría (ruta alternativa /api/articles/category/:category)
 */
router.get("/category/:category", async(req, res) => {
    try {
        const { category } = req.params;
        const articles = await Article.find({ category }).sort({ createdAt: -1 });
        return res.status(200).json(articles);
    } catch (err) {
        console.error("❌ Error filtrando por categoría:", err);
        return res.status(500).json({ ok: false, message: "Error filtrando por categoría" });
    }
});

/**
 * Actualizar artículo (incluye imageUrl)
 */
router.put("/:id", verifyToken, async(req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category, imageUrl } = req.body;

        const updatedArticle = await Article.findByIdAndUpdate(
            id, { title, content, category, imageUrl }, { new: true }
        );

        return res.status(200).json({ ok: true, article: updatedArticle });
    } catch (err) {
        console.error("❌ Error actualizando artículo:", err);
        return res.status(500).json({ ok: false, message: "Error actualizando artículo" });
    }
});

/**
 * Eliminar artículo
 */
router.delete("/:id", verifyToken, async(req, res) => {
    try {
        const { id } = req.params;
        await Article.findByIdAndDelete(id);
        return res.status(200).json({ ok: true, message: "Artículo eliminado" });
    } catch (err) {
        console.error("❌ Error eliminando artículo:", err);
        return res.status(500).json({ ok: false, message: "Error eliminando artículo" });
    }
});

export default router;