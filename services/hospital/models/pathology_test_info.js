import mongoose from "mongoose";

const pathologyTestInfoSchema = new mongoose.Schema(
    {
    medical_act: [{
        type: String,
    }],
    lab_test: [{
      type: String,
    }],
    imaging: [{
      type: String,
    }],
    vaccination: [{
      type: String,
    }],
    other_test: [{
      type: String,
    }],
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PathologyTestInfo", pathologyTestInfoSchema);
