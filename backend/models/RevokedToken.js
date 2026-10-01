const mongoose = require("mongoose");

const revokedTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
        },

        revokedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        versionKey: false,
    }
);

module.exports = mongoose.model("RevokedToken", revokedTokenSchema);