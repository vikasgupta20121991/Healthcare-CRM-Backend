import mongoose from "mongoose";

const orderDetailSchema = new mongoose.Schema(
    {
        from_user: {
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
            user_name: {
                type: String,
                required: true,
            },
            image: {
                type: String,
            },
        },
        patient_details: {
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
            user_name: {
                type: String,
                required: true,
            },
            order_confirmation: {
                type: Boolean,
                default: false
            },
            image: {
                type: String,
            },
        },
        subscriber_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        status: {
            type: String,
            enum: [
                "new",
                "accepted",
                "scheduled",
                "completed",
                "cancelled",
                "rejected",
            ],
            default: "new",
        },
        order_id: {
            type: String,
            required: true,
        },
        payment_type: {
            type: String,
            enum: ["pre", "post", "NA"],
            default: "NA",
        },
        cancelled_by: {
            type: String,
            enum: ["patient", "Dental", "Optical", "Paramedical-Profession", "Laboratory-Imaging", "NA"],
            default: "NA",
        },
        request_type: {
            type: String,
            enum: [
                "order_request",
                "medicine_price_request",
                "medicine_availability_request",
                "NA",
            ],
            default: "NA",
        },
        insurance_verified: {
            type: Boolean,
            default: false
        },
        insurance_no: {
            type: String,
            default: null
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
        service: {
            type: String,
            default: null
        },
    order_schedule_confirm: {
            type: Boolean, default: false
            // 0 - false 1-true
        },
        order_complete: {
            type: String,
            default: false
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

export default mongoose.model("OrderDetail", orderDetailSchema);
