const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/RevokedToken");

const logout = async (req, res) => {
    try {
        // JWT-based logout
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];

            if (!token) {
                return res.status(401).json({
                    message: "Bearer token is required",
                });
            }

            try {
                jwt.verify(token, process.env.JWT_SECRET);
            } catch (error) {
                return res.status(401).json({
                    message: "Invalid or expired token",
                });
            }

            const alreadyRevoked = await RevokedToken.findOne({
                token,
            });

            if (!alreadyRevoked) {
                await RevokedToken.create({
                    token,
                });
            }

            return res.status(200).json({
                message: "JWT logout successful",
            });
        }

        // Session-based logout
        if (req.session && req.session.userId) {
            req.session.destroy((error) => {
                if (error) {
                    console.error("Session logout error:", error);

                    return res.status(500).json({
                        message: "Logout failed",
                    });
                }

                res.clearCookie("connect.sid");

                return res.status(200).json({
                    message: "Logout successful",
                });
            });

            return;
        }

        return res.status(401).json({
            message: "Authentication required",
        });
    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

module.exports = {
    logout,
};