import mongoose, { Mongoose, now, Schema } from "mongoose";

const medicineSchema = new mongoose.Schema(
    {
        medicine: {
            number: {
                type: String
            },
            medicine_class: {
                type: String
            },
            medicine_name: {
                type: String
            },
            inn: {
                type: String
            },
            dosage: {
                type: String
            },
            pharmaceutical_formulation: {
                type: String
            },
            administration_route: {
                type: String
            },
            therapeutic_class: {
                type: String
            },
            manufacturer: {
                type: String
            },
            condition_of_prescription: {
                type: String
            },
            other: {
                type: String
            },
            link: {
                type: String
            },
            status: {
                type: Boolean
            },
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        isNew: {
            type: Boolean,
            default: false
        },
        for_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Superadmin"
        },
        type:{
            type:String,
            default:'Superadmin'
        },
        added_by:{
            type: mongoose.Schema.Types.ObjectId,
        }
    },
    { timestamps: true }
);
// medicineSchema.index({'medicine.medicine_name':1, 'medicine.dosage':1}, { unique: true })
export default mongoose.model("Medicine", medicineSchema);
