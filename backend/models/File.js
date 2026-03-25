const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
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

    mimeType: {
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
    }
  },
  { timestamps: true }
);

fileSchema.index({ owner: 1, folder: 1 });

module.exports = mongoose.model("File", fileSchema);