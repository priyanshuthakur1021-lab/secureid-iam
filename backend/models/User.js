const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            default: () => crypto.randomUUID(),
            unique: true,
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        mobile: {
            type: String,
            required: true,
            trim: true,
        },

        passwordHash: {
            type: String,
            required: true,
        },

        emailVerified: {
            type: Boolean,
            default: false,
        },

        mobileVerified: {
            type: Boolean,
            default: false,
        },

        mfaEnabled: {
            type: Boolean,
            default: false,
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },

        failedLoginAttempts: {
            type: Number,
            default: 0,
        },

        lockUntil: {
            type: Date,
            default: null,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        versionKey: false,
    }
);

module.exports = mongoose.model("User", userSchema);