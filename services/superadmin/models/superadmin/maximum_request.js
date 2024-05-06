import mongoose, { Mongoose, now, Schema } from "mongoose";
const maximumRequestSchema = new mongoose.Schema(
    {
        pharmacy: {
            medicine_availability_request: {
                type: Number,
            },
        },
        hospital_doctor: {
            medicine_availability_request: {
                type: Number,
            },
            medicine_price_request: {
                type: Number,
            },
            order_medicine: {
                type: Number,
            },
        },
        individual_doctor: {
            medicine_availability_request: {
                type: Number,
            },
            medicine_price_request: {
                type: Number,
            },
            order_medicine: {
                type: Number,
            },
        },
        patient: {
            medicine_availability_request: {
                type: Number,
            },
            medicine_price_request: {
                type: Number,
            },
            order_medicine: {
                type: Number,
            },
        },
        dental: {
            availability_request: {
                type: Number,
            },
            price_request: {
                type: Number,
            },
            order_request: {
                type: Number,
            },
        },
        optical: {
            availability_request: {
                type: Number,
            },
            price_request: {
                type: Number,
            },
            order_request: {
                type: Number,
            },
        },
        labimg: {
            availability_request: {
                type: Number,
            },
            price_request: {
                type: Number,
            },
            order_request: {
                type: Number,
            },
        },
        para: {
            availability_request: {
                type: Number,
            },
            price_request: {
                type: Number,
            },
            order_request: {
                type: Number,
            },
        },
        superadmin_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Superadmin",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        }
    },
    { timestamps: true }
);
export default mongoose.model("MaximumRequest", maximumRequestSchema);
