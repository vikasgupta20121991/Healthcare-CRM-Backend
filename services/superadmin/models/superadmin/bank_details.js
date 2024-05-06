import mongoose, { Mongoose, now, Schema } from "mongoose";
const paymentDetailsSchema = new mongoose.Schema(
    {
        bank_name: {
            type: String,
        },
        bank_account_holder_name: {
            type: String,
        },
        bank_account_number: {
            type: String,
        },
        bank_ifsc_code: {
            type: String,
            default:"+91"
        },
        bank_address: {
            type: String,
        },
        mobilepay_provider_name: {
            type: String,
        },
        mobilepay_number: {
            type: String,
        }
    },
    { timestamps: true }
);
export default mongoose.model("BankPaymentDetails", paymentDetailsSchema);
