import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
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

        parentFolder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        size: {
            type: Number,
            default: 0
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

folderSchema.index({ owner: 1, parentFolder: 1 });


export default mongoose.model("Folder", folderSchema);