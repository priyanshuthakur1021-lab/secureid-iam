const API_BASE_URL = "https://secureid-iam.onrender.com/api";

let userId = null;
let emailChallengeId = null;
let smsChallengeId = null;
let loginChallengeId = null;


// ================= SECTION CONTROL =================

const sections = [
    "registerSection",
    "emailOtpSection",
    "smsOtpSection",
    "registrationSuccessSection",
    "loginSection",
    "loginOtpSection",
    "dashboardSection",
];

function showSection(sectionId) {
    sections.forEach((id) => {
        document.getElementById(id).classList.add("hidden");
    });

    document.getElementById(sectionId).classList.remove("hidden");
}


// ================= PASSWORD TOGGLE =================

function setupPasswordToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);

    button.addEventListener("click", () => {

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "Hide";
        } else {
            input.type = "password";
            button.textContent = "Show";
        }

    });
}

setupPasswordToggle(
    "registerPassword",
    "registerPasswordToggle"
);

setupPasswordToggle(
    "loginPassword",
    "loginPasswordToggle"
);


// ================= PASSWORD STRENGTH =================

const registerPassword =
    document.getElementById("registerPassword");

const strengthBar =
    document.getElementById("strengthBar");

const strengthText =
    document.getElementById("strengthText");


function calculatePasswordStrength(password) {
    if (!password) {
        return {
            score: 0,
            label: "Password strength: -",
            level: "empty"
        };
    }

    const hasMinLength = password.length >= 8;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasMinLength) {
        return {
            score: 1,
            label: "Password strength: Weak",
            level: "weak"
        };
    }

    const varietyScore =
        Number(hasLowercase) +
        Number(hasUppercase) +
        Number(hasNumber) +
        Number(hasSpecial);

    if (varietyScore <= 2) {
        return {
            score: 2,
            label: "Password strength: Weak",
            level: "weak"
        };
    }

    if (varietyScore === 3) {
        return {
            score: 3,
            label: "Password strength: Medium",
            level: "medium"
        };
    }

    return {
        score: 4,
        label: "Password strength: Strong",
        level: "strong"
    };
}


registerPassword.addEventListener("input", () => {
    const result = calculatePasswordStrength(
        registerPassword.value
    );

    strengthText.textContent = result.label;

    strengthBar.className = "";

    if (result.level === "empty") {
        strengthBar.style.width = "0%";
    } else if (result.level === "weak") {
        strengthBar.style.width = "33%";
        strengthBar.classList.add("weak");
    } else if (result.level === "medium") {
        strengthBar.style.width = "66%";
        strengthBar.classList.add("medium");
    } else {
        strengthBar.style.width = "100%";
        strengthBar.classList.add("strong");
    }
});


// ================= NAVIGATION =================

document
    .getElementById("showLoginBtn")
    .addEventListener("click", () => {

        showSection("loginSection");

    });


document
    .getElementById("showRegisterBtn")
    .addEventListener("click", () => {

        showSection("registerSection");

    });


document
    .getElementById("goToLoginBtn")
    .addEventListener("click", () => {

        showSection("loginSection");

    });


// ================= REGISTER =================

document
    .getElementById("registerForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const fullName =
            document.getElementById("fullName").value.trim();

        const email =
            document.getElementById("registerEmail").value.trim();

        const mobile =
            document.getElementById("mobile").value.trim();

        const password =
            document.getElementById("registerPassword").value;

        const strength =
            calculatePasswordStrength(password);

        const message =
            document.getElementById("registerMessage");


        // Part 1 requirement:
        // Prevent registration when password is weak.
        if (strength.score <= 2) {

            message.textContent =
                "Password is too weak. Please create a stronger password.";

            return;
        }


        try {

            const response = await fetch(
                `${API_BASE_URL}/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        fullName,
                        email,
                        mobile,
                        password
                    })
                }
            );


            const data = await response.json();

            if (!response.ok) {

                message.textContent =
                    data.message || "Registration failed.";

                return;
            }


            /*
             * The backend registration response provides
             * the email OTP challenge.
             *
             * We will finalize the exact userId handling
             * after testing the actual response.
             */

            emailChallengeId = data.challengeId;

            userId =
                data.userId ||
                data.id ||
                null;


            message.textContent =
                "Registration started successfully.";

            showSection("emailOtpSection");

        } catch (error) {

            console.error(error);

            message.textContent =
                "Unable to connect to SecureID backend.";

        }

    });


// ================= RESEND EMAIL OTP =================

document
    .getElementById("resendEmailOtpBtn")
    .addEventListener("click", async () => {
        const message =
            document.getElementById("emailOtpMessage");

        if (!userId) {
            message.textContent =
                "User information is missing. Please restart registration.";

            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/send-email-otp`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        userId
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                message.textContent =
                    data.message || "Unable to resend Email OTP.";

                return;
            }

            emailChallengeId = data.challengeId;

            message.textContent =
                "A new Email OTP has been sent successfully.";

        } catch (error) {
            console.error(error);

            message.textContent =
                "Unable to connect to SecureID backend.";
        }
    });

// ================= EMAIL OTP =================

document
    .getElementById("emailOtpForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const otp =
            document.getElementById("emailOtp").value.trim();

        const message =
            document.getElementById("emailOtpMessage");

        if (!emailChallengeId) {
            message.textContent =
                "Email verification challenge is missing.";

            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/verify-email-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        userId,
                        challengeId: emailChallengeId,
                        otp
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                message.textContent =
                    data.message || "Email OTP verification failed.";

                return;
            }

            message.textContent =
                "Email verified successfully.";

            userId = data.userId || userId;

            showSection("smsOtpSection");

        } catch (error) {
            console.error(error);

            message.textContent =
                "Unable to connect to SecureID backend.";
        }
    });


// ================= SMS OTP =================

document
    .getElementById("sendSmsOtpBtn")
    .addEventListener("click", async () => {
        const message =
            document.getElementById("smsOtpMessage");

        if (!userId) {
            message.textContent =
                "User information is missing. Please restart registration.";

            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/send-sms-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        userId
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                message.textContent =
                    data.message || "Unable to send SMS OTP.";

                return;
            }

            smsChallengeId = data.challengeId;

            message.textContent =
                "SMS OTP sent successfully.";

            document
                .getElementById("smsOtpForm")
                .classList.remove("hidden");

        } catch (error) {
            console.error(error);

            message.textContent =
                "Unable to connect to SecureID backend.";
        }
    });


// ================= VERIFY SMS OTP =================

document
    .getElementById("smsOtpForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const otp =
            document.getElementById("smsOtp").value.trim();

        const message =
            document.getElementById("smsOtpMessage");

        if (!userId || !smsChallengeId) {
            message.textContent =
                "SMS verification information is missing.";

            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/verify-sms-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        userId,
                        challengeId: smsChallengeId,
                        otp
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                message.textContent =
                    data.message || "Mobile OTP verification failed.";

                return;
            }

            message.textContent =
                "Mobile verified successfully.";

            showSection("registrationSuccessSection");

        } catch (error) {
            console.error(error);

            message.textContent =
                "Unable to connect to SecureID backend.";
        }
    });


// ================= LOGIN =================

document
    .getElementById("loginForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        const message =
            document.getElementById("loginMessage");

        try {
            const response = await fetch(
                `${API_BASE_URL}/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                message.textContent =
                    data.message || "Login failed.";
                return;
            }

            loginChallengeId = data.challengeId;

            message.textContent =
                "Login successful. Please verify the OTP.";

            showSection("loginOtpSection");

        } catch (error) {
            console.error(error);

            message.textContent =
                "Unable to connect to SecureID backend.";
        }
    });


// ================= VERIFY LOGIN OTP =================

document
    .getElementById("loginOtpForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const otp =
            document.getElementById("loginOtp").value.trim();

        const message =
            document.getElementById("loginOtpMessage");

        if (!loginChallengeId) {
            message.textContent =
                "Login verification challenge is missing.";

            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/verify-login-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        challengeId: loginChallengeId,
                        otp
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                message.textContent =
                    data.message || "OTP verification failed.";

                return;
            }

            message.textContent =
                "Login successful.";

            // Fetch authenticated user information
            const meResponse = await fetch(
                `${API_BASE_URL}/me`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const meData = await meResponse.json();

            if (!meResponse.ok) {
                message.textContent =
                    meData.message || "Unable to load user profile.";

                return;
            }

            const userInfo =
                document.getElementById("userInfo");

            userInfo.innerHTML = `
                <p><strong>User ID:</strong> ${meData.user.userId}</p>
                <p><strong>Email:</strong> ${meData.user.email}</p>
                <p><strong>Role:</strong> ${meData.user.role}</p>
            `;

            showSection("dashboardSection");

        } catch (error) {
            console.error(error);

            message.textContent =
                "Unable to connect to SecureID backend.";
        }
    });


// ================= LOGOUT =================

document
    .getElementById("logoutBtn")
    .addEventListener("click", async () => {

        try {
            const response = await fetch(
                `${API_BASE_URL}/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error("Logout failed:", data.message);
                return;
            }

            loginChallengeId = null;

            showSection("loginSection");

            document.getElementById("loginForm").reset();
            document.getElementById("loginOtpForm").reset();

            document.getElementById("loginMessage").textContent = "";
            document.getElementById("loginOtpMessage").textContent = "";

        } catch (error) {
            console.error("Logout error:", error);
        }
    });

// ================= INITIAL STATE =================

showSection("registerSection");