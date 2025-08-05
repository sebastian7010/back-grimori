import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Middleware para verificar token JWT con logs detallados
export const verifyToken = (req, res, next) => {
    console.log("➡️ Entró al middleware verifyToken");
    console.log("🔍 Headers recibidos:", req.headers);

    const authHeader = req.header("Authorization") || req.header("authorization");
    console.log("📌 Header Authorization recibido:", authHeader);

    if (!authHeader) {
        console.warn("❌ No se encontró el header Authorization");
        return res.status(401).json({ message: "No Authorization header provided" });
    }

    let token = "";
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
    } else {
        console.warn("⚠️ Header Authorization no tiene formato 'Bearer <token>'");
        return res.status(401).json({ message: "Authorization header malformed" });
    }

    console.log("🔑 Token extraído:", token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token verificado correctamente, contenido decodificado:", decoded);

        req.userId = decoded.id || decoded.userId || null;
        console.log("👤 User ID asignado a req.userId:", req.userId);

        if (!req.userId) {
            console.warn("⚠️ El token no contiene 'id' ni 'userId'");
            return res.status(401).json({ message: "Token payload invalid: missing user id" });
        }

        next();
    } catch (error) {
        console.error("❌ Error al verificar token:", error.message);
        return res.status(401).json({ message: "Invalid or expired token", error: error.message });
    }
};

// RUTA LOGIN - genera y envía token JWT con expiración 24 horas
router.post('/login', async(req, res) => {
    try {
        const { username, password } = req.body;
        console.log("➡️ Login recibido:", username);

        const user = await User.findOne({ username });
        if (!user) {
            console.warn("❌ Usuario no encontrado");
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn("❌ Contraseña incorrecta");
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ userId: user._id },
            process.env.JWT_SECRET, { expiresIn: '24h' } // Expiración aumentada a 24 horas
        );

        console.log("✅ Login exitoso, token generado");
        res.json({ token });
    } catch (err) {
        console.error("❌ Error en login:", err);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

export default router;