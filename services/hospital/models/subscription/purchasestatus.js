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
            type: String,
            default: null
        },
        expiry_date: {
            type: Date,
            default: null
        },
        status: {
            type: String,
        },
        for_user: {
            type: String,
        },
        order_type:{
            type: String,
        },
        payment_mode: {
            type: String,
        },
        transaction_id: {
            type: String,
            default: null,
        },
        mobile_pay_number: {
            type: String,
            default:''
        },
    },
    { timestamps: true }
);

export default mongoose.model("SubscriptionPurchaseStatus", purchaseStausSchema);