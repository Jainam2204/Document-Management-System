import mongoose from "mongoose";

const shareLinkSchema = new mongoose.Schema(
    {
        resourceType: {
            type: String,
            enum: ['file', 'folder'],
            required: true
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'resourceType'
        },

        token: {
            type: String,
            required: true,
            unique: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

shareLinkSchema.index({ token: 1 }, { unique: true });

export default mongoose.model("ShareLink", shareLinkSchema);