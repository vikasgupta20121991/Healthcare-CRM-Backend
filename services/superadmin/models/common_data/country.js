import mongoose from "mongoose";

const CountrySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            unique: true
        },
        country_code: {
            type: String,
        },
        iso_code: {
            type: String,
        },
        is_deleted: {
            type: Boolean, default: false
        },
        createdBy:{
            type: mongoose.Schema.Types.ObjectId,
            required :false
        }


    },
    { timestamps: true }
);
export default mongoose.model("Country", CountrySchema);