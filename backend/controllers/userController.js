import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import File from '../models/File.js';
import Folder from '../models/Folder.js';


export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('id name email storageUsed storageLimit isAdmin').sort({id: 1});

        return res.status(200).json({
            success: true,
            users: users
        });

    } catch (error) {
        console.error('Error in getAllUsers: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};


export const updateUserRole = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { isAdmin } = req.body;

        if (typeof isAdmin !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isAdmin must be true or false'
            });
        }

        const updatedUser = await User.findOneAndUpdate(
            { id: userId },        
            { isAdmin: isAdmin },
            { returnDocument: 'after'}  
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: `User role updated successfully`
        });

    } catch (error) {
        console.error('Error in updateUserRole: ' + error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role'
        });
    }
};



export const getUsedStorage = (req, res) => {
    try {
        if (!req.user) {
            return res.status(400).json({
                success: 'false',
                message: 'Not able to get user details'
            });
        }

        return res.status(200).json({
            success: true,
            storageUsed: req.user.storageUsed,
            storageLimit: req.user.storageLimit
        });

    } catch (error) {
        console.error("Error in getUsedStorage : " + error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || !q.trim()) {
            return res.status(200).json({
                success: true,
                users: []
            });
        }

        const searchRegex = new RegExp(q.trim(), 'i');

        const users = await User.find({
            _id: { $ne: req.user._id },
            $or: [
                { email: searchRegex },
                { name: searchRegex }
            ]
        })
            .select('name email')
            .limit(10)
            .lean();

        return res.status(200).json({
            success: true,
            users: users.map(u => ({ name: u.name, email: u.email }))
        });

    } catch (error) {
        console.error('Error in searchUsers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
};

export const getRecentLogs = async (req, res) => {
    try {
        const userId = req.user._id;

        const logs = await ActivityLog.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .skip(1)
            .populate('fileId', 'name')
            .populate('folderId', 'name')
            .lean();



        const formatted = logs.map(log => ({
            _id: log._id,
            action: log.action,
            label: log.action,
            resourceName: log.fileId?.name || log.folderId?.name || null,
            timestamp: log.createdAt
        }));

        res.json({
            success: true,
            logs: formatted
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch logs'
        });
    }
};