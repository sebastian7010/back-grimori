import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import articleRoutes from "./routes/articles.js";
import User from "./models/User.js";
import authRoutes from './routes/auth.js'; // 👈 Asegúrate de tener esto


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api/articles", articleRoutes);
app.use('/api', authRoutes); // 👈 Esto expone /api/login


console.log("✅ Middlewares configurados");

// Conexión Mongo
mongoose.connect(process.env.MONGODB_URI, {}).then(() => console.log("✅ Conectado a MongoDB"))
    .catch((err) => console.error("❌ Error conectando MongoDB:", err));

// Ruta para crear usuario (solo para pruebas)
app.post("/register", async(req, res) => {
    try {
        const { username, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
        });

        await newUser.save();
        console.log(`✅ Usuario creado: ${username}`);

        res.status(201).json({ message: "Usuario registrado correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error registrando usuario" });
    }
});

// Ruta de login
app.post("/login", async(req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            console.log("❌ Usuario no encontrado");
            return res.status(400).json({ error: "Credenciales inválidas" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log("❌ Contraseña incorrecta");
            return res.status(400).json({ error: "Credenciales inválidas" });
        }

        console.log("✅ Login exitoso");
        res.json({ message: "Login exitoso" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en login" });
    }
});

// Arrancar server
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});