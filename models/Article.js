import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: String,
        default: "", // Opcional, puede quedar vacío
    },
}, {
    timestamps: true, // para crear campos createdAt y updatedAt automáticamente
});

const Article = mongoose.model("Article", articleSchema);

export default Article;