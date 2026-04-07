import User from '../models/User.js';


export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('id name email storageUsed isAdmin');

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