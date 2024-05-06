import mongoose from "mongoose";

const ProfilePermissionSchema = new mongoose.Schema(
    {
        doctor_id: {
            type: String,
        },
        patient_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
        permission: {
            type: Object,
        }
    },
    { timestamps: true }
);

export default mongoose.model("ProfilePermission", ProfilePermissionSchema);
