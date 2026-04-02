import mongoose from "mongoose";

const shareSchema = new mongoose.Schema(
    {
        resourceType: {
            type: String,
            enum: ['file', 'folder'],
            required: true
        },

        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        sharedWithId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        sharedWithEmail: {
            type: String,
            required: true
        },

        ownerEmail: {
            type: String,
            required: true
        },

        expiresAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

shareSchema.index({ sharedWithId: 1 });
shareSchema.index({ ownerId: 1, resourceId: 1 });

export default mongoose.model("Share", shareSchema);
