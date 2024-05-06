import mongoose, { Schema } from "mongoose";

const hospitalDetailSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            require:true
        },
        hospitalUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "hospitalusers",
        },
        hospitalName: {
            type: String,
        },
        hospitalType: {
            type: String,
            enum: [
                'University Hospital (CHU)',
                'Regional Hospital Center (CHR)',
                'District Hospital',
                'Medical Centre (CM)',
                'Medical Centre with Surgical Unit (CMA)',
                'Health and Social Promotion Centre (CSPS)',
                'Clinic',
                'Polyclinic',
                'Medical Practice',
                'Other'
            ],
            required:true
        },
        officePhoneNumber: {
            type: String,
        },
        mobilePhoneNumber: {
            type: String,
        },
        categoryPhoneNumber: [{
            type: String
        }],
        address: {
            type: String,
        },
        region: {
            type: String,
        },
        province: {
            type: String,
        },
        department: {
            type: String,
        },
        country: {
            type: String,
        },
        state: {
            type: String,
        },
        city: {
            type: String,
        },
        pincode: {
            type: String,
        },
        about: {
            type: String
        },
        hospitalSlogan: {
            type: String
        },
        insuranceAccepted: {
            type: Boolean
        },
        insuranceCompanyName: [{
                type:String
        }],
        paramedicalMedicalActPerformed: [{
            type:String
        }],
        medicalActPerformed: [{
            type:String
        }],
        hospitalLogo: {
            type: String
        },
        bankDetails: {
            bankName: {
                type: String
            },
            accountHolderName: {
                type: String
            },
            accountNumber: {
                type: String
            },
            ifsc: {
                type: String
            },
            address: {
                type: String
            },
        },
        mobilePayDetails: [{
            mobileProvider: {
                type: String
            },
            moilePayNumber: {
                type: String
            }
        }],
        immunization: [{
            immunizationName: {
                type: String
            },
            manufacturedName: {
                type: String
            },
            medicalCentre: {
                type: String
            },
            batchNumber: {
                type: String
            },
            nextImmunizationAppoinment: {
                type: String
            },
            administeredDate: {
                type: String
            },
            routeOfAdministered: {
                type: String
            },
            hcpProvidedImmunization: {
                type: String
            },
            allowToExportOrTransmitTheImmunizationReport: {
                type: String
            },
        }]
    },
    {
        timestamps: {
            type: Date,
            default: Date.now
        }
    }
);

export default mongoose.model("HospitalDetail", hospitalDetailSchema);