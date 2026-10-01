const jwt = require("jsonwebtoken");

const RevokedToken = require("../models/RevokedToken");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization header is required",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Bearer token is required",
            });
        }

        // Check whether token has been revoked in MongoDB
        const revokedToken = await RevokedToken.findOne({
            token,
        });

        if (revokedToken) {
            return res.status(401).json({
                message: "Token has been revoked",
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store token and decoded user information
        req.token = token;
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
};

module.exports = authMiddleware;