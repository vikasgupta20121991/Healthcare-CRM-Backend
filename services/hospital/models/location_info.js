import mongoose from "mongoose";
const geoJsonSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            default: "Point"
        },
        coordinates: {
            type: [Number],
            index: "2dsphere",
            default: [0, 0]
        }
    }
)


const locationInfoSchema = new mongoose.Schema(
    {
        loc: geoJsonSchema,
        address: {
            type: String,
            default: null
        },
        neighborhood: {
            type: String,
            default: null
        },
        country: {
            type: mongoose.Schema.Types.ObjectId,
            // required: true,
            ref: "countries",
            default: null
        },
        region: {
            type: mongoose.Schema.Types.ObjectId,
            // required: true,
            ref: "regions",
            default: null
        },
        province: {
            type: mongoose.Schema.Types.ObjectId,
            // required: true,
            ref: "provinces",
            default: null
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            // required: true,
            ref: "departments",
            default: null
        },
        city: {
            type: mongoose.Schema.Types.ObjectId,
            // required: true,
            ref: "cities",
            default: null
        },
        village: {
            type: mongoose.Schema.Types.ObjectId,
            // required: true,
            // ref: "villages",
            default: null
        },
        pincode: {
            type: String,
            default: null
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("LocationInfo", locationInfoSchema);
