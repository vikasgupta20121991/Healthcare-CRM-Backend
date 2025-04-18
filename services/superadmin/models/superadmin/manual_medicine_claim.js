import mongoose, { Mongoose, now, Schema } from "mongoose";
const manualMedicineClaimData = new mongoose.Schema(
    {
        dateofFilling: {
            type: Date,
            required:true
        },
        referenceofFile: {
            type: String,
        },
        pharmacyName: {
            type: String,
            required:true
        },
        pharmacyMobile: {
            type: String,
        },
        pharmacyEmail: {
            type: String,
        },
        dateofClaimSubmittion: {
            type: Date,
            required:true
        },
        invoiceDate: {
            type: Date,
            required:true
        },
        invoiceNumber: {
            type: String,
            required:true
        },
        claimNumber: {
            type: String,
           
        },
        insuranceCompany: {
            type: String,
            required:true
        },
        expectedPaymentDate: {
            type: Date,
        },
        dateOfPayment: {
            type: Date,
        },
        methodOfPayment: {
            type: String,
        },
        requestedAmount: {
            type: Number,
        },
        approvedAmount: {
            type: Number,
        },
        rejectedAmount: {
            type: Number,
        },
        paidbytheInsured: {
            type: Number,
        },
        reasonOfRejecting: {
            type: String,
        },
    comments: {
            type: String,
        },
        externalReimbursement:{
            type:Number
        },
        createdBy:{
            type:mongoose.Schema.Types.ObjectId,
            required:true
        },
        isDeleted:{
            type:Boolean,
            default:false
        }
    },
    { timestamps: true }
);
export default mongoose.model("manualMedicineClaimData", manualMedicineClaimData);
