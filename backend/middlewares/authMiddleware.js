import 'dotenv/config';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers['x-access-token'] || req.cookies?.accessToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token not found',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        const user = await User.findOne({ email: decoded.email }).select(
            '_id id email isAdmin storageUsed storageLimit'
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error in authMiddleware: ' + error);
        res.status(401).json({
            success: false,
            message: 'Invalid token',
        });
    }
};

export default authMiddleware;