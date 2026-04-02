import 'dotenv/config';

import admin from '../config/config.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Counter from '../models/Counter.js';
import sendEmail from '../utils/sendEmail.js';

const PASSWORD_EXPIRY_DAYS = Number(process.env.PASSWORD_EXPIRY_DAYS) || 90;

const generateAccessToken = (payload) => {
    try {
        const token = jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );
        return token;
    } catch (error) {
        console.error("Error in generateAccessToken : " + error);
    }
};

const generateRefreshToken = (payload) => {
    try {
        const token = jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
        );
        return token;
    } catch (error) {
        console.error("Error in generateRefreshToken : " + error);
    }
};



export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const doesPasswordMatch = email === admin.email ? password === admin.password : await bcrypt.compare(password, existingUser.password);

        if (!doesPasswordMatch) {
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        if (!existingUser.passwordLastUpdatedAt) {
            await User.findByIdAndUpdate(existingUser._id, {
                passwordLastUpdatedAt: new Date()
            });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        existingUser.verificationCode = verificationCode;
        existingUser.verificationCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        existingUser.isVerified = false;

        await existingUser.save();

        await sendEmail({
            to: email,
            subject: "Your Verification Code",
            html: `<h2>Your OTP is: ${verificationCode}</h2>`,
        });

        res.status(200).json({
            success: true,
            message: "Verification code sent in email",
        });

    } catch (error) {
        console.error("Error in login : " + error);
        res.status(500).json({
            success: false,
            message: "Error in login"
        });
    }
};


export const register = async (req, res) => {
    try {
        const newUser = req.body;
        const hashedPassword = await bcrypt.hash(newUser.password, 10);

        const userCount = await Counter.findOneAndUpdate(
            { collectionName: 'users' },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        const now = new Date();

        newUser.id = userCount.count;
        newUser.password = hashedPassword;
        newUser.passwordLastUpdatedAt = now;
        newUser.passwordChangedAt = now;
        newUser.passwordExpiryDuration = PASSWORD_EXPIRY_DAYS;

        await User.create(newUser);

        return res.status(200).json({
            success: true,
            message: "Account created successfully"
        });

    } catch (error) {
        console.error("Error in register : " + error);
        res.status(404).json({
            success: false,
            message: "Error occured while creating user account"
        });
    }
};


export const getPasswordStatus = async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.user.email });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            passwordLastUpdatedAt: existingUser.passwordLastUpdatedAt || new Date(),
            expiryDays: existingUser.passwordExpiryDuration || PASSWORD_EXPIRY_DAYS
        });

    } catch (error) {
        console.error('Error in getPasswordStatus: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch password status',
        });
    }
};



export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required',
            });
        }

        const existingUser = await User.findOne({ email: req.user.email });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const isCurrentValid = await bcrypt.compare(currentPassword, existingUser.password);
        if (!isCurrentValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect',
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password cannot be the same as the current password',
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,14}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6-14 characters and include uppercase, lowercase, number, and a special character',
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const now = new Date();

        await User.findByIdAndUpdate(existingUser._id, {
            password: hashedPassword,
            passwordLastUpdatedAt: now,
            passwordChangedAt: now,
            passwordExpiryDuration: existingUser.passwordExpiryDuration || PASSWORD_EXPIRY_DAYS
        });

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully',
            passwordLastUpdatedAt: now,
            expiryDays: existingUser.passwordExpiryDuration || PASSWORD_EXPIRY_DAYS
        });

    } catch (error) {
        console.error('Error in changePassword: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
        });
    }
};


export const verify = async (req, res) => {
    try {
        const { verificationCode, email } = req.body;

        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (existingUser.verificationCode !== verificationCode) {
            console.log('ex: ', existingUser.verificationCode);
            console.log('verification code: ', verificationCode);
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        if (new Date() > existingUser.verificationCodeExpiresAt) {
            return res.status(400).json({
                success: false,
                message: 'Verification code expired'
            });
        }

        await User.updateOne({ email }, {
            isVerified: true,
            verificationCode: null,
            verificationCodeExpiresAt: null
        });

        const isAdmin = existingUser.isAdmin;
        const accessToken = generateAccessToken({ email, isAdmin });
        const refreshToken = generateRefreshToken({ email, isAdmin });

        res.cookie("accessToken", accessToken, {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            maxAge: (15 * 60 * 1000),
            path: '/'
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            maxAge: (1 * 24 * 60 * 60 * 1000),
            path: '/'
        });

        return res.status(200).json({
            success: true,
            message: "Verified successfully",
            isAdmin: existingUser.isAdmin,
            passwordLastUpdatedAt: existingUser.passwordLastUpdatedAt || new Date(),
            expiryDays: existingUser.passwordExpiryDuration || PASSWORD_EXPIRY_DAYS
        });

    } catch (error) {
        console.error("Error in verify : " + error);
        res.status(500).json({
            success: false,
            message: "Error occured while verifying account"
        });
    }
};


export const generateExpiredAccessToken = (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Please login"
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const accessToken = generateAccessToken({ email: decoded.email, isAdmin: decoded.isAdmin });

        res.cookie("accessToken", accessToken, {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            maxAge: 1 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        return res.status(200).json({
            success: true,
            message: "Token generated successfully",
            accessToken: accessToken
        });

    } catch (error) {
        console.error("Error in refresh token : " + error);
        res.clearCookie("refreshToken", {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            path: '/'
        });
        res.status(500).json({
            success: false,
            message: "Internal server fail"
        });
    }
};


export const logout = (req, res) => {
    try {
        res.clearCookie("accessToken", {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            path: '/'
        });
        res.clearCookie("refreshToken", {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            path: '/'
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Error in logout : " + error);
        res.status(404).json({
            success: false,
            message: "Error occured while logging out"
        });
    }
};