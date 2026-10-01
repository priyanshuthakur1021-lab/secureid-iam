const express = require("express");

const { logout } = require("../controllers/logoutController");
const authMiddleware = require("../middleware/authMiddleware");
const sessionAuthMiddleware = require("../middleware/sessionAuthMiddleware");

const router = express.Router();

router.get("/me", sessionAuthMiddleware, async (req, res) => {
    return res.status(200).json({
        message: "Authenticated user",
        user: {
            userId: req.session.userId,
            email: req.session.email,
            role: req.session.role,
        },
    });
});

router.get("/profile", authMiddleware, (req, res) => {
    return res.status(200).json({
        message: "Protected profile accessed successfully",
        user: req.user,
    });
});

router.get("/protected", authMiddleware, (req, res) => {
    return res.status(200).json({
        message: "Protected resource accessed successfully",
        user: req.user,
    });
});

router.post("/logout", logout);

module.exports = router;