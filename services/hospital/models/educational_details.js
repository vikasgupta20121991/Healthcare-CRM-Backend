import mongoose from "mongoose";

const eduDetailSchema = new mongoose.Schema(
  {
    education_details: [
      {
        degree: {
          type: String,
        },
        university: {
          type: String,
        },
        city: {
          type: String,
        },
        country: {
          type: String,
        },
        start_date: {
          type: Date,
        },
        end_date: {
          type: Date,
        }
      }
    ],
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },
  },
  { timestamps: true }
);

export default mongoose.model("EducationalDetail", eduDetailSchema);
