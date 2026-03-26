const adminMiddleware = (req, res, next) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({
                success: false,
                message: "Admin access only"
            });

        next();
    }catch(error){
        console.error("Error in adminMiddleware : " + error);
    }
};

module.exports = adminMiddleware;