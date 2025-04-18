import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
    {
        assessments: [
            {
                question_id: {
                    type: String
                },
                question: {
                    type: String
                },
                answer: {
                    type: Array,
          default: null,
                },
            }
        ],
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
      require: true,
            ref: "Appointment",
        },
    },
    { timestamps: true }
);

export default mongoose.model("Assessment", assessmentSchema);
