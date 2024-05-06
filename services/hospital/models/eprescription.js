import mongoose from "mongoose";

const eprescriptionSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Appointment",
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            
        },
        ePrescriptionNumber: {
            type: String
        },
        patientBiometric: {
            height: {
                type: Number
            },
            weight: {
                type: Number
            },
            bmi: {
                type: Number
            },
            bmiInterpreter: {
                type: Number
            },
        },
        liverFailure: {
            type: String
        },
        renalFailure: {
            type: String
        },
        allergies: [],
        medicalHistory: {
            medicineType:{
                type:String
            },
            frequency:{
                type:String
            },
        },
        accidentRelated: {
            type: Boolean,
            default: false
        },
        occupationalDesease: {
            type: Boolean,
            default: false
        },
        freeOfCharge: {
            type: Boolean,
            default: false
        },
        isValidate: {
            type: Boolean,
            default:false
        },
        eSignature: {
            type: String,
            default:null
        },
        previewTemplate: {
            type: String,
            default:null
        },
        previewTemplateSigendUrl: {
            type: String,
            default:null
        },
        


    },
    { timestamps: true }
);

export default mongoose.model("Eprescription", eprescriptionSchema);
