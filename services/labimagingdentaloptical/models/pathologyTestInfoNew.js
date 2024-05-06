import mongoose from "mongoose";

const pathologyTestInfoNewSchema = new mongoose.Schema(
    {
        typeOfTest: {
            type: String,
            required: true
        },
        nameOfTest: {
            type: String,
            required: true
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
        isExist:{
            type:Boolean,
            default:false
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

export default mongoose.model("PathologyTestInfoNew", pathologyTestInfoNewSchema);
