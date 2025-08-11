import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Article from '../models/Article.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

/* ────────────────────────── Multer (memoria) ────────────────────────── */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB c/u, máx 10 imágenes
    fileFilter: (_req, file, cb) => {
        if (file && file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Solo se permiten archivos de imagen'));
    }
});

/* ─────────── Helper: guardar un buffer en GridFS y devolver ObjectId ─────────── */
async function saveToGridFS(req, file) {
    if (!req.gfsBucket) throw new Error('Storage no disponible (gfsBucket no inicializado)');
    return await new Promise((resolve, reject) => {
        const ws = req.gfsBucket.openUploadStream(file.originalname, {
            contentType: file.mimetype || 'application/octet-stream'
        });
        ws.on('finish', () => resolve(ws.id));
        ws.on('error', reject);
        ws.end(file.buffer);
    });
}

/* ─────────── Helper: logs de diagnóstico bien detallados ─────────── */
function logCreateDiagnostics(req) {
    const ct = req.headers['content-type'] || '';
    const cl = req.headers['content-length'] || '';
    const isMultipart = ct.indexOf('multipart/form-data') !== -1;
    const boundaryIdx = ct.indexOf('boundary=');
    const boundary = boundaryIdx !== -1 ? ct.slice(boundaryIdx + 9) : '';

    console.log('────────────────────────────────────────────────────────');
    console.log('🔎 POST /api/articles (diagnóstico)');
    console.log('   > userId:', req.userId || '(no definido por middleware)');
    console.log('   > Content-Type:', ct);
    console.log('   > Content-Length:', cl);
    console.log('   > isMultipart:', isMultipart, '| boundary presente:', boundary ? 'sí' : 'no');

    const body = req.body || {};
    const bodyKeys = Object.keys(body);
    console.log('   > body keys:', bodyKeys);

    const watch = ['title', 'content', 'category', 'imageUrl'];
    for (let i = 0; i < watch.length; i++) {
        const k = watch[i];
        const v = body[k];
        if (typeof v === 'string') {
            const len = v.length;
            const preview = v.slice(0, 80).replace(/\n/g, '\\n');
            console.log(`   - ${k}: (${len} chars) "${preview}${len > 80 ? '…' : ''}"`);
        }
    }

    const files = Array.isArray(req.files) ? req.files : [];
    console.log(
        `   > files[${files.length}]:`,
        files.map((f) => ({
            field: f.fieldname,
            name: f.originalname,
            type: f.mimetype,
            size: f.size
        }))
    );
    console.log('────────────────────────────────────────────────────────');
}

/* ─────────────────────────────── Crear artículo ───────────────────────────────
 * Acepta:
 * - multipart/form-data → fields: title, content, category + images[] (files)
 * - JSON (legacy)       → title, content, category, imageUrl
 */
router.post('/', verifyToken, upload.array('images', 10), async(req, res) => {
    try {
        logCreateDiagnostics(req);

        const body = req.body || {};
        const title = body.title;
        const content = body.content;
        const category = body.category;

        if (!title || !content || !category) {
            return res.status(400).json({
                ok: false,
                message: 'title, content y category son requeridos',
                hint: "Si estás enviando imágenes desde el navegador, usa FormData (multipart/form-data) y NO 'application/json'. El campo de archivos debe llamarse 'images'."
            });
        }

        // Subir imágenes si vinieron archivos
        const files = Array.isArray(req.files) ? req.files : [];
        let imageIds = [];
        if (files.length) {
            console.log('→ Guardando en GridFS', files.length, 'archivo(s)…');
            imageIds = await Promise.all(
                files.map(async(f, i) => {
                    try {
                        const id = await saveToGridFS(req, f);
                        console.log(`✓ [${i}] guardado:`, id.toString());
                        return id;
                    } catch (e) {
                        console.error(
                            `✗ [${i}] fallo al guardar ${f.originalname}`,
                            '-',
                            (e && e.message) ? e.message : e
                        );
                        throw e;
                    }
                })
            );
        }

        // URLs públicas /api/images/:id
        const base = req.protocol + '://' + req.get('host');
        const imageUrls = imageIds.map((id) => base + '/api/images/' + id);

        // Compatibilidad con campo legacy (si viene en el body)
        const legacyImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';

        const article = await Article.create({
            title,
            content,
            category,
            imageIds, // ids de GridFS
            imageUrls, // urls públicas
            imageUrl: legacyImageUrl // legacy opcional
        });

        return res.status(201).json({ ok: true, article });
    } catch (err) {
        console.error('❌ Error creando artículo:', (err && err.stack) ? err.stack : err);
        return res.status(500).json({ ok: false, message: 'Error creando artículo' });
    }
});

/* ─────────────────────────────── Listar artículos ─────────────────────────────── */
router.get('/', async(req, res) => {
    try {
        const category = req.query ? req.query.category : undefined;
        const filter = category ? { category } : {};
        const articles = await Article.find(filter).sort({ createdAt: -1 });
        return res.status(200).json(articles);
    } catch (err) {
        console.error('❌ Error obteniendo artículos:', (err && err.message) ? err.message : err);
        return res.status(500).json({ ok: false, message: 'Error obteniendo artículos' });
    }
});

/* ─────────────────────── Obtener por categoría (ruta alternativa) ─────────────────────── */
router.get('/category/:category', async(req, res) => {
    try {
        const category = req.params ? req.params.category : undefined;
        const articles = await Article.find({ category }).sort({ createdAt: -1 });
        return res.status(200).json(articles);
    } catch (err) {
        console.error('❌ Error filtrando por categoría:', (err && err.message) ? err.message : err);
        return res.status(500).json({ ok: false, message: 'Error filtrando por categoría' });
    }
});

/* ─────────────────────────────── Actualizar artículo ───────────────────────────────
 * Acepta multipart para añadir imágenes (se agregan a las existentes)
 * o JSON para actualizar solo campos de texto / imageUrl legacy
 */
router.put('/:id', verifyToken, upload.array('images', 10), async(req, res) => {
    try {
        console.log('🔎 PUT /api/articles/:id', req.params ? req.params.id : '(sin id)');
        console.log('   > body keys:', Object.keys(req.body || {}));
        const files = Array.isArray(req.files) ? req.files : [];
        console.log(
            `   > files[${files.length}]`,
            files.map((f) => ({
                field: f.fieldname,
                name: f.originalname,
                type: f.mimetype,
                size: f.size
            }))
        );

        const id = req.params ? req.params.id : undefined;
        const body = req.body || {};
        const title = body.title;
        const content = body.content;
        const category = body.category;
        const imageUrl = body.imageUrl;

        const article = await Article.findById(id);
        if (!article) return res.status(404).json({ ok: false, message: 'Artículo no encontrado' });

        // Nuevas imágenes → se agregan
        if (files.length) {
            const newIds = await Promise.all(files.map((f) => saveToGridFS(req, f)));
            const base = req.protocol + '://' + req.get('host');
            const newUrls = newIds.map((gid) => base + '/api/images/' + gid);

            article.imageIds = Array.isArray(article.imageIds) ? article.imageIds.concat(newIds) : newIds;
            article.imageUrls = Array.isArray(article.imageUrls) ? article.imageUrls.concat(newUrls) : newUrls;
        }

        // Campos de texto
        if (typeof title === 'string') article.title = title;
        if (typeof content === 'string') article.content = content;
        if (typeof category === 'string') article.category = category;
        if (typeof imageUrl === 'string') article.imageUrl = imageUrl; // legacy

        await article.save();
        return res.status(200).json({ ok: true, article });
    } catch (err) {
        console.error('❌ Error actualizando artículo:', (err && err.message) ? err.message : err);
        return res.status(500).json({ ok: false, message: 'Error actualizando artículo' });
    }
});

/* ─────────────────────────────── Eliminar artículo ─────────────────────────────── */
router.delete('/:id', verifyToken, async(req, res) => {
    try {
        const id = req.params ? req.params.id : undefined;
        const article = await Article.findById(id);
        if (!article) return res.status(404).json({ ok: false, message: 'Artículo no encontrado' });

        // Borrar imágenes en GridFS (si hay)
        if (req.gfsBucket && Array.isArray(article.imageIds) && article.imageIds.length) {
            for (let i = 0; i < article.imageIds.length; i++) {
                const gid = article.imageIds[i];
                try {
                    await req.gfsBucket.delete(new mongoose.Types.ObjectId(gid));
                } catch (e) {
                    console.warn('⚠️ No se pudo borrar imagen GridFS:', gid, (e && e.message) ? e.message : e);
                }
            }
        }

        await Article.findByIdAndDelete(id);
        return res.status(200).json({ ok: true, message: 'Artículo eliminado' });
    } catch (err) {
        console.error('❌ Error eliminando artículo:', (err && err.message) ? err.message : err);
        return res.status(500).json({ ok: false, message: 'Error eliminando artículo' });
    }
});

export default router;