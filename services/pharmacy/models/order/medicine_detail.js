import mongoose from "mongoose";

const medicineDetailSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            // required: true,
        },
        medicine_id: {
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
        in_medicine_bill: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "MedicineBill",
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

export default mongoose.model("MedicineDetail", medicineDetailSchema);
