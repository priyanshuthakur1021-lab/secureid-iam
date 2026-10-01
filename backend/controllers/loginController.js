const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const Challenge = require("../models/Challenge");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRY = 2 * 60 * 1000; // 2 minutes

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        // 2. Find user
        const user = await User.findOne({
            email: email.toLowerCase(),
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        // 3. Check temporary account lock
        if (user.lockUntil && user.lockUntil > new Date()) {
            return res.status(423).json({
                message: "Account temporarily locked. Please try again later.",
            });
        }

        // 4. Clear expired lock
        if (user.lockUntil && user.lockUntil <= new Date()) {
            user.lockUntil = null;
            user.failedLoginAttempts = 0;
            await user.save();
        }

        // 5. Verify password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
        );

        // 6. Handle failed login
        if (!isPasswordValid) {
            user.failedLoginAttempts += 1;

            if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
                user.lockUntil = new Date(
                    Date.now() + LOCKOUT_DURATION
                );
                user.failedLoginAttempts = 0;

                await user.save();

                return res.status(423).json({
                    message:
                        "Too many failed login attempts. Account temporarily locked.",
                });
            }

            await user.save();

            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        // 7. Reset failed attempts after valid credentials
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        // 8. Email verification check
        if (!user.emailVerified) {
            return res.status(403).json({
                message: "Email is not verified",
            });
        }

        // 9. Mobile verification check
        if (!user.mobileVerified) {
            return res.status(403).json({
                message: "Mobile is not verified",
            });
        }

        // 10. MFA check
        if (!user.mfaEnabled) {
            return res.status(403).json({
                message: "MFA is not enabled",
            });
        }

        // 11. Generate login MFA OTP
        const otp = crypto.randomInt(100000, 1000000).toString();

        const challengeId = crypto.randomUUID();

        const otpHash = await bcrypt.hash(otp, 10);

        const challenge = await Challenge.create({
            challengeId,
            userId: user.id,
            channel: "email",
            otpHash,
            expiresAt: new Date(Date.now() + OTP_EXPIRY),
            attempts: 0,
            used: false,
        });

        // 12. Simulated email delivery
        console.log("\n[SIMULATED LOGIN EMAIL]");
        console.log(`To: ${user.email}`);
        console.log(`OTP: ${otp}`);
        console.log(`Challenge ID: ${challenge.challengeId}`);
        console.log("");

        // 13. Tell frontend that MFA is required
        return res.status(200).json({
            message: "MFA verification required",
            mfaRequired: true,
            method: "email",
            challengeId: challenge.challengeId,
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const verifyLoginOtp = async (req, res) => {
    try {
        const { challengeId, otp } = req.body;

        if (!challengeId || !otp) {
            return res.status(400).json({
                message: "Challenge ID and OTP are required",
            });
        }

        const challenge = await Challenge.findOne({
            challengeId,
            channel: "email",
            used: false,
        });

        if (!challenge) {
            return res.status(400).json({
                message: "Invalid or already used challenge",
            });
        }

        // Check expiry
        if (challenge.expiresAt <= new Date()) {
            challenge.used = true;
            await challenge.save();

            return res.status(400).json({
                message: "OTP has expired",
            });
        }

        // Check maximum attempts
        if (challenge.attempts >= 5) {
            return res.status(400).json({
                message: "Maximum OTP attempts exceeded",
            });
        }

        // Compare OTP
        const isOtpValid = await bcrypt.compare(
            otp,
            challenge.otpHash
        );

        if (!isOtpValid) {
            challenge.attempts += 1;

            if (challenge.attempts >= 5) {
                challenge.used = true;
                await challenge.save();

                return res.status(429).json({
                    message: "Maximum OTP attempts exceeded",
                });
            }

            await challenge.save();

            return res.status(400).json({
                message: "Invalid OTP",
                attemptsRemaining: 5 - challenge.attempts,
            });
        }

        // OTP successfully verified
        challenge.used = true;
        await challenge.save();

        const user = await User.findOne({
            id: challenge.userId,
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.role = user.role;

        return res.status(200).json({
            message: "Login OTP verified successfully",
            userId: user.id,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        console.error("Login OTP verification error:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

module.exports = {
    login,
    verifyLoginOtp,
};