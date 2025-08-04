import express from "express";
import Article from "../models/Article.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Crear artículo (solo admin)
router.post("/", verifyToken, async(req, res) => {
    try {
        const { title, content, category } = req.body;
        const newArticle = new Article({
            title,
            content,
            category
        });
        await newArticle.save();
        res.status(201).json({ ok: true, article: newArticle });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: "Error creando artículo" });
    }
});

// Listar todos
router.get("/", async(req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        res.status(500).json({ ok: false, message: "Error obteniendo artículos" });
    }
});

// DELETE => Eliminar un artículo por ID
router.delete('/:id', verifyToken, async(req, res) => {
    try {
        const { id } = req.params;
        await Article.findByIdAndDelete(id);
        res.status(200).json({ message: 'Artículo eliminado correctamente' });
    } catch (error) {
        console.error('❌ Error al eliminar artículo:', error);
        res.status(500).json({ message: 'Error eliminando artículo' });
    }
});

// PUT => Editar un artículo por ID
router.put('/:id', verifyToken, async(req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category } = req.body;

        const updatedArticle = await Article.findByIdAndUpdate(
            id, { title, content, category }, { new: true } // devuelve el documento actualizado
        );

        res.status(200).json({
            message: '✅ Artículo actualizado correctamente',
            article: updatedArticle,
        });
    } catch (error) {
        console.error('❌ Error al actualizar artículo:', error);
        res.status(500).json({ message: 'Error actualizando artículo' });
    }
});

// GET artículos por categoría y ordenados por fecha
router.get('/category/:category', async(req, res) => {
    try {
        const category = req.params.category;
        const articles = await Article.find({ category }).sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET artículos por categoría y ordenados por fecha
router.get('/category/:category', async(req, res) => {
    try {
        const category = req.params.category;
        const articles = await Article.find({ category }).sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/articles
router.get("/", async(req, res) => {
    try {
        const { category } = req.query;

        const filter = category ? { category } : {};

        const articles = await Article.find(filter).sort({ createdAt: -1 });

        res.status(200).json(articles);
    } catch (error) {
        console.error("❌ Error al obtener artículos:", error);
        res.status(500).json({ message: "Error al obtener artículos" });
    }
});


export default router;