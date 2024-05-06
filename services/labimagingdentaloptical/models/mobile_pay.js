import mongoose from "mongoose";

const mobilePaySchema = new mongoose.Schema(
    {
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
                mobile_country_code:{
                    type: String,
                    default: ''
                }
            }
        ],
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
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

export default mongoose.model("MobilePay", mobilePaySchema);
