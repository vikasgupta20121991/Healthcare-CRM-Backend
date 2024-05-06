import mongoose, { Schema } from "mongoose";

const purchaseStausSchema = new mongoose.Schema(
    {
        subscription_plan_name: {
            type: String,
        },
        invoice_number: {
            type: String,
        },
        plan_price: {
            type: String,
        },
        services:{
            type:Array,
            default:null
        },
        currency_code: {
            type: String,
        },
        plan_type: {
            type: String
        },
        expiry_date: {
            type: Date,
            default:null
        },
        status: {
            type: String,
        },
        payment_mode: {
            type: String,
        },
        payment_type: {
            type: String,
        },
        order_id: {
            type: String,
            default: null,
        },
        transaction_id: {
            type: String,
            default: null,
        },
        for_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",
        },
        order_type:{
            type: String,
        },
        portal_type: {
            type: String,            
            enum: [
                "",
              "Paramedical-Professions",
              "Dental",
              "Laboratory-Imaging",
              "Optical"
            ],
        },
        mobile_pay_number: {
            type: String,
            default:''
        },
    },
    { timestamps: true }
);

export default mongoose.model("SubscriptionPurchaseStatus", purchaseStausSchema);