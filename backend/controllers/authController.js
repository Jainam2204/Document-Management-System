import 'dotenv/config';

import admin from '../config/config.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Counter from '../models/Counter.js';

const PASSWORD_EXPIRY_DAYS = Number(process.env.PASSWORD_EXPIRY_DAYS) || 90;
const PASSWORD_EXPIRY_WARNING_DAYS = Number(process.env.PASSWORD_EXPIRY_WARNING_DAYS) || 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Generate a JWT access token for authenticated users.
 * @param payload - Claims to encode in the access token.
 * @returns A signed access token string.
 */
const generateAccessToken = (payload) => {
    try {
        const token = jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }

        );

        return token;
    } catch (error) {
        console.error("Error in generateAccessToken : " + error)
    }
}

/**
 * Generate a JWT refresh token for session renewal.
 * @param payload - Claims to encode in the refresh token.
 * @returns A signed refresh token string.
 */
const generateRefreshToken = (payload) => {
    try {
        const token = jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
        );

        return token;
    } catch (error) {
        console.error("Error in generateRefreshToken : " + error)
    }
}

/**
 * Build password expiry metadata for a user.
 * @param user - User document used to calculate expiry values.
 * @returns Object containing expiry state and timestamps.
 */
const buildPasswordExpiryInfo = (user) => {
    const lastUpdatedAt = user.passwordLastUpdatedAt || user.passwordChangedAt || new Date();
    const expiryDuration = user.passwordExpiryDuration || PASSWORD_EXPIRY_DAYS;
    const expiresAt = user.passwordExpiresAt
        ? new Date(user.passwordExpiresAt)
        : new Date(lastUpdatedAt.getTime() + expiryDuration * DAY_MS);

    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysToExpire = Math.max(0, Math.ceil(diffMs / DAY_MS));
    const isPasswordExpired = diffMs <= 0;
    const isPasswordNearExpiry = !isPasswordExpired && daysToExpire <= PASSWORD_EXPIRY_WARNING_DAYS;

    return {
        isPasswordExpired,
        isPasswordNearExpiry,
        daysToExpire,
        passwordLastUpdatedAt: lastUpdatedAt,
        passwordExpiresAt: expiresAt,
        passwordExpiryDuration: expiryDuration,
    };
};

/**
 * Authenticate a user and issue access and refresh tokens.
 * @param req - Express request object containing email and password in body.
 * @param res - Express response object returning auth tokens and expiry data.
 * @returns HTTP 200 on successful login, or HTTP 404/400 on failure.
 */
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

        let doesPasswordMatch;

        if(email === admin.email){
            doesPasswordMatch = password === admin.password ? true : false;
        } else {
            doesPasswordMatch = await bcrypt.compare(password, existingUser.password);
        }


        if (!doesPasswordMatch) {
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const expiryInfo = buildPasswordExpiryInfo(existingUser);
        if (!existingUser.passwordExpiresAt || !existingUser.passwordLastUpdatedAt || !existingUser.passwordExpiryDuration) {
            await User.findByIdAndUpdate(existingUser._id, {
                passwordLastUpdatedAt: expiryInfo.passwordLastUpdatedAt,
                passwordChangedAt: expiryInfo.passwordLastUpdatedAt,
                passwordExpiryDuration: expiryInfo.passwordExpiryDuration,
                passwordExpiresAt: expiryInfo.passwordExpiresAt,
            });
        }

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

        res.status(200).json({
            success: true,
            message: "Login successful",
            passwordExpiry: {
                isPasswordExpired: expiryInfo.isPasswordExpired,
                isPasswordNearExpiry: expiryInfo.isPasswordNearExpiry,
                daysToExpire: expiryInfo.daysToExpire,
                passwordLastUpdatedAt: expiryInfo.passwordLastUpdatedAt,
                passwordExpiresAt: expiryInfo.passwordExpiresAt,
                passwordExpiryDuration: expiryInfo.passwordExpiryDuration,
            },
        });
    } catch (error) {
        console.error("Error in login : " + error);
        res.status(404).json({
            success: false,
            message: "Error in login"
        });
    }
};

/**
 * Register a new user account and initialize password expiry metadata.
 * @param req - Express request object containing user details in body.
 * @param res - Express response object returning success or error.
 * @returns HTTP 200 on success or HTTP 404/500 on failure.
 */
export const register = async (req, res) => {
    try {
        const newUser = req.body;
        const hashedPassword = await bcrypt.hash(newUser.password, 10);
        const userCount = await Counter.findOneAndUpdate({ collectionName: 'users' },
            { $inc: { count: 1 } },
            { new: true, upsert: true });

        const expiryDuration = Number(process.env.PASSWORD_EXPIRY_DAYS) || PASSWORD_EXPIRY_DAYS;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + expiryDuration * DAY_MS);

        newUser.id = userCount.count;
        newUser.password = hashedPassword;
        newUser.passwordLastUpdatedAt = now;
        newUser.passwordChangedAt = now;
        newUser.passwordExpiryDuration = expiryDuration;
        newUser.passwordExpiresAt = expiresAt;

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
}

/**
 * Return current password expiry status for the authenticated user.
 * @param req - Express request object containing authenticated user on req.user.
 * @param res - Express response object returning expiry details.
 * @returns HTTP 200 with password expiry info or HTTP 404/500 on failure.
 */
export const getPasswordStatus = async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.user.email });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const expiryInfo = buildPasswordExpiryInfo(existingUser);

        if (!existingUser.passwordExpiresAt || !existingUser.passwordLastUpdatedAt || !existingUser.passwordExpiryDuration) {
            await User.findByIdAndUpdate(existingUser._id, {
                passwordLastUpdatedAt: expiryInfo.passwordLastUpdatedAt,
                passwordChangedAt: expiryInfo.passwordLastUpdatedAt,
                passwordExpiryDuration: expiryInfo.passwordExpiryDuration,
                passwordExpiresAt: expiryInfo.passwordExpiresAt,
            });
        }

        return res.status(200).json({
            success: true,
            passwordExpiry: {
                isPasswordExpired: expiryInfo.isPasswordExpired,
                isPasswordNearExpiry: expiryInfo.isPasswordNearExpiry,
                daysToExpire: expiryInfo.daysToExpire,
                passwordLastUpdatedAt: expiryInfo.passwordLastUpdatedAt,
                passwordExpiresAt: expiryInfo.passwordExpiresAt,
                passwordExpiryDuration: expiryInfo.passwordExpiryDuration,
            },
        });
    } catch (error) {
        console.error('Error in getPasswordStatus: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch password status',
        });
    }
};

/**
 * Change the authenticated user's password and update expiry metadata.
 * @param req - Express request object containing current and new password in body.
 * @param res - Express response object returning success or error response.
 * @returns HTTP 200 with updated expiry info or HTTP 400/500 on failure.
 */
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

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters and include uppercase, lowercase, and a number',
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const now = new Date();
        const expiryDuration = existingUser.passwordExpiryDuration || PASSWORD_EXPIRY_DAYS;
        const expiresAt = new Date(now.getTime() + expiryDuration * DAY_MS);

        await User.findByIdAndUpdate(existingUser._id, {
            password: hashedPassword,
            passwordLastUpdatedAt: now,
            passwordChangedAt: now,
            passwordExpiryDuration: expiryDuration,
            passwordExpiresAt: expiresAt,
        });

        const expiryInfo = buildPasswordExpiryInfo({
            ...existingUser.toObject(),
            passwordLastUpdatedAt: now,
            passwordChangedAt: now,
            passwordExpiryDuration: expiryDuration,
            passwordExpiresAt: expiresAt,
        });

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully',
            passwordExpiry: {
                isPasswordExpired: expiryInfo.isPasswordExpired,
                isPasswordNearExpiry: expiryInfo.isPasswordNearExpiry,
                daysToExpire: expiryInfo.daysToExpire,
                passwordLastUpdatedAt: expiryInfo.passwordLastUpdatedAt,
                passwordExpiresAt: expiryInfo.passwordExpiresAt,
                passwordExpiryDuration: expiryInfo.passwordExpiryDuration,
            },
        });
    } catch (error) {
        console.error('Error in changePassword: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
        });
    }
};

/**
 * Verify a user's account using a verification code.
 * @param req - Express request object containing verification code and email in body.
 * @param res - Express response object returning verification result.
 * @returns HTTP 200 on success or HTTP 400/404 on failure.
 */
export const verify = async (req, res) => {
    try {
        const [verificationCode, email] = req.body;

        const existingUser = await User.findOne({ email })

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (existingUser.verificationCode !== verificationCode) {
            return res.status(400).json({
                success: false,
                message: 'Invalis verification code'
            });
        }

        await User.updateOne({ email }, {
            isVerified: true,
            verificationCode: null
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
        });

    } catch (error) {
        console.error("Error in register : " + error);
        res.status(404).json({
            success: false,
            message: "Error occured while creating user account"
        });
    }
}

/**
 * Generate access token based on refresh token payload
 * @param req - Express request object containing access or refresh token.
 * @param res - Express response object returning a renewed access token or error.
 * @returns HTTP 200 with access token or HTTP 401/404 on failure.
 */
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
            maxAge: (1 * 24 * 60 * 60 * 1000),
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
        res.status(401).json({
            success: false,
            message: "Error occured in refresh"
        });
    }

}

/**
 * Log out the current user by clearing authentication cookies.
 * @param req - Express request object.
 * @param res - Express response object returning logout confirmation.
 * @returns HTTP 200 on success or HTTP 404 on failure.
 */
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
}