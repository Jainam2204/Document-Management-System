import 'dotenv/config';
import mongoose from 'mongoose';

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected database : ", mongoose.connection.db.databaseName);

    } catch (error) {
        console.error("MongoDB connection failed", error);
    }
}

export default connectDB;