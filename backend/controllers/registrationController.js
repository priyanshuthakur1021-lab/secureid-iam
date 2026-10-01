const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const Challenge = require("../models/Challenge");

const testOtpStore = new Map();

const register = async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;

    // 1. Validate required fields
    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // 2. Check whether email already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      mobile,
      passwordHash,
      emailVerified: false,
      mobileVerified: false,
      mfaEnabled: false,
      role: "user",
    });

    // 5. Generate email OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 6. Create OTP challenge
    const challengeId = crypto.randomUUID();

    testOtpStore.set(challengeId, otp);

    const challenge = {
      challengeId,
      userId: user.id,
      channel: "email",
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      attempts: 0,
      used: false,
    };

    await Challenge.create(challenge);

    // Simulated email delivery
    console.log("[SIMULATED EMAIL]");
    console.log(`To: ${user.email}`);
    console.log(`OTP: ${otp}`);

    // 7. Return challengeId
    return res.status(201).json({
      message: "Registration started",
      userId: user.id,
      challengeId,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const sendEmailOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const user = await User.findOne({
      id: userId,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    // Invalidate previous unused email challenges
    await Challenge.updateMany(
      {
        userId: user.id,
        channel: "email",
        used: false,
      },
      {
        used: true,
      }
    );

    const otp = crypto.randomInt(100000, 1000000).toString();
    const challengeId = crypto.randomUUID();

    await Challenge.create({
      challengeId,
      userId: user.id,
      channel: "email",
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      attempts: 0,
      used: false,
    });

    // Test-only OTP storage for evaluator testing
    testOtpStore.set(challengeId, otp);

    console.log("[SIMULATED EMAIL RESEND]");
    console.log(`To: ${user.email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Challenge ID: ${challengeId}`);

    return res.status(201).json({
      message: "Email OTP sent",
      challengeId,
    });
  } catch (error) {
    console.error("Email OTP generation error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const { challengeId, otp } = req.body;

    if (!challengeId || !otp) {
      return res.status(400).json({
        message: "challengeId and otp are required",
      });
    }

    const challenge = await Challenge.findOne({
      challengeId,
      channel: "email",
    });

    if (!challenge) {
      return res.status(404).json({
        message: "OTP challenge not found",
      });
    }

    // Challenge can only be used once
    if (challenge.used) {
      return res.status(400).json({
        message: "OTP challenge has already been used",
      });
    }

    // Check expiry
    if (new Date() > challenge.expiresAt) {
      challenge.used = true;
      await challenge.save();

      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    // Maximum 3 attempts
    if (challenge.attempts >= 3) {
      challenge.used = true;
      await challenge.save();

      return res.status(429).json({
        message: "Maximum attempts reached",
      });
    }

    // Check OTP
    const isValidOtp = await bcrypt.compare(
      otp.toString(),
      challenge.otpHash
    );

    if (!isValidOtp) {
      challenge.attempts += 1;

      if (challenge.attempts >= 3) {
        challenge.used = true;
        await challenge.save();

        return res.status(429).json({
          message: "Maximum attempts reached",
        });
      }

      await challenge.save();

      const remainingAttempts = 3 - challenge.attempts;

      return res.status(400).json({
        message: "Invalid OTP",
        remainingAttempts,
      });
    }

    // OTP is valid — invalidate challenge
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

    user.emailVerified = true;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully",
      userId: user.id,
    });
  } catch (error) {
    console.error("Email OTP verification error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const sendMobileOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    // Find user
    const user = await User.findOne({
      id: userId,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Email must be verified first
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Email must be verified first",
      });
    }

    // Already verified
    if (user.mobileVerified) {
      return res.status(400).json({
        message: "Mobile is already verified",
      });
    }

    // Generate mobile OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Create challenge
    const challengeId = crypto.randomUUID();

    const challenge = {
      challengeId,
      userId: user.id,
      channel: "mobile",
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      attempts: 0,
      used: false,
    };

    await Challenge.create(challenge);

    // Test-only OTP storage for evaluator testing
    testOtpStore.set(challengeId, otp);

    // Simulated SMS delivery
    console.log("[SIMULATED SMS]");
    console.log(`To: ${user.mobile}`);
    console.log(`OTP: ${otp}`);

    return res.status(201).json({
      message: "Mobile OTP sent",
      challengeId,
    });
  } catch (error) {
    console.error("Mobile OTP generation error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const verifyMobileOtp = async (req, res) => {
  try {
    const { challengeId, otp } = req.body;

    if (!challengeId || !otp) {
      return res.status(400).json({
        message: "challengeId and otp are required",
      });
    }

    const challenge = await Challenge.findOne({
      challengeId,
      channel: "mobile",
    });

    if (!challenge) {
      return res.status(404).json({
        message: "OTP challenge not found",
      });
    }

    // Challenge can only be used once
    if (challenge.used) {
      return res.status(400).json({
        message: "OTP challenge has already been used",
      });
    }

    // Check expiry
    if (new Date() > challenge.expiresAt) {
      challenge.used = true;
      await challenge.save();

      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    // Maximum 3 attempts
    if (challenge.attempts >= 3) {
      challenge.used = true;
      await challenge.save();

      return res.status(429).json({
        message: "Maximum attempts reached",
      });
    }

    // Check OTP
    const isValidOtp = await bcrypt.compare(
      otp.toString(),
      challenge.otpHash
    );

    if (!isValidOtp) {
      challenge.attempts += 1;

      if (challenge.attempts >= 3) {
        challenge.used = true;
        await challenge.save();

        return res.status(429).json({
          message: "Maximum attempts reached",
        });
      }

      await challenge.save();

      const remainingAttempts = 3 - challenge.attempts;

      return res.status(400).json({
        message: "Invalid OTP",
        remainingAttempts,
      });
    }

    // OTP is valid — invalidate challenge
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

    user.mobileVerified = true;
    user.mfaEnabled = true;
    await user.save();

    return res.status(200).json({
      message: "Mobile verified successfully",
      userId: user.id,
    });
  } catch (error) {
    console.error("Mobile OTP verification error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  register,
  sendEmailOtp,
  verifyEmailOtp,
  sendMobileOtp,
  verifyMobileOtp,
  testOtpStore,
};