const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
    {
        challengeId: {
            type: String,
            required: true,
            unique: true,
        },

        userId: {
            type: String,
            required: true,
        },

        channel: {
            type: String,
            enum: ["email", "mobile"],
            required: true,
        },

        otpHash: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        attempts: {
            type: Number,
            default: 0,
        },

        used: {
            type: Boolean,
            default: false,
        },
    },
    {
        versionKey: false,
    }
);

module.exports = mongoose.model("Challenge", challengeSchema);