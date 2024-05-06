import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
    {
        loginId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
        hospital_details: {
            hospital_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "PortalUser",
            },
            hospital_name: {
                type: String,
            },
            hospital_loc: {}
        },
        madeBy: {
            type: String,
            enum: ['patient', 'INDIVIDUAL_DOCTOR', 'INDIVIDUAL_DOCTOR_STAFF', 'HOSPITAL_STAFF', 'HOSPITAL_DOCTOR'],
        },
        order_id: {
            type: String,
            required: true
        },
        appointmentType: {
            type: String,
            enum: ["ONLINE", "FACE_TO_FACE", "HOME_VISIT"]
        },
        reasonForAppointment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ReasonForAppointment',
        },
        consultationFee: {
            type: String,
        },
        consultationDate: {
            type: String,
        },
        consultationTime: {
            type: String,
        },
        consultationFor: {
            type: String
        },
        consultationUserType: {
            type: String,
        },
        consultationData: {
            type: String,
        },
        ANSJSON: {
            type: String,
        },
        templateJSON: {
            type: String,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PortalUser',
            default: null
        },
        cancelReason: {
            type: String,
            default: null
        },
        cancelledOrAcceptedBy: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        cancel_by: {
            type: String,
            enum: ['patient', 'doctor'],
        },
        rescheduled_by: {
            type: String,
            enum: ['patient', 'doctor'],
        },
        rescheduled_by_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        patientDetails: {
            patientId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            patientFullName: {
                type: String,
                default: ""
            },
            patientFirstName: {
                type: String,
                default: ""
            },
            patientMiddleName: {
                type: String,
                default: ""
            },
            patientLastName: {
                type: String,
                default: ""
            },
            patientMobile: {
                type: String,
                default: ""
            },
            mobile: {
                type: String,
                default: ""
            },
            patientEmail: {
                type: String,
                default: ""
            },
            insuranceNumber: {
                type: String,
                default: null
            },
            patientDob: {
                type: String,
                default: null
            },
            gender: {
                type: String,
                default: '',
                enum: [
                    "Male",
                    "Female",
                    "Other"
                ],
            },
            address: {
                type: String
            },
            loc:
            {
                lat: {
                    type: Number,

                },
                long: {
                    type: Number
                }
            }
        },
        paymentDetails: {
            type: Object,
            default: null
        },
        assigned_staff: [{
            type: mongoose.Schema.Types.ObjectId,
            default: null
        }],
        docDetails: [
            {
                doc_id: {
                    type: mongoose.Schema.Types.ObjectId,
                },
                date: {
                    type: String,
                },
            }
        ],
        paymentType: {
            type: String,
            default: "NA",
            enum: [
                "NA",
                "pre-payment",
                "post-payment"
            ],
        },
        paymentMode: {
            type: String,
            default: "NA",
            enum: [
                "NA",
                "stripe",
                "mobileMoney"
            ],
        },
        isPaymentDone: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            default: "NA",
            enum: [
                "NA",
                "NEW",
                "REJECTED",
                "APPROVED",
                "PAST",
                "MISSED",
            ],
        },
        users: [
            {
                user_id: {
                    type: mongoose.Schema.Types.ObjectId,
                },
                name: {
                    type: String,
                },
                image: {
                    type: String,
                },
            }
        ],
        participants: [{
            userId: { type: mongoose.Schema.Types.ObjectId },
            userName: { type: String },
            userImage: { type: String },
            userIdentity: { type: String },
            isAudioMuted: { type: Boolean, default: false },
            isVideoMuted: { type: Boolean, default: false }
        }],
        chatmessage: [{
            senderId: { type: mongoose.Schema.Types.ObjectId },
            message: { type: String },
            receiver: [{
                id: { type: mongoose.Schema.Types.ObjectId },
                read: { type: Boolean, default: true }
            }],
            createdAt: {type: Date}
        }],
        callstatus: {
            type: String,
        },
        roomName: { type: String },
        callerId: { type: mongoose.Schema.Types.ObjectId },
        roomDate: {
            type: Date
        },
        isPrescriptionValidate: {
            type: Boolean,
            default: false
        },
        appointment_complete: {
            type: String,
            default: false
        }
    },
    { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
