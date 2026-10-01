const express = require("express");

const {
    login,
    verifyLoginOtp,
} = require("../controllers/loginController");

const { generateToken } = require("../controllers/jwtController");

const router = express.Router();

router.post("/login", login);
router.post("/verify-login-otp", verifyLoginOtp);
router.post("/token", generateToken);

module.exports = router;