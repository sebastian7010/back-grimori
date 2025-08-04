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
}, {
    timestamps: true, // 👈 ESTO ES LO IMPORTANTE
});

const Article = mongoose.model("Article", articleSchema);

export default Article;