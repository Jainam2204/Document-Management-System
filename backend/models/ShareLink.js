const mongoose = require("mongoose");

const shareLinkSchema = new mongoose.Schema(
  {
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true
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

module.exports = mongoose.model("ShareLink", shareLinkSchema);