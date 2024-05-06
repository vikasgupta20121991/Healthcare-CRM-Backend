import mongoose from "mongoose";

const mediClaimCommonInfoSchema = new mongoose.Schema(
    {
        patientId: {
            type: String,
        },
        ePrescriptionNumber: {
            type: String,
        },
        insuranceId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        pharmacy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"PortalUser"
        },
        pharmacy_name: {
            type: String,
            default:""
        },
        pre_auth_reclaim: {
            type: Boolean,
            default: false
        },
        created_by: {
            type: String,
        },
        healthPlanId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        claimType: {
            type: String,
            enum: [
                "medicine",
                "medicalConsultation",
                "hospitalization",
            ],
        },
        claimNumber: {
            type: String,
            // required: true,
        },
        requestType: {
            type: String,
            // required: true,
            enum: [
                "pre-auth",
                "medical-products",
            ],
        },
        claimId: {
            type: String,
            required: true,
            unique: true
        },
        service: {
            type: String,
        },
        previewtemplate: {
            type: String,
        },
        insurerType: {
            type: String,
            enum: [
                "primaryInsurer",
                "secondaryInsurer",
            ],
        },
        primaryInsuredIdentity: [
            {
                fieldName: {
                    type: String,
                },
                fieldValue: {
                    type: String,
                },
            }
        ],
        secondaryInsuredIdentity: [
            {
                fieldName: {
                    type: String,
                },
                fieldValue: {
                    type: String,
                },
            }
        ],
        accidentRelatedField: [
            {
                fieldName: {
                    type: String,
                },
                fieldValue: {
                    type: String,
                },
            }
        ],
        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "resubmit",
                "pre-auth",
            ],
            default: "pending",
        },
        resubmit: {
            isClaimResubmitted: {
                type: Boolean,
                default: false
            },
            resubmittedBy: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            resubmitReason: {
                type: String
            },
        },
        deliverCenterInfo: {
            deliverCenter: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            deliverFirstName: {
                type: String
            },
            deliverMiddleName: {
                type: String
            },
            deliverLastName: {
                type: String
            },
            deliverTitle: {
                type: String
            },
            deliverTitleId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            }
        },
        prescriberCenterInfo: {
            prescriberCenter: {
                type: String
            },
            prescriberFirstName: {
                type: String
            },
            prescriberMiddleName: {
                type: String
            },
            prescriberLastName: {
                type: String
            },
            prescriberTitle: {
                type: String
            },
            prescriberSpecialty: {
                type: String
            },
        },
        for_added_insurance_staff: [
            {
                insurance_staff_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null
                }
            }
        ],
        totalCoPayment: {
            type: String,
            default: null
        },
        totalApprovedAmountByCFO: {
            type: String,
            default: null
        },
        totalApprovedAmountByContractAdvisor: {
            type: String,
            default: null
        },
        totalRequestedAmount: {
            type: String,
            default: null
        },
        claimComplete: {
            type: Boolean,
            default: false
        },
        totalCostOfAllMedicine: {
            type: String,
            default: null
        },
        for_current_insurance_staff_role: {
            type: String,
            default: "Receptionist"
        },
        is_approved_by_receptionist: {
            type: Boolean,
            default: null
        },
        is_approved_by_medical_advisor: {
            type: Boolean,
            default: null
        },
        is_approved_by_contract_advisor: {
            type: Boolean,
            default: null
        },
        is_approved_by_cfo: {
            type: Boolean,
            default: null
        },
        insurance_company_name: {
            type: String,
            default: null
        },
        subscriber_insurance_id: {
            type: String,
            default: null
        },
        subscriber_name: {
            type: String,
            default: null
        },
        for_current_insurance_staff: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        reimbursmentRate: {
            type: String
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
        eSignature: {
            fullName: {
                type: String
            },
            date: {
                type: String
            },
            time: {
                type: String
            },
            signature: {
                type: String
            },
            signature_signed_url: {
                type: String,
                default:""
            }
        },
    },
    { timestamps: true }
);

export default mongoose.model("MediClaimCommonInfo", mediClaimCommonInfoSchema);
