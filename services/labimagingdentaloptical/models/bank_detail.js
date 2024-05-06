import mongoose from "mongoose";

const bankDetailSchema = new mongoose.Schema(
  {
    bank_name: {
      type: String,
    },
    account_holder_name: {
      type: String,
    },
    account_number: {
      type: String,
    },
    ifsc_code: {
      type: String,
    },
    bank_address: {
      type: String,
    },
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser"
    },
    type: {
      type: String,
      required: true,
      enum: [
        "Paramedical-Professions",
        "Dental",
        "Laboratory-Imaging",
        "Optical"
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model("BankDetail", bankDetailSchema);
