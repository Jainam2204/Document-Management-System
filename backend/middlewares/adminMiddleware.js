const adminMiddleware = (req, res, next) => {
    try {
        if (!req.user.isAdmin)
            return res.status(403).json({
                success: false,
                message: "Admin access only"
            });

        next();
    }catch(error){
        console.error("Error in adminMiddleware : " + error);
        res.status(400).json({
            success: false,
            message: 'Error occured while checking role'
        })
    }
};

export default adminMiddleware;