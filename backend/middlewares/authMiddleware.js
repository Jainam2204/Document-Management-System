import 'dotenv/config';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authenticate requests using an access token from headers or cookies.
 * @param req - Express request object.
 * @param res - Express response object used for failure responses.
 * @param next - Next middleware callback when authentication succeeds.
 * @returns Calls next() for valid tokens, or sends a 401/400 response.
 */
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
            return res.status(400).json({
                success: false,
                message: 'User not found',
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error in authMiddleware: ' + error);
        res.status(400).json({
            success: false,
            message: 'Invalid token',
        });
    }
};

export default authMiddleware;