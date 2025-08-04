import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    console.log("➡️ Entró al middleware verifyToken");

    const authHeader = req.header("Authorization");
    console.log("📌 Header Authorization:", authHeader);

    if (!authHeader) {
        console.log("❌ No Authorization header");
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    console.log("🔑 Token limpio:", token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token decodificado:", decoded);

        req.userId = decoded.id;
        next();
    } catch (error) {
        console.log("❌ Token inválido:", error.message);
        return res.status(401).json({ message: "Invalid token", error: error.message });
    }
};