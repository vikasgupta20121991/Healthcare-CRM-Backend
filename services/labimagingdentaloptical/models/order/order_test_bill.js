import mongoose from "mongoose";

const testBillSchema = new mongoose.Schema(
    {
        total_test_cost: {
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
        portal_type: {
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

export default mongoose.model("OrdertestBill", testBillSchema);
