import mongoose from "mongoose";

const immunizationInfoSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        manufactured_name: {
            type: String,
        },
        medical_centre: {
            type: String,
        },
        batch_number: {
            type: String,
        },
        next_immunization_appointment: {
            type: String,
        },
        administered_date: {
            type: String,
        },
    route_of_administered: {
            type: String,
        },
        hcp_provided_immunization: {
            type: String,
        },
        allow_to_export: {
            type: Boolean,
        },
        added_by: {
            type: String,
            enum: ["patient", "doctor"]
        },
        added_by_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("ImmunizationInfo", immunizationInfoSchema);
