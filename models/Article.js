console.log('🧭 Cargando routes/articles.js desde:',
    import.meta.url);


import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },

    // NUEVO: ids de archivos en GridFS
    imageIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },

    // NUEVO: URLs públicas /api/images/:id (útil para render directo)
    imageUrls: { type: [String], default: [] },

    // LEGADO: una sola imagen como antes (no se rompe el front actual)
    imageUrl: { type: String, default: "" },
}, {
    timestamps: true,
});

console.log('🧭 Cargando routes/articles.js desde:',
    import.meta.url);


const Article = mongoose.model("Article", articleSchema);
export default Article;