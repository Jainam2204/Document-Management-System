import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true
        },
        
        name: {
            type: String,
            required: true,
            trim: true
        },

        s3Key: {
            type: String,
            required: true
        },

        size: {
            type: Number
        },

        type: {
            type: String
        },

        folder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        isDeleted: {
            type: Boolean,
            default: false
        },

        deletedAt: {
            type: Date
        }
    },
    { timestamps: true }
);

fileSchema.index({ owner: 1, folder: 1 });

export default mongoose.model("File", fileSchema);