export const getUsedStorage = (req, res) => {
    try {
        if(!req.user){
            return res.status(400).json({
                success: 'false',
                message: 'Not able to get user details'
            });
        }

        return res.status(200).json({
            success: true,
            storageUsed: req.user.storageUsed,
            storageLimit: req.user.storageLimit
        })
    } catch (error) {
        console.error("Error in getUsedStorage : " + error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}