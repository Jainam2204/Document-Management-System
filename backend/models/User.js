import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true
        },

        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
        },

        password: {
            type: String,
            required: true
        },

        isAdmin: {
            type: Boolean,
            default: false
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        verificationCode: {
            type: String
        },

        verificationCodeExpiresAt: {
            type: Date
        },

        passwordChangedAt: {
            type: Date,
            default: Date.now
        },

        passwordLastUpdatedAt: {
            type: Date,
            default: Date.now
        },

        passwordExpiryDuration: {
            type: Number,
            default: 90
        },

        passwordExpiresAt: {
            type: Date
        },

        storageUsed: {
            type: Number,
            default: 0
        },

        storageLimit: {
            type: Number,
            default: 5 * 1024 * 1024 * 1024
        }
    },
    { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model("User", userSchema);