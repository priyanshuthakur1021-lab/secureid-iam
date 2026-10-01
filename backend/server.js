require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");

const loginRoutes = require("./routes/loginRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const profileRoutes = require("./routes/profileRoutes");
const adminRoutes = require("./routes/adminRoutes");
const testRoutes = require("./routes/testRoutes");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
    cors({
        origin: "http://localhost:5500",
        credentials: true,
    })
);

app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 60 * 60 * 1000,
        },
    })
);

app.get("/", (req, res) => {
    res.json({
        message: "SecureID backend is running",
    });
});

app.use("/api", registrationRoutes);
app.use("/api", loginRoutes);
app.use("/api", profileRoutes);
app.use("/api", adminRoutes);
app.use("/api/test", testRoutes);
connectDB()
    .then(() => {
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`SecureID server running on port ${PORT}`);
        });
    });