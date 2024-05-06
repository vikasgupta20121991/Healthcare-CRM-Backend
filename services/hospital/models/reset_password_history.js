import mongoose from "mongoose";

const resetPasswordHistorySchema = new mongoose.Schema(
  {
    passwordToken: {
      type: String,
      required: true,
    },
    uuid: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ResetPasswordHistory", resetPasswordHistorySchema);
