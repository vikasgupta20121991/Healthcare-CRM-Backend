import mongoose from "mongoose";

const feeManagementSchema = new mongoose.Schema(
  {
    online: {
      basic_fee: {
        type: Number,
      },
      post_payment: {
        type: Boolean,
        default: false
      },
      pre_payment: {
        type: Boolean,
        default: false

      },
      cancelPolicy: {
        noofHours: {
          type: Number
        },
        noofmin: {
          type: Number
        },
        noofDays: {
          type: Number
        },
        comments: {
          type: String
        }
      }
    },
    home_visit: {
      basic_fee: {
        type: Number,
      },
      travel_fee: {
        type: Number,
      },
      post_payment: {
        type: Boolean,
        default: false

      },
      pre_payment: {
        type: Boolean,
        default: false

      },
      cancelPolicy: {
        noofHours: {
          type: Number
        },
        noofmin: {
          type: Number
        },
        noofDays: {
          type: Number
        },
        comments: {
          type: String
        }
      }
    },
    f2f: {
      basic_fee: {
        type: Number,
      },
      post_payment: {
        type: Boolean,
        default: false

      },
      pre_payment: {
        type: Boolean,
        default: false

      },
      cancelPolicy: {
        noofHours: {
          type: Number
        },
        noofDays: {
          type: Number
        },
        noofmin: {
          type: Number
        },
        comments: {
          type: String
        }
      }
    },
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },

    location_id:{
      type: String
    },
    type: {
      type: String,
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

export default mongoose.model("FeeManagement", feeManagementSchema);
