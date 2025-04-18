import mongoose from "mongoose";

const immunizationListSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        // category: {
        //     type: Array,
        //     required: true,
        // },
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
      ref: "Superadmin",
        },
        active_status: {
          type: Boolean,
          required: true,
          default:true
        },
        delete_status: {
          type: Boolean,
          required: true,
          default: false
        },
      },
      { timestamps: true }
);

export default mongoose.model("ImmunizationList", immunizationListSchema);
