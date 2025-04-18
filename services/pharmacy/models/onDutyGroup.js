import mongoose, { Mongoose, now, Schema } from "mongoose";


const OnDutyGroupSchema = new mongoose.Schema(
  {
        onDutyGroupNumber: {
            type: String,
        },
        city: {
            type: mongoose.Types.ObjectId,
            ref: "City"
        },
        datetimeArray: [
            {
                from_date_timestamp: {
                    type: Date
                },
                to_date_timestamp: {
                    type: Date
                },
            }
        ],

        date_of_creation: {
            type: String,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
        createdBy:{
            type: mongoose.Types.ObjectId,
            required:false
        }
    },
    { timestamps: true }
);
export default mongoose.model("OnDutyGroup", OnDutyGroupSchema);
