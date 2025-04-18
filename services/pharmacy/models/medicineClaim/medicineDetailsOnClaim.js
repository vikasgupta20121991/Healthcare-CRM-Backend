import mongoose from "mongoose";

const medicineDetailsOnClaimSchema = new mongoose.Schema(
    {
        
        medicineId: {
            type: String,
        },
        medicineName: {
            type: String,
        },
    quantityPrescribed: {
            type: String,
        },
        quantityDelivered: {
            type: String,
        },
        frequency: {
            type: String,
        },
        duration: {
            type: String,
        },
        pricePerUnit: {
            type: String,
        },
        coPayment: {
            type: String,
        },
        requestAmount: {
            type: String,
        },
        totalCost: {
            type: String,
        },
        comment: {
            type: String,
        },
        receptionist: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            isApproved: {
                type: Boolean,
                default: null
            },
            comment: {
                type: String,
                default: null
            },
        },
        medicalAdvisor: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            isApproved: {
                type: Boolean,
                default: null
            },
            comment: {
                type: String,
                default: null
            },
            reSubmit: {
                type: Boolean,
                default: null
            },
        },
        contractAdvisor: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            isApproved: {
                type: Boolean,
                default: null
            },
            comment: {
                type: String,
                default: null
            },
            approvedAmount: {
                type: String,
                default: null
            },
        },
        cfo: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            isApproved: {
                type: Boolean,
                default: null
            },
            comment: {
                type: String,
                default: null
            },
            approvedAmount: {
                type: String,
                default: null
            },
        },
        totalCoPayment: {
            type: String,
        },
        totalRequestedAmount: {
            type: String,
        },
        totalCostOfAllMedicine: {
            type: String,
        },
        for_medicine_claim: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "MediClaimCommonInfo",
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("MedicineDetailsOnClaim", medicineDetailsOnClaimSchema);
