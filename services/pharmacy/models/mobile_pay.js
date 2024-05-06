import mongoose from "mongoose";

const mobilePaySchema = new mongoose.Schema(
  {
    // provider: {
    //   type: String,
    //   required: false,
    // },
    // pay_number: {
    //   type: String,
    //   required: false,
    // },

    mobilePay: [
      {
        provider: {
          type: String,
          default: false,
        },
        pay_number: {
          type: String,
          default: false,
        },
        mobile_country_code: {
          type: String,
          default: false
        }
      }
    ],
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "PortalUser",
    },
  },
  { timestamps: true }
);

export default mongoose.model("MobilePay", mobilePaySchema);
