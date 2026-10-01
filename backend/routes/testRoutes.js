const express = require("express");

const { testOtpStore } = require("../controllers/registrationController");

const router = express.Router();

router.get("/otp", (req, res) => {
    if (process.env.ALLOW_TEST_OTP !== "true") {
        return res.status(404).json({
            message: "Not found",
        });
    }

    const { challengeId } = req.query;

    if (!challengeId) {
        return res.status(400).json({
            message: "challengeId is required",
        });
    }

    const otp = testOtpStore.get(challengeId);

    if (!otp) {
        return res.status(404).json({
            message: "OTP not found or no longer available",
        });
    }

    return res.status(200).json({
        challengeId,
        otp,
    });
});

module.exports = router;