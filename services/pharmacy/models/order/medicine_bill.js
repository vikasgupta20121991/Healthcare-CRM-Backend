import mongoose from "mongoose";

const medicineBillSchema = new mongoose.Schema(
    {
        total_medicine_cost: {
            type: String,
        },
        co_pay: {
            type: String,
        },
        insurance_paid: {
            type: String,
        },
        mode: {
            type: String,
        },
        prescription_url: {
            type: Array,
        },
        for_order_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "OrderDetail",
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("MedicineBill", medicineBillSchema);
