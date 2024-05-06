import mongoose from "mongoose";

const eprescriptionMedicineDosageSchema = new mongoose.Schema(
    {
        ePrescriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Eprescription",
        },
        medicineId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        portalId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        medicine_name: {
            type: String
        },
        dose_no: {
            type: Number
        },
        frequency: {
            frequency_type: {
                type: String,
                default: null,
                enum: [null, 'Moment', 'Recurrence', 'Alternate_Taking']
            },
            morning: {
                type: Number,
                default: 0
            },
            midday: {
                type: Number,
                default: 0
            },
            evening: {
                type: Number,
                default: 0
            },
            night: {
                type: Number,
                default: 0
            },
            medicine_quantity: {
                type: Number,
                default: 0
            },
            every_quantity: {
                type: Number,
                default: 0
            },
            type: {
                type: String,
                default: null,
                enum: [null, 'Days', 'Weeks', 'Month', 'Minutes', 'Hours']
            }
        },

        take_for: {
            quantity: {
                type: Number,
                default: 0
            },
            type: {
                type: String,
                default: null,
                enum: [null, 'Days', 'Weeks', 'Month']
            }
        },
        quantities: {
            quantity_type: {
                type: String,
                default: null,
                enum: [null, 'Enough_Quantity', 'Exact_Quantity']
            },
            quantity: {
                type: Number,
                default: 0
            },
            type: {
                type: String,
                default: null,
                enum: [null, 'Days', 'Weeks', 'Month', 'Pack', 'Unit']
            },
            
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

export default mongoose.model("EprescriptionMedicineDosage", eprescriptionMedicineDosageSchema);
