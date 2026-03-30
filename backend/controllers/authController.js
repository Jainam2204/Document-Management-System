import 'dotenv/config';

import admin from '../config/config.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Counter from '../models/Counter.js';

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

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // const role = email === admin.email ? "admin" : "user";

        // if (role === "admin") {

        //     if (password !== admin.password) {
        //         return res.status(404).json({
        //             success: false,
        //             message: "Invalid credentials"
        //         });
        //     }

        // } else {

        //     const existingUser = await User.findOne({ email });

        //     if (!existingUser) {
        //         return res.status(404).json({
        //             success: false,
        //             message: "User not found"
        //         });
        //     }

        //     const doesPasswordMatch = await bcrypt.compare(password, existingUser.password);

        //     if (!doesPasswordMatch) {
        //         return res.status(404).json({
        //             success: false,
        //             message: "Invalid credentials"
        //         });
        //     }
        // }

        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const doesPasswordMatch = await bcrypt.compare(password, existingUser.password);

        if (!doesPasswordMatch) {
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const isAdmin = existingUser.isAdmin;

        const accessToken = generateAccessToken({ email, isAdmin });
        const refreshToken = generateRefreshToken({ email, isAdmin });

        res.cookie("accessToken", accessToken, {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            path: '/'
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
            path: '/'
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
        });
    } catch (error) {
        console.error("Error in login : " + error);
        res.status(404).json({
            success: false,
            message: "Error in login"
        });
    }
};

export const register = async (req, res) => {
    try {
        const newUser = req.body;
        const hashedPassword = await bcrypt.hash(newUser.password, 10);
        const userCount = await Counter.findOneAndUpdate({ collectionName: 'users' },
            { $inc: { count: 1 } },
            { new: true, upsert: true });

        newUser.id = userCount.count;
        newUser.password = hashedPassword;

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
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            path: '/'
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
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

export const generateExpiredAccessToken = (req, res) => {
    try {

        if (req.headers["x-access-token"]) {
            return res.status(200).json({
                success: true,
                message: "Token exists",
                token: req.headers["x-access-token"]
            });
        }

        if (req.cookies?.accessToken) {
            return res.status(200).json({
                success: true,
                message: "Token exists",
                token: req.cookies.accessToken
            });
        }

        const refreshToken = req.cookies?.refreshToken;
        // const refreshToken = req.headers["x-refresh-token"];

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
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            path: '/'
        });

        res.status(200).json({
            success: true,
            message: "Token generated successfully",
            accessToken: accessToken
        });

    } catch (error) {
        console.error("Error in refresh token : " + error);
        res.status(404).json({
            success: false,
            message: "Error occured in refresh"
        });
    }

}

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