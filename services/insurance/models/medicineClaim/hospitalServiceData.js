import mongoose from "mongoose";

const hospitalServiceData = new mongoose.Schema(
    {
        claimObjectId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        pregnancyRelated: {
            type: String,
        },
        reasonOfHopitalization: {
            type: String,
        },
        reasonOfHopitalizationExtension: {
            type: String,
        },
        reasonOfFinalHopitalization: {
            type: String,
        },
        provisionalDiagnosis: {
            type: String,
        },
        updateDiagnosis: {
            type: String,
        },
        finalDiagnosis: {
            type: String,
        },
        fromHospitalizationDate: {
            type: Date,
        },
        fromHospitalizationExtensionDate: {
            type: Date,
        },
        fromHospitalizationExtensionTime: {
            type: String,
        },
        fromFinalHospitalizationTime: {
            type: String,
        },
        fromFinalHospitalizationDate: {
            type: Date,
        },
        fromHospitalizationTime: {
            type: String,
        },
        toHospitaldate: {
            type: Date,
        },
        toHospitalExtensiondate: {
            type: Date,
        },
        toHospitaltime: {
            type: String,
        },
        toHospitalExtensiontime: {
            type: String,
        },
        toFinalHospitaldate: {
            type: Date,
        },
        toFinalHospitaltime: {
            type: String,
        },
        numberOfNights: {
            type: String,
        },
        hospitalizatinDetails: {
            type: String,
        },
        hospitalizatinExtensionDetails: {
            type: String,
        },
        hospitalizationFinalDetails: {
            type: String,
        },
        requestType: {
            type: String,
        },
        comment: {
            type: String,
        },
        FinalComment: {
            type: String,
        },
        extensionComment: {
            type: String,
        },
        hospitalizationCategory: {
            type: String,
        },
        fromPreauthDate: {
            type: Date,
        },
        fromPreauthTime: {
            type: String,
        },
        toPreauthdate: {
            type: Date,
        },
        toPreauthtime: {
            type: String,
        },
        PreauthDetails: {
            type: String,
        },
        provisionalDiagnosisPreauth: {
            type: String,
        },
        reasonOfPreauth: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("hospitalServiceData", hospitalServiceData);
