import mongoose from "mongoose";

const onDutyInfoSchema = new mongoose.Schema(
    {
        on_duty: [
            {
                from_date_timestamp: {
                    type: Date
                },
                to_date_timestamp: {
                    type: Date
                },
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

export default mongoose.model("OnDutyInfo", onDutyInfoSchema);
