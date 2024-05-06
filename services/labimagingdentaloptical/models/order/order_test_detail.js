import mongoose from "mongoose";

const LabTestDetailSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            // required: true,
        },
        test_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        quantity_data: {
            prescribed: {
                type: String,
            },
            delivered: {
                type: String,
            },
        },
        category: {
            type: String,
        },
        service: {
            type: String,

        },
        request_amount: {
            type: String,
        },
        co_payment: {
            type: String,
        },
        frequency: {
            type: String,
        },
        duration: {
            type: String,
        },
        price_per_unit: {
            type: String,
        },
        comment: {
            type: String,
        },
        total_cost: {
            type: String,
        },
        available: {
            type: Boolean,
        },
        in_ordertest_bill: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "OrdertestBill",
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

export default mongoose.model("OrderTestDetails", LabTestDetailSchema);
