import mongoose from "mongoose";

const portaltypeandinsuranceId = new mongoose.Schema(
    {
        insuranceId: { 
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        forportaluserId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        portalType: {
            type: String,
            enum: ["Pharmacy", "Hospital", "Doctor","Patient","Optical","Dental","Laboratory-Imaging","Paramedical-Professions","Insurance"],
            required: true,
        },
        categoryName:[],
        addedBy:{
            type:String, 

        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        },

    },
    { timestamps: true }
);

export default mongoose.model("portaltypeandinsuranceId", portaltypeandinsuranceId);