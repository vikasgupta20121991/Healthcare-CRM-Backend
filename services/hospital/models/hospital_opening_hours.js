import mongoose from "mongoose";

const hospitalOpeningHoursSchema = new mongoose.Schema(
    {
        week_days: [
            {
                sun: {
                    start_time: {
                        type: String
                    },
                    end_time: {
                        type: String
                    }
                },
                mon: {
                    start_time: {
                        type: String
                    },
                    end_time: {
                        type: String
                    }
                },
                tue: {
                    start_time: {
                        type: String
                    },
                    end_time: {
                        type: String
                    }
                },
                wed: {
                    start_time: {
                        type: String
                    },
                    end_time: {
                        type: String
                    }
                },
                thu: {
                    start_time: {
                        type: String
                    },
                    end_time: {
                        type: String
                    }
                },
                fri: {
                    start_time: {
                        type: String
                    },
                    end_time: {
                        type: String
                    }
                },
                sat: {
                    start_time: {
                        type: String
                    },
                    end_time: {
                        type: String
                    }
                },
            }
        ],
        open_date_and_time: [
            {
                start_time_with_date: {
                    type: Date
                },
                end_time_with_date: {
                    type: Date
                }
            }
        ],
        close_date_and_time: [
            {
                start_time_with_date: {
                    type: Date
                },
                end_time_with_date: {
                    type: Date
                }
            }
        ],
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("HospitalOpeningHours", hospitalOpeningHoursSchema);
