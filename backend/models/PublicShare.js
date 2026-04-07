import mongoose from "mongoose";

const publicShareSchema = new mongoose.Schema(
    {
        fileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
            required: true
        },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        token: {
            type: String,
            required: true,
            unique: true
        },

        expiresAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

publicShareSchema.index({ token: 1 }, { unique: true });
publicShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PublicShare", publicShareSchema);
