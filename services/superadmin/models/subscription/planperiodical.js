import mongoose from "mongoose";

const PlanPeriodicalSchema = new mongoose.Schema(
  {
    name: {
        type: String,
    },
    value: {
        type: String,
    }
  },
  { timestamps: true }
);
export default mongoose.model("PlanPeriodical", PlanPeriodicalSchema);