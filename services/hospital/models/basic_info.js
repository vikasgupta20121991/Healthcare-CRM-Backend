import mongoose from "mongoose";

const basicInfoSchema = new mongoose.Schema(
    {
        first_name: {
            type: String,
        },
        middle_name: {
            type: String,
        },
        last_name: {
            type: String,
        },
        full_name: {
            type: String,
        },
        dob: {
            type: String,
        },
    designation: {
            type: String,
        },
        title: {
            type: String,
        },
        years_of_experience: {
            type: String,
        },
        assign_doctor: {
            type: Array,
        },
        assign_staff: {
            type: Array
        },
        gender: {
            type: String,
        },
        spoken_language: {
            type: Array,
        },
        profile_picture: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DocumentInfo',
            default: null
        },
        urgent_care_service: {
            type: Boolean,
            default: false
        },
        about: {
            type: String,
        },
        license_details: {
            license_number: {
                type: String,
            },
            license_expiry_date: {
                type: Date,
            },
            image: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'DocumentInfo',
                default: null
            },
            image_url: {
                type: String,
                default: null
            }
        },
        team: {
            type: mongoose.Schema.Types.ObjectId,
            default:null
        },
        // speciality: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: 'Specialty',
        //     default: null
        // },
        speciality: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Specialty',
                default: null
            }
        ],
        services: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            default: null
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            default: null
        },
        unit: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            default: null
        },
        expertise: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Expertise',
            default: null
        },
        medical_act_performed: {
            type: Array,
        },
        lab_test_performed: {
            type: Array,
        },
        imaging_performed: {
            type: Array,
        },
        vaccination_performed: {
            type: Array,
        },
        other_test: {
            type: Array,
        },
        main_phone_number: {
            type: String,
        },
        insurance_accepted: {
            type: Array,
            default: []
        },
        verify_status: {
            type: String,
            default: "PENDING",
            enum: ["PENDING", "APPROVED", "DECLINED"],
        },
        approved_at: {
            type: String,
            default: null
        },
        approved_or_rejected_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",
            default: null
        },
        in_location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LocationInfo",
        },
        in_bank: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BankDetail",
        },
        in_mobile_pay: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MobilePay",
        },
        in_education: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EducationalDetail",
            default: null
        },
        in_hospital_location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HospitalLocation",
            default: null
        },
        in_availability: {
            type: Array,
            default: []
        },
        accepted_appointment: [{
            type: String,
            enum: ["ONLINE", "FACE_TO_FACE", "HOME_VISIT"]
        }],
        in_fee_management: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FeeManagement",
            default: null
        },
        in_document_management: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DocumentManagement",
            default: null
        },
        unavailability_date_array: {
            type: Array,
            default: []
        },
        unavailability_day_array: {
            type: Array,
            default: []
        },
        nextAvailableDate:{
            type:String,
            default:null
        },
        nextAvailableSlot:{
            type:String,
            default:null
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",

        },
        for_hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",

        },
        for_hospitalIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",

        }],
        for_hospitalIds_temp: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",

        }],
        isInfoCompleted: {
            type: Boolean,
            default: false
        },
        appointment_accepted:{
            online: {
                type: Boolean,
                default: true
            },
            homevisit: {
                type: Boolean,
                default: true
            },
            hospitalvisit: {
                type: Boolean,
                default: true
            },
        }
    },
    { timestamps: true }
);

export default mongoose.model("BasicInfo", basicInfoSchema);
