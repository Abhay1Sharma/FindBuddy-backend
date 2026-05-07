import express from "express";
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import passport from "passport";
import { User } from "../src/models/UserSchema.js";
import { OAuth2Client } from 'google-auth-library';
import { jwtAuthMiddleware, generateToken } from "../jwt.js";

const googleClient = new OAuth2Client(process.env.REACT_APP_CLIENTID);
const resend = new Resend(process.env.REACT_APP_RESEND_API_KEY);
const jwtsecret = process.env.REACT_APP_JWT_SECRET;
const frontendUrl = "https://find-buddy-frontend.vercel.app";l

const router = express.Router();

router.post('/login', (req, res, next) => {
    // Add { session: false } here
    passport.authenticate('local', { session: false }, (err, user, info) => {
        
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ message: "Invalid username or password" });
        
        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your email before login." });
        }
        
        const payload = {
            id: user.id,
            username: user.username
        };

        const token = generateToken(payload);

        return res.json({
            message: "Logged in successfully",
            token: token,
            user: { id: user.id, username: user.username }
        });
    })(req, res, next);
});

router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const userExist = await User.findOne({ username: username });

        if (userExist) {
            return res.status(400).json({ message: "Username already Exist" });
        }

        // 1. Register User
        const userData = new User({ username, email });
        const registeredUser = await User.register(userData, password);

        // 2. Generate a Verification Token (expires in 15 minute)-
        const emailToken = jwt.sign(
            { id: registeredUser._id },
            jwtsecret,
            { expiresIn: '15m' }
        );

        const verificationUrl = `${frontendUrl}/verify-email?token=${emailToken}`;

        // 3. Send the Email via Resend
        const emaildetails = await resend.emails.send({
            from: 'FindBuddy <onboarding@resend.dev>',
            to: email,
            subject: 'Welcome to FindBuddy! Please verify your email',
            html: `<div style = "font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #dfdada; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" >
    <div style="background-color: #1E293B; padding: 30px; text-align: center; border-bottom: 3px solid #FF3D00;">
        <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">
            <span style="color: white;">Find</span><span style="color: #FF3D00;">Buddy</span>
        </h1>
        <p style="color: #94A3B8; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
            Verify Your Identity
        </p>
    </div>

    <div style="padding: 40px; background-color: white;">
        <h2 style="color: #333; margin-top: 0;">Welcome to FindBuddy!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi ${registeredUser.username},<br><br>
            We're thrilled to have you join our community! To get started and ensure your account is secure, please verify your email address by clicking the button below:
        </p>

        <div style="text-align: center; margin: 35px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #0056b3; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
               Verify My Account
            </a>
        </div>

        <p style="color: #888; font-size: 14px; line-height: 1.6;">
            This link is valid for <strong>15 minutes</strong>. If you did not create a FindBuddy account, you can safely ignore this email.
        </p>
    </div>

    <div style="background-color: #263238; padding: 20px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
            &copy; 2026 FindBuddy Inc. | Helping you find your tribe.
        </p>
    </div>
</div>`
        });


        res.status(202).json({ message: "Check your email to verify your account!" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get("/api/verify-email", async (req, res) => {
    const { token } = req.query;

    try {
        // 1. Verify the token
        const decoded = jwt.verify(token, jwtsecret);

        // 2. Update user in Database 
        await User.findByIdAndUpdate(decoded.id, { isVerified: true });

        res.status(200).json({ message: "Email verified successfully! You can now log in." });
    } catch (err) {
        res.status(400).json({ message: "Invalid or expired token." });
    }
});

router.post("/api/resend-verification", async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Already verified" });

    // Generate new token
    const newToken = jwt.sign({ id: user._id }, jwtsecret, { expiresIn: '15m' });

    // Send email again (same as Step 3)

    const verificationUrl = `${frontendUrl}/verify-email?token=${newToken}`;

    await resend.emails.send({
        from: 'FindBuddy <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to FindBuddy! Please verify your email',
        html:
            `<div style = "font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #dfdada; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" >
    <div style="background-color: #1E293B; padding: 30px; text-align: center; border-bottom: 3px solid #FF3D00;">
        <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">
            <span style="color: white;">Find</span><span style="color: #FF3D00;">Buddy</span>
        </h1>
        <p style="color: #94A3B8; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
            Verify Your Identity
        </p>
    </div>

    <div style="padding: 40px; background-color: white;">
        <h2 style="color: #333; margin-top: 0;">Welcome to FindBuddy!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi Abhay Sharma,<br><br>
            We're thrilled to have you join our community! To get started and ensure your account is secure, please verify your email address by clicking the button below:
        </p>

        <div style="text-align: center; margin: 35px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #0056b3; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
               Verify My Account
            </a>
        </div>

        <p style="color: #888; font-size: 14px; line-height: 1.6;">
            This link is valid for <strong>15 minutes</strong>. If you did not create a FindBuddy account, you can safely ignore this email.
        </p>
    </div>

    <div style="background-color: #263238; padding: 20px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
            &copy; 2026 FindBuddy Inc. | Helping you find your tribe.
        </p>
    </div>
</div>`
    });
    res.json({ message: "New verification link sent!" });
});

router.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Use a case-insensitive search to prevent "Abhay@gmail" vs "abhay@gmail" errors
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (!user) {
            // CHANGE THIS: Send a 404 so the Frontend 'catch' block triggers
            return res.status(404).json({ success: false, message: "Unable to find that email." });
        }

        const token = jwt.sign({ id: user._id }, jwtsecret, { expiresIn: '7d' });
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        await resend.emails.send({
            from: 'FindBuddy <security@findbuddy.dev>',
            to: email,
            subject: 'FindBuddy: Reset your password',
            html: `<div style="height: auto; width: 85vh">
        <div style="background-color: #1E293B; padding: 30px; text-align: center; border-bottom: 3px solid #FF3D00;">
            <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">
                <span style="color: white;">Find</span><span style="color: #FF3D00;">Buddy</span>
            </h1>
            <p
                style="color: #94A3B8; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                Account Security</p>
        </div>

        <div style="padding: 40px; background-color: white;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Hi ${user.username},<br><br>
                We received a request to reset the password for your <strong>FindBuddy</strong> account. Click the
                button
                below to choose a new password:
            </p>

            <div style="text-align: center; margin: 35px 0;">
                <a href="${resetUrl}"
                    style="background-color: #0056b3; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Reset My Password
                </a>
            </div>

            <p style="color: #888; font-size: 14px; line-height: 1.6;">
                This link is valid for <strong>15 minutes</strong>. If you didn't request a password reset, please
                ignore
                this email or contact support if you have concerns. Your password will not change until you access the
                link
                above and create a new one.
            </p>
        </div>

        <div style="background-color: #263238; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
                &copy; 2026 FindBuddy Inc. | Secure Account Services
            </p>
        </div>
    </div>
    </div>`
        });

        res.status(200).json({ success: true, message: "Email sent!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send email" });
    }
});

router.post("/api/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, jwtsecret);
        const user = await User.findById(decoded.id);

        if (!user) return res.status(404).json({ message: "User not found" });

        // Since you use passport-local-mongoose, use setPassword
        await user.setPassword(newPassword);
        await user.save();

        res.status(200).json({ message: "Password updated successfully!" });
    } catch (err) {
        res.status(400).json({ message: "Link expired or invalid." });
    }
});

router.get("/user/me", jwtAuthMiddleware, async (req, res) => {
    try {
        // Find user by ID extracted from the token (provided by your middleware)
        const user = await User.findById(req.user.id).select("-password");
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/api/profile/update", jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const profileData = req.body;

        // 1. Update the profile data (or create if doesn't exist)
        await Profile.findOneAndUpdate(
            { userId: userId },
            { ...profileData, userId: userId },
            { upsert: true, new: true }
        );

        // 2. Mark user as completed
        await User.findByIdAndUpdate(userId, { hasCompletedProfile: true });

        res.status(200).json({ message: "Profile saved successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/api/google-login", async (req, res) => {
    const { token } = req.body;

    try {
        // 1. Verify the Google Token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.REACT_APP_CLIENTID,
        });

        const payload = ticket.getPayload();
        const { email, sub: googleId, name, picture } = payload;

        // 2. Find or Create User in your Database
        // Note: Since you use passport-local-mongoose, 
        // we check by email. Google users might not have a password.
        let user = await User.findOne({ email: email });

        console.log(payload);

        if (!user) {
            // Create user if they don't exist
            user = new User({
                // username: email.split('@')[0] + "_" + Math.floor(Math.random() * 1000),
                username: name,
                email: email,
                isVerified: true, // Google emails are pre-verified
                googleId: googleId,
                profilePicture: picture
            });
            await user.save();
        }

        // 3. Generate your OWN App JWT (using your existing utility)
        const appToken = generateToken({ id: user._id, username: user.username });

        res.status(200).json({
            message: "Google Login Successful",
            token: appToken,
            user: { id: user._id, username: user.username, picture: user.profilePicture }
        });

    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ message: "Invalid Google Token" });
    }
});

router.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Logged out successfully" });
    });
});


// app.post("/signup", async (req, res) => {
//     try {
//         const { username, email, password } = req.body;

//         const userExists = await User.findOne({ email: email });
//         if (userExists) {
//             return res.status(400).json({ user: userExists, message: "User already registered!" });
//         }

//         const userData = new User({ username, email });
//         const registeredUser = await User.register(userData, password);

//         // Generate token for the new user
//         const payload = {
//             id: registeredUser.id,
//             username: registeredUser.username
//         };
//         const token = generateToken(payload);

//         // SEND ONLY ONE RESPONSE
//         return res.status(201).json({
//             message: "User registered successfully",
//             user: { id: registeredUser._id, username: registeredUser.username },
//             token: token
//         });

//     } catch (err) {
//         // If an error happens before the response is sent, this will catch it
//         if (!res.headersSent) {
//             res.status(400).json({ error: err.message });
//         }
//     }
// });

export default router;