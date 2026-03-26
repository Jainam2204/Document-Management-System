require('dotenv').config();
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        let token = req.headers["x-access-token"];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token not found",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded;
        next();

    } catch (error) {
        console.error("Error in authMiddleware: " + error);
        res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
};

module.exports = authMiddleware;