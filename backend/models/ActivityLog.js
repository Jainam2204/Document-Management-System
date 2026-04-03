import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        action: {
            type: String,
            enum: ["UPLOAD", "DELETE", "SOFT_DELETE", "DOWNLOAD", "SHARE", "RENAME", "LOGIN", "REGISTER", "CREATE"]
        },

        fileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File"
        },

        folderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder"
        }
    },
    { timestamps: true }
);

activityLogSchema.index({ user: 1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);