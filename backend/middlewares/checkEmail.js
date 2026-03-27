import User from '../models/User.js';
import admin from '../config/config.js';

const checkEmail = async (req, res, next) => {
    try {
        const data = req.body;

        if(data.email === admin.email){
            return res.status(404).json({
                success: false,
                message: "Email already exists"
            });
        }
        const isUser = await User.findOne({email: data.email});

        if (isUser) {
            return res.status(404).json({
                success: false,
                message: "Email already exists"
            });
        }

        next();
    } catch (error) {
        console.error("Error in checkEmail : " + error);
        res.status(404).json({
            success: false,
            message: "Error occured in checkEmail"
        });
    }
}

export default checkEmail;