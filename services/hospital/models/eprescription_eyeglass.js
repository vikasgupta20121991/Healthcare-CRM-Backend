import mongoose from "mongoose";

const eprescriptionEyeglassSchema = new mongoose.Schema(
    {
        ePrescriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Eprescription",
        },
        eyeglassId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        eyeglass_name: {
            type: String
        },
        left_eye: {
            sphere:{
                type:Number
            },
            cylinder:{
                type:Number
            },
            axis:{
                type:Number
            },
            addition:{
                type:Number
            },
        },
        right_eye: {
            sphere:{
                type:Number
            },
            cylinder:{
                type:Number
            },
            axis:{
                type:Number
            },
            addition:{
                type:Number
            },
        },
        treatments:[],
        comment:{
            type:String
        },
        visual_acuity:{
            left_eye:{
                type:String
            },
            right_eye:{
                type:String
            },
        }
    },
    { timestamps: true }
);

export default mongoose.model("EprescriptionEyeglass", eprescriptionEyeglassSchema);
