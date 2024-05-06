"use strict";

// models
import HospitalAdminInfo from "../models/hospital_admin_info";
import DocumentInfo from "../models/document_info";
import BasicInfo from "../models/basic_info"
import DoctorAvailability from "../models/doctor_availability"
import HospitalOpeningHours from "../models/hospital_opening_hours"
import ReviewAndRating from "../models/review"
import PortalUser from "../models/portal_user"
import Appointment from "../models/appointment"
import Reminder from "../models/reminder"
import ReasonForAppointment from "../models/reason_for_appointment";
import review from "../models/review";
import moment from "moment"

// utils
import { sendResponse } from "../helpers/transmission";
import { formatDateAndTime } from "../middleware/utils"
import { getDocument } from "../helpers/s3";
import mongoose from "mongoose";
import Http from "../helpers/httpservice"
import reminder from "../models/reminder";
import { notification } from "../helpers/notification";
import specialty_info from "../models/specialty_info";
import StaffInfo from "../models/staff_info";
import profile_info from "../models/profile_info";
import PathologyTestInfoNew from "../models/pathologyTestInfoNew";
const httpService = new Http()

const getHospitalTeam = async (hospital_portal_id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const filter = {
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_portal_id)] },
                'for_portal_user.isDeleted': false,
                'for_portal_user.lock_user': false,
                'for_portal_user.isActive': true
            }
            const aggregate = [
                {
                    $lookup: {
                        from: 'portalusers',
                        localField: 'for_portal_user',
                        foreignField: '_id',
                        as: 'for_portal_user'
                    }
                },
                { $unwind: "$for_portal_user" },
                {
                    $lookup: {
                        from: 'documentinfos',
                        localField: 'profile_picture',
                        foreignField: '_id',
                        as: 'profile_picture'
                    }
                },
                { $unwind: { path: "$profile_picture", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'specialties',
                        localField: 'speciality',
                        foreignField: '_id',
                        as: 'speciality'
                    }
                },
                { $unwind: { path: "$speciality", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $project: {
                        email: "$for_portal_user.email",
                        portal_user_id: "$for_portal_user._id",
                        speciality: 1,
                        full_name: 1,
                        years_of_experience: 1,
                        profile_picture: "$profile_picture.url"
                    }
                }
            ]
            const allHospitalDoctors = await BasicInfo.aggregate(aggregate)
            let result = {
                doctorCount: allHospitalDoctors.length
            }

            let teamArray = {}
            for (const doctor of allHospitalDoctors) {
                if (doctor.speciality) {
                    let speciality_name = doctor.speciality.specilization
                    //console.log(speciality_name, "speciality_nameeeee");
                    let experience = doctor.years_of_experience
                    let doctorData = {
                        full_name: doctor.full_name,
                        experience,
                        doctor_profile: 'profile_picture' in doctor ? await getDocument(doctor.profile_picture) : '',
                        speciality: {
                            name: speciality_name,
                            id: doctor.speciality._id
                        }
                    }
                    if (speciality_name in teamArray) {
                        teamArray[speciality_name].push(doctorData)
                    } else {
                        teamArray[speciality_name] = [doctorData]
                    }
                }

            }
            result.our_team = teamArray
            resolve(result)
        } catch (error) {
            console.log(error);
            resolve({
                doctorCount: 0,
                our_team: {}
            })
        }
    })
}
const getDoctorOpeningsHours = async (week_days) => {
    var Sunday = []
    var Monday = []
    var Tuesday = []
    var Wednesday = []
    var Thursday = []
    var Friday = []
    var Saturday = []
    if (week_days) {
        week_days.forEach((data) => {
            Sunday.push({
                "start_time": data.sun_start_time.slice(0, 2) + ":" + data.sun_start_time.slice(2, 4),
                "end_time": data.sun_end_time.slice(0, 2) + ":" + data.sun_end_time.slice(2, 4)
            })
            Monday.push({
                "start_time": data.mon_start_time.slice(0, 2) + ":" + data.mon_start_time.slice(2, 4),
                "end_time": data.mon_end_time.slice(0, 2) + ":" + data.mon_end_time.slice(2, 4)
            })
            Tuesday.push({
                "start_time": data.tue_start_time.slice(0, 2) + ":" + data.tue_start_time.slice(2, 4),
                "end_time": data.tue_end_time.slice(0, 2) + ":" + data.tue_end_time.slice(2, 4)
            })
            Wednesday.push({
                "start_time": data.wed_start_time.slice(0, 2) + ":" + data.wed_start_time.slice(2, 4),
                "end_time": data.wed_end_time.slice(0, 2) + ":" + data.wed_end_time.slice(2, 4)
            })
            Thursday.push({
                "start_time": data.thu_start_time.slice(0, 2) + ":" + data.thu_start_time.slice(2, 4),
                "end_time": data.thu_end_time.slice(0, 2) + ":" + data.thu_end_time.slice(2, 4)
            })
            Friday.push({
                "start_time": data.fri_start_time.slice(0, 2) + ":" + data.fri_start_time.slice(2, 4),
                "end_time": data.fri_end_time.slice(0, 2) + ":" + data.fri_end_time.slice(2, 4)
            })
            Saturday.push({
                "start_time": data.sat_start_time.slice(0, 2) + ":" + data.sat_start_time.slice(2, 4),
                "end_time": data.sat_end_time.slice(0, 2) + ":" + data.sat_end_time.slice(2, 4)
            })
        })
    }
    return {
        Sunday,
        Monday,
        Tuesday,
        Wednesday,
        Thursday,
        Friday,
        Saturday
    }
}
class PatientController {

    async getInsuranceAcceptedListForHosp(req, res) {
        try {
            const { hospitalId } = req.query
            console.log(hospitalId, "hospitalId____________");
            let insuranceAccepted = await HospitalAdminInfo.findOne(
                { for_portal_user: hospitalId },
                { insurance_accepted: 1 }
            );
            if (insuranceAccepted) {
                const insuranceAcceptedIds = insuranceAccepted.insurance_accepted;
                const insuranceDetailsArray = [];

                for (const id of insuranceAcceptedIds) {

                    const insuranceStaffDetails = await httpService.getStaging('insurance/get-Insurance-By-Id', { for_portal_user: id }, {}, 'insuranceServiceUrl');
                    if (insuranceStaffDetails.body) {
                        insuranceDetailsArray.push({
                            _id: id,
                            company_name: insuranceStaffDetails.body.company_name,
                            for_portal_user: insuranceStaffDetails.body.for_portal_user
                        });
                    }
                    console.log(insuranceStaffDetails, "abc abc");

                }
                // res.status(200).json({
                //     status: true,
                //     body: insuranceDetailsArray,
                //     errorCode: null,
                // });

                sendResponse(req, res, 200, {
                    status: true,
                    body: insuranceDetailsArray,
                    message: "successfully get insurance list",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: [],
                    message: "No Insurance Found",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error, "eorrorororororor123");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get insurance accepted list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceAcceptedListForDoc(req, res) {
        try {
            const { doctorId } = req.query
            console.log(doctorId, "doctorId____________");
            let insuranceAccepted = await BasicInfo.findOne(
                { for_portal_user: doctorId },
                { insurance_accepted: 1 }
            );
            if (insuranceAccepted) {
                const insuranceAcceptedIds = insuranceAccepted.insurance_accepted;
                const insuranceDetailsArray = [];

                for (const id of insuranceAcceptedIds) {

                    const insuranceStaffDetails = await httpService.getStaging('insurance/get-Insurance-By-Id', { for_portal_user: id }, {}, 'insuranceServiceUrl');
                    if (insuranceStaffDetails.body) {
                        insuranceDetailsArray.push({
                            _id: id,
                            company_name: insuranceStaffDetails.body.company_name,
                            for_portal_user: insuranceStaffDetails.body.for_portal_user
                        });
                    }
                    console.log(insuranceStaffDetails, "abc abc");

                }
                // res.status(200).json({
                //     status: true,
                //     body: insuranceDetailsArray,
                //     errorCode: null,
                // });

                sendResponse(req, res, 200, {
                    status: true,
                    body: insuranceDetailsArray,
                    message: "successfully get insurance list",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: [],
                    message: "No Insurance Found",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error, "eorrorororororor123");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get insurance accepted list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async hospitalDetailsById(req, res) {
        try {
            const { hospital_portal_id } = req.query
            console.log(req.query, "chekc 999");
            let hopitalId = mongoose.Types.ObjectId(hospital_portal_id);
            console.log(hopitalId, "hopitalId");
            const result = await HospitalAdminInfo.find({ _id: hopitalId }).populate({
                path: 'for_portal_user',
                select: {
                    email: 1,
                }
            })
            console.log(result, "check reult 555");
            let data = result[0];
            sendResponse(req, res, 200, {
                status: true,
                body: data,
                message: `Hospital admin details`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check 777");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `failed to fetched hospital admin details`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async viewHospitalAdminDetailsForPatient(req, res) {
        try {
            const { hospital_portal_id } = req.query

            const pathology_tests = await PathologyTestInfoNew.find({ for_portal_user: hospital_portal_id })

            const result = await HospitalAdminInfo.find({ for_portal_user: hospital_portal_id })
                .select({
                    association: 1,
                    hospitalPictures: 1,
                    about_hospital: 1,
                    hospital_name: 1,
                    profile_picture: 1,
                    opening_hours_status: 1,
                    patient_portal:1
                })
                .populate({
                    path: "for_portal_user",
                    select: { email: 1, country_code: 1, mobile: 1 },
                    match: { 'for_portal_user.isDeleted': false },
                })
                .populate({
                    path: 'in_location'
                })

            let data = result[0];

            // if (data.association.is_true && data.association.name.length > 0) {
            if (data.association.is_true && data.association.name && data.association.name.length > 0 && data.association.name[0] !== null) {
                const resData = await httpService.getStaging('superadmin/get-all-association-group-by-id', { associationIds: data.association.name }, {}, 'superadminServiceUrl');
                let name = []
                for (const gname of resData.data) {
                    name.push(gname.group_name);
                }
                data.association.name = name
            }

            //Opening hours status
            let status = ''
            if (data.opening_hours_status) {
                status = '24 Hrs'
            } else {
                const dayArray = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
                const todaysDate = formatDateAndTime(new Date())
                const day = dayArray[new Date().getDay()]
                const getHours = await HospitalOpeningHours.find({ for_portal_user: { $eq: hospital_portal_id } })
                const getWeekDaysValue = getHours
                // let openTime
            }
            //console.log(data.hospitalPictures,"hospitalPicturess11____");

            let hospitalPicture = []

            if (data.hospitalPictures.length > 0) {
                for (const picture of data.hospitalPictures) {
                    let image = await getDocument(picture)
                    hospitalPicture.push(image)
                }
                const profile = await getDocument(data.profile_picture)
                data.profile_picture = profile
                delete data.hospitalPictures
                data.hospitalPictures = hospitalPicture
            } else {
                data.hospitalPictures = hospitalPicture;
            }
            //Hospital Rating
            // const resData = await httpService.getStaging('patient/get-review-and-rating', { portal_user_id: hospital_portal_id, page: 1, limit: 10 }, {}, 'hospitalServiceUrl');
            const resData = await httpService.getStaging('patient/get-review-and-rating', { portal_user_id: hospital_portal_id, page: 1, limit: 10, reviewBy: 'patient' }, {}, 'hospitalServiceUrl');
            //Get Doctors count and group them by specialization
            const hospitalDoctor = await getHospitalTeam(hospital_portal_id)
            //Get Accepted Insurance company
            console.log(data.for_portal_user._id, "for_portal_user____________");
            //const resData1 = await httpService.getStaging('insurance/accepted-insurance-companies', { mobile: data.for_portal_user.mobile }, {}, 'insuranceServiceUrl');
            const resData1 = await httpService.getStaging('patient/getInsuranceAcceptedListForHosp', { hospitalId: data.for_portal_user._id }, {}, 'hospitalServiceUrl');
            console.log(resData1, "resData1__________");
            sendResponse(req, res, 200, {
                status: true,
                body: { data, doctorCount: hospitalDoctor.doctorCount, hospital_rating: resData.body, our_team: hospitalDoctor.our_team, accepted_insurance_company: resData1.body, pathology_tests },
                message: `Hospital admin details`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorHosp___");

            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `failed to fetched hospital admin details`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async viewHospitalDoctorsForPatient(req, res) {
    //     try {
    //         const { hospital_portal_id, doctor_name, speciality } = req.query
    //         const filter = {
    //             'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
    //             'for_portal_user.isDeleted': false,
    //             'for_portal_user.isActive': true,
    //             'for_portal_user.lock_user': false,
    //             for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_portal_id)] }
    //         }
    //         if (doctor_name) {
    //             filter['full_name'] = { $regex: doctor_name || '', $options: "i" }
    //         }
    //         if (speciality) {
    //             filter['speciality1._id'] = mongoose.Types.ObjectId(speciality)
    //         }
    //         const aggregate = [
    //             {
    //                 $lookup: {
    //                     from: 'portalusers',
    //                     localField: 'for_portal_user',
    //                     foreignField: '_id',
    //                     as: 'for_portal_user'
    //                 }
    //             },
    //             { $unwind: "$for_portal_user" },
    //              {
    //                  $lookup: {
    //                      from: 'specialties',
    //                      localField: 'speciality',
    //                      foreignField: '_id',
    //                      as: 'speciality1'
    //                  }
    //              },
    //           //  { $unwind: { path: "$specialities", preserveNullAndEmptyArrays: true } },
    //             { $match: filter },
    //             {
    //                 $project: {
    //                     full_name: 1,
    //                     years_of_experience: 1,
    //                     profile_picture: 1,
    //                     speciality1: { $ifNull: ["$speciality1.specilization", ""] },
    //                     _id: "$for_portal_user._id"
    //                 }
    //             }
    //         ]
    //         const resultData = await BasicInfo.aggregate(aggregate)
    //         console.log(resultData, 'resultData');
    //         let result = []
    //         for (const data of resultData) {
    //             if (data.profile_picture) {
    //                 let doc = await DocumentInfo.findById(data.profile_picture);
    //                 data.profile_picture = await getDocument(doc.url)
    //             } else {
    //                 data.profile_picture = ''
    //             }
    //             result.push(data)
    //         }
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: { result },
    //             message: `Hospital doctor list`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: error,
    //             message: `failed to fetched hospital doctor`,
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async viewHospitalDoctorsForPatient(req, res) {
        try {
            const { hospital_portal_id, doctor_name, speciality } = req.query;
            const filter = {
                'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
                'for_portal_user.isDeleted': false,
                'for_portal_user.isActive': true,
                'for_portal_user.lock_user': false,
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_portal_id)] }
            }
            if (doctor_name) {
                filter['full_name'] = { $regex: doctor_name || '', $options: "i" }
            }
            if (speciality) {
                filter['speciality1._id'] = mongoose.Types.ObjectId(speciality)
            }
            const aggregate = [
                {
                    $lookup: {
                        from: 'portalusers',
                        localField: 'for_portal_user',
                        foreignField: '_id',
                        as: 'for_portal_user'
                    }
                },
                { $unwind: "$for_portal_user" },
                {
                    $lookup: {
                        from: 'specialties',
                        localField: 'speciality',
                        foreignField: '_id',
                        as: 'speciality1'
                    }
                },
                { $match: filter },
            ]

            if (speciality) {
                aggregate.push(
                    {
                        $project: {
                            full_name: 1,
                            years_of_experience: 1,
                            profile_picture: 1,
                            // speciality1: { $ifNull: ["$speciality1.specilization", ""] },
                            speciality1: {
                                $filter: {
                                    input: "$speciality1",
                                    as: "spec",
                                    cond: {
                                        $eq: ["$$spec._id", mongoose.Types.ObjectId(speciality)]
                                    }
                                }
                            },
                            _id: "$for_portal_user._id"
                        }
                    }
                )
            }
            aggregate.push(
                {
                    $project: {
                        full_name: 1,
                        years_of_experience: 1,
                        profile_picture: 1,
                        speciality1: {
                            $ifNull: ["$speciality1.specilization", ""]
                        },
                        _id: "$for_portal_user._id"
                    }
                }
            )
            const resultData = await BasicInfo.aggregate(aggregate)
            console.log(resultData, 'resultData');
            let result = []
            for (const data of resultData) {
                if (data.profile_picture) {
                    let doc = await DocumentInfo.findById(data.profile_picture);
                    data.profile_picture = await getDocument(doc.url)
                } else {
                    data.profile_picture = ''
                }
                result.push(data)
            }
            sendResponse(req, res, 200, {
                status: true,
                body: { result },
                message: `Hospital doctor list`,
                errorCode: null,
            });
        } catch (error) {
            console.log("errrrrrrrr", error)
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to fetched hospital doctor`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async viewDoctorDetailsForPatient(req, res) {
        try {
            const { doctor_portal_id } = req.query

            const pathology_tests = await PathologyTestInfoNew.find({ for_portal_user: doctor_portal_id })

            const getRole = await PortalUser.findById(doctor_portal_id).select('role')
            const filter = {
                for_portal_user: mongoose.Types.ObjectId(doctor_portal_id),
                'for_portal_user_d.isDeleted': false,
                'for_portal_user_d.lock_user': false,
                'for_portal_user_d.isActive': true
            }
            const project = {
                full_name: 1,
                years_of_experience: 1,
                profile_picture: "$profile_picture.url",
                fee_management: {
                    online: "$in_fee_management.online",
                    home_visit: "$in_fee_management.home_visit",
                    f2f: "$in_fee_management.f2f",
                },
                about: 1,
                portal_user_data: {
                    mobile: "$for_portal_user_d.mobile",
                    email: "$for_portal_user_d.email",
                    country_code: "$for_portal_user_d.country_code",
                },
                address: "$in_location.address",
                loc: '$in_location.loc',
                education_details: "$in_education.education_details",
                services: "$services.service",
                speciality: 1,
                in_availability: 1,
                nextAvailableDate: 1,
                nextAvailableSlot: 1,
                hospital_location: "$in_hospital_location.hospital_or_clinic_location",
            }
            if (getRole.role === 'INDIVIDUAL_DOCTOR') delete project.services;
            let aggregate = [
                {
                    $lookup: {
                        from: 'portalusers',
                        localField: 'for_portal_user',
                        foreignField: '_id',
                        as: 'for_portal_user_d'
                    }
                },
                { $unwind: { path: "$for_portal_user_d", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'documentinfos',
                        localField: 'profile_picture',
                        foreignField: '_id',
                        as: 'profile_picture'
                    }
                },
                { $unwind: { path: "$profile_picture", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'feemanagements',
                        localField: 'in_fee_management',
                        foreignField: '_id',
                        as: 'in_fee_management'
                    }
                },
                { $unwind: { path: "$in_fee_management", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'locationinfos',
                        localField: 'in_location',
                        foreignField: '_id',
                        as: 'in_location'
                    }
                },
                { $unwind: { path: "$in_location", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'educationaldetails',
                        localField: 'in_education',
                        foreignField: '_id',
                        as: 'in_education'
                    }
                },
                { $unwind: { path: "$in_education", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'specialties',
                        localField: 'speciality',
                        foreignField: '_id',
                        as: 'speciality'
                    }
                },
                { $unwind: { path: "$speciality", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'hospitallocations',
                        localField: 'in_hospital_location',
                        foreignField: '_id',
                        as: 'in_hospital_location'
                    }
                },
                { $unwind: { path: "$in_hospital_location", preserveNullAndEmptyArrays: true } },
            ]
            if (getRole.role === 'HOSPITAL_DOCTOR') {
                aggregate.push({
                    $lookup: {
                        from: 'services',
                        localField: 'services',
                        foreignField: '_id',
                        as: 'services'
                    }
                },
                    { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },)
            }
            aggregate.push({ $match: filter }, { $project: project })
            let resultData = await BasicInfo.aggregate(aggregate)
            console.log(resultData, "resultData_________");

            let data = {}
            for (const key in resultData[0]) {
                data[key] = resultData[0][key]
            }
            if (resultData[0].profile_picture) {
                data.profile_picture = await getDocument(resultData[0].profile_picture)
            }
            let availabilityObjectIDArray = []
            for (const id of data.in_availability) {
                availabilityObjectIDArray.push(mongoose.Types.ObjectId(id))
            }
            let availResult = await DoctorAvailability.find({ _id: { $in: availabilityObjectIDArray } })
            data.in_availability = availResult
            data.speciality = resultData[0].speciality.specilization
            data.speciality_id = resultData[0].speciality._id
            data.nextAppointmentAvailable = resultData[0].nextAvailableDate;
            data.nextAvailableSlot = resultData[0].nextAvailableSlot;
            data.onDutyToday = true
            data.doctor_portal_id = doctor_portal_id
            const portalUser = await PortalUser.findById(doctor_portal_id).select('average_rating')
            const getRatingCount = await ReviewAndRating.find({ portal_user_id: { $eq: doctor_portal_id } }).countDocuments()
            const doctor_rating = {
                average_rating: portalUser.average_rating,
                total_review: getRatingCount
            }
            //Get Accepted Insurance company
            //const resData1 = await httpService.getStaging('insurance/accepted-insurance-companies', { mobile: data.portal_user_data.mobile }, {}, 'insuranceServiceUrl');
            const resData1 = await httpService.getStaging('patient/getInsuranceAcceptedListForDoc', { doctorId: data.doctor_portal_id }, {}, 'hospitalServiceUrl');



            //Get Opening hours
            let hospital_location = []
            for (const location of data.hospital_location) {
                if (location.status == 'APPROVED') {
                    if (location.hospital_id) {
                        const getWeekDaysValue = await DoctorAvailability.find({ location_id: location.hospital_id, for_portal_user: { $eq: doctor_portal_id } }).select({ week_days: 1, appointment_type: 1 })
                        let openingHoursObject = {}
                        for (const week_days_value of getWeekDaysValue) {
                            const getData = await getDoctorOpeningsHours(week_days_value.week_days)
                            openingHoursObject[week_days_value.appointment_type] = getData
                        }
                        location.openingHours = openingHoursObject
                    } else {
                        let openingHoursObject = {
                            "ONLINE": await getDoctorOpeningsHours([]),
                            "HOME_VISIT": await getDoctorOpeningsHours([]),
                            "FACE_TO_FACE": await getDoctorOpeningsHours([])
                        }
                        location.openingHours = openingHoursObject
                    }
                    hospital_location.push(location)
                }
            }
            data.hospital_location = hospital_location
            sendResponse(req, res, 200, {
                status: true,
                body: { data, doctor_rating, accepted_insurance_company: resData1.body, pathology_tests },
                message: `doctor details`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error___________________", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `failed to fetched hospital doctor details`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async postReviewAndRating(req, res) {
        try {
            const { for_portal_user, patient_login_id, rating, comment, reviewBy, reviewTo } = req.body
            //Store Location details
            let reviewObject = { rating, comment, reviewBy, reviewTo }
            const getReview = await ReviewAndRating.find({ patient_login_id: { $eq: patient_login_id }, portal_user_id: { $eq: for_portal_user } }).select('rating');
            if (getReview.length > 0) {
                await ReviewAndRating.findOneAndUpdate({ patient_login_id: { $eq: patient_login_id }, portal_user_id: { $eq: for_portal_user } }, {
                    $set: reviewObject
                }, { new: true }).exec();
            } else {
                reviewObject.for_portal_user = for_portal_user
                reviewObject.patient_login_id = patient_login_id
                reviewObject.portal_user_id = for_portal_user
                reviewObject.reviewBy = reviewBy ? reviewBy : ''
                reviewObject.reviewTo = reviewTo ? reviewTo : ''
                const reviewData = new ReviewAndRating(reviewObject);
                await reviewData.save()
            }
            const getAllRatings = await ReviewAndRating.find({ portal_user_id: mongoose.Types.ObjectId(for_portal_user) }).select('rating')
            console.log(getAllRatings, 'getAllRatings');
            const totalCount = getAllRatings.length
            let count = 0
            for (const rating of getAllRatings) {
                count += rating.rating
            }
            console.log(count, 'count');
            const average_rating = (count / totalCount).toFixed(1);
            console.log(average_rating, 'average_rating');
            await PortalUser.findOneAndUpdate({ _id: { $eq: for_portal_user } }, {
                $set: { average_rating }
            }, { new: true }).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: `Review added successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `something went wrong to post review`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getReviewAndRating(req, res) {
        try {
            const { portal_user_id, page, limit, reviewBy, requestFrom } = req.query;

            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }

            var result;
            var filter;
            if (requestFrom == 'hospital') {
                let doctorIDs = [];
                const hospitalDoctors = await BasicInfo.find({ for_hospitalIds: { $in: portal_user_id } }, { for_portal_user: 1 });
                for (const doctor of hospitalDoctors) {
                    doctorIDs.push(doctor?.for_portal_user)
                }

                filter = { portal_user_id: { $in: doctorIDs }, reviewBy: reviewBy }
            } else if (reviewBy == ' doctor') {
                filter = { portal_user_id: { $in: portal_user_id }, reviewBy: reviewBy }
            }
            else {
                filter = { portal_user_id: { $in: portal_user_id }, reviewBy: reviewBy }

            }
            console.log("filter=====", filter);
            result = await ReviewAndRating.find(filter)
                .sort(sortingarray)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            let patientIDArray = []
            // console.log("result============", result);
            for (const id of result) {
                patientIDArray.push(id.patient_login_id)
            }
            console.log("patientIDArray", typeof patientIDArray);

            var patientDetails;

            if (reviewBy == 'patient') {
                const resData = await httpService.postStaging('patient/get-patient-details-by-id', { ids: patientIDArray }, {}, 'patientServiceUrl');
                patientDetails = resData.data
                console.log("resData", resData);
            } else {

                const basic_info = await BasicInfo.find(
                    { for_portal_user: { $in: patientIDArray } }
                ).select(
                    {
                        for_portal_user: 1, full_name: 1
                    }
                ).populate(
                    { path: 'profile_picture', select: 'url' }
                )

                console.log("basic_info--------", basic_info);

                let profileObject = {}
                for (const doctorData of basic_info) {
                    var image_url;

                    if (doctorData != null && doctorData?.profile_picture != null && doctorData?.profile_picture?.url != "") {
                        image_url = await getDocument(doctorData?.profile_picture?.url)
                    }
                    profileObject[doctorData.for_portal_user] = { full_name: doctorData?.full_name, profile_pic: image_url }
                }

                patientDetails = profileObject
            }




            let ratingArray = [];
            for (const value of result) {
                ratingArray.push({
                    rating: value.rating,
                    comment: value.comment,
                    createdAt: value.createdAt,
                    updatedAt: value.updatedAt,
                    patientName: patientDetails[value.patient_login_id],
                    _id: value?._id
                })
            }
            const getAverage = await PortalUser.findById(portal_user_id).select('average_rating')
            console.log("getAverage=====", getAverage);

            // const getAllRatings = await ReviewAndRating.find({ portal_user_id: { $in: portal_user_id } }).select('rating')
            const getAllRatings = await ReviewAndRating.find({ portal_user_id: { $in: portal_user_id }, reviewBy }).select('rating')
            console.log("getAllRatings=====", getAllRatings);
            let fiveStart = 0
            let fourStart = 0
            let threeStart = 0
            let twoStart = 0
            let oneStart = 0
            for (const rating of getAllRatings) {
                if (rating.rating === 5) fiveStart += 1
                if (rating.rating === 4) fourStart += 1
                if (rating.rating === 3) threeStart += 1
                if (rating.rating === 2) twoStart += 1
                if (rating.rating === 1) oneStart += 1
            }
            const ratingCount = { fiveStart, fourStart, threeStart, twoStart, oneStart }
            const totalCount = await ReviewAndRating.find({ portal_user_id: { $in: portal_user_id }, reviewBy }).countDocuments()
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    ratingArray,
                    getAverage,
                    ratingCount,
                    totalCount,
                    currentPage: page,
                    totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
                },
                message: `successfully fetched review and ratings`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error------>", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `something went wrong while fetching reviews`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getReviewAndRatingForSupeAdmin(req, res) {
        try {
            const { portal_user_id, page, limit, reviewBy, reviewTo } = req.query;
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }
            let aggregate = [
                {
                    $match: { reviewBy, reviewTo },
                },
                {
                    $lookup: {
                        from: 'basicinfos',
                        localField: 'portal_user_id',
                        foreignField: 'for_portal_user',
                        as: 'basicinfos'
                    }
                },
                { $unwind: { path: "$basicinfos", preserveNullAndEmptyArrays: true } },

                {
                    $lookup: {
                        from: 'hospitaladmininfos',
                        localField: 'portal_user_id',
                        foreignField: 'for_portal_user',
                        as: 'hospitaladmininfos'
                    }
                },
                { $unwind: { path: "$hospitaladmininfos", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        rating: 1,
                        comment: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        patient_login_id: 1,
                        doctorName: '$basicinfos.full_name',
                        hospitalName: '$hospitaladmininfos.hospital_name'
                    }
                },
            ];

            const totalCount = await ReviewAndRating.aggregate(aggregate);
            aggregate.push(
                {
                    $sort: sortingarray
                }
            )
            if (limit > 0) {
                aggregate.push({ $skip: (page - 1) * limit }, { $limit: limit * 1 })
            }

            const result = await ReviewAndRating.aggregate(aggregate);

            let patientIDArray = []
            for (const id of result) {
                patientIDArray.push(id.patient_login_id)
            }

            var patientDetails;

            if (reviewBy == 'patient') {
                const resData = await httpService.postStaging('patient/get-patient-details-by-id', { ids: patientIDArray }, {}, 'patientServiceUrl');
                patientDetails = resData.data
            } else {
                const basic_info = await BasicInfo.find(
                    { for_portal_user: { $in: patientIDArray } }
                ).select(
                    {
                        for_portal_user: 1, full_name: 1
                    }
                ).populate(
                    { path: 'profile_picture', select: 'url' }
                )

                let profileObject = {}
                for (const doctorData of basic_info) {
                    var image_url;

                    if (doctorData != null && doctorData?.profile_picture != null && doctorData?.profile_picture?.url != "") {
                        image_url = await getDocument(doctorData?.profile_picture?.url)
                    }
                    profileObject[doctorData.for_portal_user] = { full_name: doctorData?.full_name, profile_pic: image_url }
                }

                patientDetails = profileObject
            }

            let ratingArray = [];
            for (const value of result) {
                ratingArray.push({
                    rating: value?.rating,
                    comment: value?.comment,
                    createdAt: value?.createdAt,
                    updatedAt: value?.updatedAt,
                    patientName: patientDetails[value.patient_login_id],
                    doctorName: value?.doctorName,
                    hospitalName: value?.hospitalName,
                    _id: value?._id
                })
            }
            // const getAverage = await PortalUser.findById(portal_user_id).select('average_rating')
            // const getAllRatings = await ReviewAndRating.find({ portal_user_id: { $eq: portal_user_id } }).select('rating')
            // let fiveStart = 0
            // let fourStart = 0
            // let threeStart = 0
            // let twoStart = 0
            // let oneStart = 0
            // for (const rating of getAllRatings) {
            //     if (rating.rating === 5) fiveStart += 1
            //     if (rating.rating === 4) fourStart += 1
            //     if (rating.rating === 3) threeStart += 1
            //     if (rating.rating === 2) twoStart += 1
            //     if (rating.rating === 1) oneStart += 1
            // }
            // const ratingCount = { fiveStart, fourStart, threeStart, twoStart, oneStart }
            // const totalCount = await ReviewAndRating.find({ portal_user_id: { $eq: portal_user_id }, reviewBy }).countDocuments()
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    ratingArray,
                    // getAverage,
                    // ratingCount,
                    totalCount: totalCount?.length,
                    currentPage: page,
                    totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
                },
                message: `successfully fetched review and ratings`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `something went wrong while fetching reviews`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getDoctorProfileAndName(doctorIds) {
        console.log("BASIC  ID ARRAY===>", doctorIds)
        const basic_info = await BasicInfo.find(
            { for_portal_user: { $in: doctorIds } }
        ).select(
            {
                for_portal_user: 1, full_name: 1
            }
        ).populate(
            { path: 'profile_picture', select: 'url' }
        )

        console.log("BASIC INFO===>", basic_info)


        // if (basic_info != null && basic_info?.profile_picture != null && basic_info?.profile_picture?.url != "") {
        //     const image_url = await getDocument(basic_info?.profile_picture?.url)
        //     basic_info.profile_picture.url = image_url ? image_url : ''
        // }   

    }

    async deleteReviewAndRating(req, res) {
        try {
            const { _id } = req.body;

            const result = await ReviewAndRating.deleteOne({ _id })

            if (result) {
                sendResponse(req, res, 200, {
                    status: true,
                    data: null,
                    message: `Rating & Review Deleted Successfully`,
                    errorCode: null,
                });
            }

        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `something went wrong`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listAppointment(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            var { patient_portal_id, page, limit, consultation_type, status, date, to_date } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            var keynew = '';
            var value = '';
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                keynew = sort.split(":")[0];
                value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            if (to_date == undefined) {
                to_date = ""
            }

            //For UPDATING MISSED APPOINTMENT
            const missedAppointments = await Appointment.find({ patientId: patient_portal_id, status: ["NEW", "APPROVED",] });
            var dateToday = new Date().toISOString().split('T')[0] //string

            const today = new Date(dateToday); //Today date
            let appointmentsToBeMissed = [] //appointment id array

            for (const appointment of missedAppointments) {
                let consultedDate = new Date(appointment?.consultationDate);

                if (consultedDate < today) {
                    appointmentsToBeMissed.push(appointment?._id.toString())
                } else if (consultedDate > today) {

                } else {
                    const now = new Date(); //current time
                    const endTime = appointment?.consultationTime?.split("-")[1]?.split(":"); //apointment end time

                    const givenTime = new Date();
                    givenTime.setHours(endTime[0]);
                    givenTime.setMinutes(endTime[1]);
                    givenTime.setSeconds(0);

                    // Compare the two times
                    if (now.getTime() > givenTime.getTime()) {
                        appointmentsToBeMissed.push(appointment?._id.toString())
                    }
                }
            }

            var afterUpdateResult;
            if (appointmentsToBeMissed.length != 0) {
                afterUpdateResult = await Appointment.updateMany({ _id: { $in: appointmentsToBeMissed } },
                    { $set: { status: 'MISSED' } },
                    { multi: true });
            }



            var appointmentTypeFilter = {}
            if (consultation_type && consultation_type != "") {
                if (consultation_type == 'ALL') {
                    appointmentTypeFilter = {
                        appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
                    }
                } else {
                    appointmentTypeFilter = {
                        appointmentType: consultation_type
                    }
                }
            }

            var statusFilter = {}
            if (status && status != "") {
                statusFilter = {
                    status: { $ne: 'NA' }
                }
                if (status == 'ALL') {
                    statusFilter = {
                        status: { $ne: 'NA' }
                    }
                }
                if (status == 'NEW') {
                    statusFilter = {
                        status: "NEW"
                    }
                }
                if (status == 'MISSED') {
                    statusFilter = {
                        status: "MISSED"
                    }
                }
                if (status == 'TODAY') {
                    statusFilter = {
                        consultationDate: { $eq: new Date().toISOString().split('T')[0] },
                        status: "APPROVED"
                    }
                }
                if (status == 'UPCOMING') {
                    statusFilter = {
                        consultationDate: { $gt: new Date().toISOString().split('T')[0] },
                        status: "APPROVED"
                    }
                }
                if (status == 'PAST') {
                    statusFilter = {
                        consultationDate: { $lt: new Date().toISOString().split('T')[0] },
                        status: "PAST"
                    }
                }
                if (status == 'REJECTED') {
                    statusFilter = {
                        status: "REJECTED"
                    }
                }

                if (status == 'APPROVED') {
                    statusFilter = {
                        status: "APPROVED"
                    }
                }


            } else {
                statusFilter = {
                    status: { $ne: 'NA' }
                }
            }

            var dateFilter = {}

            if (date && date != "" && to_date && to_date != "") {
                dateFilter = {
                    consultationDate: { $gte: date, $lte: to_date },
                }
            }
            if (date && date != "" && to_date == "") {
                dateFilter = {
                    consultationDate: { $gte: date },
                }
            }

            console.log(dateFilter, "dateFilter");
            let aggregate = [
                {
                    $match: {
                        patientId: mongoose.Types.ObjectId(patient_portal_id),
                        $and: [
                            appointmentTypeFilter,
                            statusFilter,
                            dateFilter
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'reasonforappointments',
                        localField: 'reasonForAppointment',
                        foreignField: '_id',
                        as: 'reasonForAppointment'
                    }
                },
                { $unwind: "$reasonForAppointment" },
                {
                    $lookup: {
                        from: 'basicinfos',
                        localField: 'doctorId',
                        foreignField: 'for_portal_user',
                        as: 'doctorId'
                    }
                },
                { $unwind: "$doctorId" },

                {
                    $project: {
                        patientDetails: 1,
                        doctorId: 1,
                        madeBy: 1,
                        consultationDate: 1,
                        consultationTime: 1,
                        appointmentType: 1,
                        consultationFee: 1,
                        reasonForAppointment: 1,
                        status: 1,
                        hospital_details: 1,
                        createdAt: -1,
                        order_id: -1,
                        patientDetails: 1
                        // paymentType:1
                        // hospital_with_locations: 1,



                    }
                },

            ];
            let doctorapp = await Appointment.aggregate(aggregate);
            //  console.log("doctorapp",doctorapp)

            let listArray = []
            let allData = [];
            var totalRecords = 0;
            for (const appointment of doctorapp) {

                // console.log("traget-----", appointment.hospLocData.hospital_or_clinic_location);

                // const date = formatDateAndTime(new Date())
                const todayDate = new Date().toISOString().split('T')[0]
                // const doctorDetails = await BasicInfo.find({for_portal_user: {$eq: appointment.doctorId}})
                let status = ''
                if (appointment.status === 'NEW') status = 'New'
                if (appointment.status === 'REJECTED') status = 'Rejected'
                if (appointment.status == 'PAST') status = 'Past'
                if (appointment.status == 'MISSED') status = 'Missed'
                if (appointment.status === 'APPROVED') {
                    // status = date == appointment.consultationDate ? 'Today' : 'Upcoming'
                    status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
                }
                let consultationType = ''
                if (appointment.appointmentType == 'HOME_VISIT') consultationType = 'Home Visit'
                if (appointment.appointmentType == 'ONLINE') consultationType = 'Online'
                if (appointment.appointmentType == 'FACE_TO_FACE') consultationType = 'Face to Face'

                //getting doctor profile signed url
                const basic_info = await BasicInfo.findOne(
                    { for_portal_user: appointment.doctorId.for_portal_user }
                ).select(
                    {
                        for_portal_user: 1, full_name: 1, speciality: 1,
                        years_of_experience: 1
                    }
                ).populate(
                    { path: 'profile_picture', select: 'url' }
                ).populate(
                    { path: 'in_fee_management' }
                )



                if (basic_info != null && basic_info?.profile_picture != null && basic_info?.profile_picture?.url != "") {
                    const image_url = await getDocument(basic_info?.profile_picture?.url)
                    basic_info.profile_picture.url = image_url ? image_url : ''
                }

                var speciality = ""

                if (basic_info?.speciality) {
                    const res = await specialty_info.findOne({ _id: basic_info.speciality });
                    if (res) {
                        speciality = res.specilization;
                    } else {
                        speciality = "";
                    }
                }



                listArray.push({
                    appointment_id: appointment._id,
                    patient_name: appointment.patientDetails.patientFullName,
                    // doctor_name: doctorDetails[0].full_name,
                    doctor_name: appointment.doctorId.full_name,
                    order_id: appointment.order_id,
                    doctor_id: appointment.doctorId.for_portal_user,
                    hospital_name: appointment.hospital_details ? appointment.hospital_details.hospital_name : 'N/A',
                    made_by: appointment.madeBy,
                    consultation_date: appointment.consultationDate,
                    consultation_time: appointment.consultationTime,
                    consultation_type: consultationType,
                    hospital_details: appointment.hospital_details,
                    reason_for_appointment: appointment.reasonForAppointment.name,
                    fee: appointment.consultationFee,
                    order_id: appointment.order_id ? appointment.order_id : '',
                    status,
                    doctor_profile_url: basic_info?.profile_picture?.url ? basic_info?.profile_picture?.url : '',
                    years_of_experience: basic_info?.years_of_experience,
                    speciality: speciality,
                    in_fee_management: basic_info?.in_fee_management,
                    createdAt: appointment.createdAt,
                    // paymentType:appointment.paymentType,
                    patieintDetailpatientId: appointment.patientDetails.patientId,
                })



            }




            const appointmentList_fourportal = await httpService.getStaging('labimagingdentaloptical/appointmentList_for_patient', { patient_portal_id, consultation_type, status, date, to_date }, {}, 'labimagingdentalopticalServiceUrl');

            if (appointmentList_fourportal.status == true) {
                allData = appointmentList_fourportal.data;

            }
            totalRecords += parseInt(listArray.length)
            totalRecords += parseInt(allData.length)
            var ListData = [...listArray, ...allData]


            ListData = ListData.flat();

            console.log(keynew, "keynew", value, "value");
            if (keynew == 'createdAt') {
                if (value == 1) {
                    ListData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                } else {
                    ListData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                }
            }
            if (keynew == 'patient_name') {
                if (value == 1) {
                    ListData.sort((a, b) => {
                        if (a.patient_name < b.patient_name) return -1;
                        if (a.patient_name > b.patient_name) return 1;
                        return 0;
                    });

                } else {
                    ListData.sort((a, b) => {
                        if (a.patient_name > b.patient_name) return -1;
                        if (a.patient_name < b.patient_name) return 1;
                        return 0;
                    });
                }
            }

            if (keynew == 'doctor_name') {
                if (value == 1) {
                    ListData.sort((a, b) => {
                        if (a.doctor_name < b.doctor_name) return -1;
                        if (a.doctor_name > b.doctor_name) return 1;
                        return 0;
                    });

                } else {
                    ListData.sort((a, b) => {
                        if (a.doctor_name > b.doctor_name) return -1;
                        if (a.doctor_name < b.doctor_name) return 1;
                        return 0;
                    });
                }
            }

            if (keynew == 'hospital_name') {
                if (value == 1) {
                    ListData.sort((a, b) => {
                        if (a.hospital_name < b.hospital_name) return -1;
                        if (a.hospital_name > b.hospital_name) return 1;
                        return 0;
                    });

                } else {
                    ListData.sort((a, b) => {
                        if (a.hospital_name > b.hospital_name) return -1;
                        if (a.hospital_name < b.hospital_name) return 1;
                        return 0;
                    });
                }
            }

            if (keynew == 'madeBy') {
                if (value == 1) {
                    ListData.sort((a, b) => {
                        if (a.made_by < b.made_by) return -1;
                        if (a.made_by > b.made_by) return 1;
                        return 0;
                    });

                } else {
                    ListData.sort((a, b) => {
                        if (a.made_by > b.made_by) return -1;
                        if (a.made_by < b.made_by) return 1;
                        return 0;
                    });
                }
            }
            if (keynew == 'consultation_date') {
                if (value == 1) {
                    ListData.sort((a, b) => new Date(a.consultation_date) - new Date(b.consultation_date));

                } else {
                    ListData.sort((a, b) => new Date(b.consultation_date) - new Date(a.consultation_date));

                }
            }
            if (keynew == 'hospital_details.hospital_name') {
                if (value == 1) {
                    ListData.sort((a, b) => {
                        if (a.hospital_details.hospital_name < b.hospital_details.hospital_name) return -1;
                        if (a.hospital_details.hospital_name > b.hospital_details.hospital_name) return 1;
                        return 0;
                    });

                } else {
                    ListData.sort((a, b) => {
                        if (a.hospital_details.hospital_name > b.hospital_details.hospital_name) return -1;
                        if (a.hospital_details.hospital_name < b.hospital_details.hospital_name) return 1;
                        return 0;
                    });
                }
            }
            if (keynew == 'consultation_type') {
                if (value == 1) {
                    ListData.sort((a, b) => {
                        if (a.consultation_type < b.consultation_type) return -1;
                        if (a.consultation_type > b.consultation_type) return 1;
                        return 0;
                    });

                } else {
                    ListData.sort((a, b) => {
                        if (a.consultation_type > b.consultation_type) return -1;
                        if (a.consultation_type < b.consultation_type) return 1;
                        return 0;
                    });
                }
            }
            if (keynew == 'status') {
                if (value == 1) {
                    ListData.sort((a, b) => {
                        if (a.status < b.status) return -1;
                        if (a.status > b.status) return 1;
                        return 0;
                    });

                } else {
                    ListData.sort((a, b) => {
                        if (a.status > b.status) return -1;
                        if (a.status < b.status) return 1;
                        return 0;
                    });
                }
            }
            if (keynew == 'fee') {
                if (value == 1) {
                    ListData.sort((a, b) => parseInt(a.fee) - parseInt(b.fee));

                } else {
                    ListData.sort((a, b) => parseInt(b.fee) - parseInt(a.fee));

                }
            }

            let start_index;
            let end_index;

            if (req.query.limit != 0) {
                let skip = (page - 1) * limit
                if (skip == 0) {
                    start_index = skip
                } else {
                    start_index = skip;
                }

                end_index = parseInt(limit) + parseInt(skip);
            }

            const result = ListData.slice(start_index, end_index);
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: result,
                    totalCount: totalRecords,
                    currentPage: page,
                    totalPages: limit > 0 ? Math.ceil(totalRecords / limit) : 1,
                },
                message: `Patient appointment list fetched successfully.`,
                errorCode: null,
            });

        } catch (error) {
            console.log(error.message);
            sendResponse(req, res, 500, {
                status: false,
                body: error.message ? error.message : error,
                message: `something went wrong while fetching list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async updateAppointmentComplete(req, res) {
        try {
            const {
                appointmentId,
            } = req.body
            console.log(req.body, "check log 99933");
            const orderDetail = await Appointment.findOneAndUpdate({ _id: appointmentId },
                {
                    $set: {
                        appointment_complete: true
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: orderDetail,
                message: "successfully verified insurance for this order",
                errorCode: null,
            });
        } catch (error) {
            console.log("errorrrr", error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to verify insurance for this order",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async cancelAppointment(req, res) {
        try {
            const { appointment_id, cancelReason, status, cancelledOrAcceptedBy, type } = req.body
            const headers = {
                'Authorization': req.headers['authorization']
            }
            var appointmentDetails = await Appointment.findOneAndUpdate({ _id: { $eq: appointment_id } }, {
                $set: {
                    cancelReason,
                    status,
                    cancelledOrAcceptedBy,
                    cancel_by: type
                }
            }, { new: true }).exec();

            console.log("appointmentDetails", appointmentDetails);
            // var notificationFor
            // var toUserId
            // if (type == "doctor") {
            //     notificationFor = "patientServiceUrl"
            //     toUserId = appointmentDetails.doctorId
            // } else {
            //     notificationFor = "hospitalServiceUrl"
            //     toUserId = appointmentDetails.patientId
            // }
            // await notification(type, cancelledOrAcceptedBy, notificationFor, toUserId, "one appointment canceled", "", headers)



            var notificationCreator;
            var notificationReceiver;

            if (type == "doctor") {
                notificationCreator = appointmentDetails.doctorId;
                notificationReceiver = appointmentDetails.patientId;
            } else {
                notificationCreator = appointmentDetails.patientId;
                notificationReceiver = appointmentDetails.doctorId;
            }
            var message = `${appointmentDetails.patientDetails.patientFullName} has been cancel the appointment of ${appointmentDetails.consultationDate, appointmentDetails.consultationTime}.`
            var requestData = {
                created_by_type: type,
                created_by: notificationCreator,
                content: message,
                url: '',
                for_portal_user: notificationReceiver,
                notitype: 'Cancel Appointment',
                appointmentId: appointment_id
            }

            var result = await notification(appointmentDetails.madeBy, notificationCreator, "hospitalServiceUrl", req.body.doctorId, "one new appointment", "https://mean.stagingsdei.com:451", headers, requestData)
            console.log("result-->", result);



            sendResponse(req, res, 200, {
                status: true,
                data: null,
                message: `patient appointment cancelled successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `something went wrong while cancelling appointment`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async viewAppointment(req, res) {
        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const { appointment_id } = req.query
            const result = await Appointment.findById(appointment_id)
                .populate({
                    path: 'doctorId',
                    select: {
                        email: 1,
                        mobile: 1,
                        country_code: 1
                    }
                })
                .populate({
                    path: 'reasonForAppointment',
                    select: {
                        name: 1,
                    }
                })

            const basic_info = await BasicInfo.find(
                { for_portal_user: { $eq: result.doctorId._id } }
            ).select(
                {
                    for_portal_user: 1, full_name: 1, speciality: 1,
                    years_of_experience: 1
                }
            ).populate(
                { path: 'profile_picture', select: 'url' }
            ).populate(
                { path: 'in_fee_management' }
            ).populate(
                { path: 'in_location', }
            )

            let basic_info_data = [
                {
                    ...basic_info[0]?._doc
                }
            ]

            if (basic_info[0].profile_picture) {
                const image_url = await getDocument(basic_info[0].profile_picture.url)
                basic_info_data[0].profile_picture.url = image_url
            }

            if (basic_info[0].speciality) {
                const res = await specialty_info.findOne({ _id: basic_info[0].speciality });
                if (res) {
                    basic_info_data[0].speciality = res.specilization;
                } else {
                    basic_info_data[0].speciality = "";
                }
            }



            const portalUser = await PortalUser.findById(basic_info[0].for_portal_user).select('average_rating')
            const getRatingCount = await ReviewAndRating.find({ portal_user_id: { $eq: result.doctorId._id } }).countDocuments()
            const doctor_rating = {
                average_rating: portalUser.average_rating,
                total_review: getRatingCount
            }
            let docArray = []
            if (result.docDetails.length > 0) {
                const resData = await httpService.postStaging('patient/get-patient-documents-by-ids', { ids: result.docDetails }, headers, 'patientServiceUrl');
                const patientDoc = resData.data
                for (const doc of patientDoc) {
                    docArray.push({
                        doc_name: doc.name,
                        issue_date: doc.issue_date,
                        expiration_date: doc.expiration_date,
                        image_url: doc.image_signed_url
                    })
                }
            }

            var patient_profile = ""
            let patient_profile_response = await httpService.getStaging('patient/get-patient-profile-signed-url', { patientId: result.patientId }, headers, 'patientServiceUrl');
            patient_profile = patient_profile_response?.body ? patient_profile_response?.body?.profile_signed_url : ''
            let otherinfo = {
                ANSJSON: result?.ANSJSON,
                consultationData: result?.consultationData,
                templateJSON: result?.templateJSON
            }

            if (result.cancelledOrAcceptedBy != null) {
                if (result.cancel_by == 'patient') {
                    console.log("if");
                    result.cancel_by = 'patient'

                } else {
                    console.log("else");
                    const findDoc = await PortalUser.findOne({ _id: result.cancelledOrAcceptedBy })

                    if (findDoc.role == 'INDIVIDUAL_DOCTOR' || findDoc.role == 'HOSPITAL_DOCTOR') {
                        console.log("else if");
                        const docName = await BasicInfo.findOne({ for_portal_user: findDoc._id })
                        result.cancel_by = docName.full_name
                    } else {
                        console.log("else if else");
                        const staffName = await profile_info.findOne({ for_portal_user: findDoc._id })
                        result.cancel_by = staffName.name
                    }
                }

            }

            sendResponse(req, res, 200, {
                status: true,
                data: { patient_profile: patient_profile, result, doctor_basic_info: basic_info_data, doctor_rating, patient_document: docArray, otherinfo },
                message: `patient appointment fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `something went wrong while fetching appointment`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async setReminderForAppointment(req, res) {
        console.log("---->");
        try {
            const { doctorId, appointment_id, time_reminder_data, datetime_reminder_data, patientId } = req.body;
            console.log("req.body__________", req.body);

            if(doctorId){
                const checkExist = await Reminder.find({ appointment_id,doctorId:doctorId })
                if (checkExist.length > 0) {
                    await Reminder.deleteMany({  appointment_id,doctorId:doctorId  });
                }
            }else{
                const checkExist = await Reminder.find({ appointment_id,patientId:patientId })
                if (checkExist.length > 0) {
                    await Reminder.deleteMany({ appointment_id,patientId:patientId });
                }
            }
    
            // const checkExist = await Reminder.find({ appointment_id });
            // if (checkExist.length > 0) {
            //     await Reminder.deleteMany({ appointment_id });
            // }
    
            let dataArray = [];
            for (const value of time_reminder_data) {
                if (value?.hours !== '' || value?.minutes !== '') {
                    let dataObject = {
                        doctorId,
                        appointment_id,
                        patientId,
                        minutes: value?.minutes,
                        hours: value?.hours
                    };
                    dataArray.push(dataObject);
                }
            }
    
            for (const value of datetime_reminder_data) {
                if (value.datetime !== '') {
                    let dataObject = {
                        doctorId,
                        appointment_id,
                        patientId,
                        datetime: value.datetime
                    };
                    dataArray.push(dataObject);
                }
            }
    
            await Reminder.insertMany(dataArray);
            sendResponse(req, res, 200, {
                status: true,
                data: dataArray,
                message: `Reminder set successfully`,
                errorCode: null
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error.message,
                message: `Something went wrong`,
                errorCode: "INTERNAL_SERVER_ERROR"
            });
        }
    }
    
    async getReminderForAppointment(req, res) {
        try {
            const { appointment_id,doctorId,patientId} = req.query
            console.log("req.query__________",req.query)
            
            // const result = await Reminder.find({ appointment_id })
            let result;
            if(doctorId){
                result = await Reminder.find({ appointment_id,doctorId:doctorId })
            }else{
                result = await Reminder.find({ appointment_id,patientId:patientId })
            }
            
            let dataArray = {}
            let time_reminder_data = []
            let datetime_reminder_data = []

            for (const data of result) {
                if (data.minutes) {
                    time_reminder_data.push({
                        minutes: data.minutes,
                        hours: data.hours
                    })
                }
                if (data.datetime) {
                    datetime_reminder_data.push({
                        datetime: data.datetime
                    })
                }
            }
            if (result.length > 0) {
                dataArray.appointment_id = result[0].appointment_id
                dataArray.doctorId = result[0].doctorId
                dataArray.patientId = result[0].patientId
                dataArray.time_reminder_data = time_reminder_data
                dataArray.datetime_reminder_data = datetime_reminder_data
            }
            sendResponse(req, res, 200, {
                status: true,
                data: { data: dataArray },
                message: `reminder get successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `something went wrong`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async sendReminderNotifications(req, res) {
        try {
            const reminders = await Reminder.find({ status: 0 });
            console.log("reminders_______",reminders)
            for (let reminder of reminders) {
                let appointmentDetails = await Appointment.findOne({ _id: reminder?.appointment_id });
                if (appointmentDetails) {
                    var consultationDate = new Date(appointmentDetails?.consultationDate);
                    var consultationTime = appointmentDetails?.consultationTime;
                    var startTime = consultationTime.split('-')[0].trim();
                    console.log("consultationDate",consultationDate,"consultationTime",consultationTime,"startTime",startTime)
                    if (!reminder?.datetime) {
                        console.log("runn111")
                        var notificationMinutesBefore = reminder?.minutes || 0;
                        if (reminder?.hours) {
                            notificationMinutesBefore += reminder?.hours * 60;
                        }
                        var formattedDateTime = moment(consultationDate).format("YYYY-MM-DD") + " " + startTime;
                        console.log("formattedDateTime", formattedDateTime);

                        var notificationTime = new Date(moment(formattedDateTime).subtract(notificationMinutesBefore, 'minutes'));
                        // var notificationTime = "2024-04-03T09:21:53.935Z"
                        console.log("notificationTime", notificationTime)
                    } else {
                        console.log("runn222")
                        var formattedDateTime = moment(consultationDate).format("YYYY-MM-DD") + " " + startTime;
                        console.log("formattedDateTime", formattedDateTime);

                        var notificationTime = new Date(moment(reminder?.datetime))
                        // var notificationTime = "2024-04-03T09:21:53.935Z"
                        console.log("notificationTime", notificationTime)

                        if (!isNaN(notificationTime.getTime())) {
                            var formattedDateTimeTimestamp = new Date(formattedDateTime).getTime();
                            var notificationTimeTimestamp = notificationTime.getTime();

                            var differenceInMilliseconds = notificationTimeTimestamp - formattedDateTimeTimestamp;
                            var notificationMinutesBefore = Math.abs(differenceInMilliseconds / (1000 * 60));
                        }
                    }

                    // Compare notification time with current time
                    // var currentTime = new Date(moment().utcOffset("+05:30").format())
                    // var currentTime = "2024-04-03T09:21:53.935Z"
                    var currentTime = new Date(moment());
                    console.log("currentTime_________", currentTime)
                    console.log("notificationTime <= currentTime",notificationTime, currentTime)
                    if (notificationTime <= currentTime) {
                        console.log("Send Notification")
                        var message = `Your Appointment Scheduled on ${appointmentDetails?.consultationDate}|${appointmentDetails?.consultationTime} is starting in ${notificationMinutesBefore} minutes`
                        console.log("message_____", message)
                        if (reminder?.doctorId) {
                            console.log("ABCD")
                            var requestData = {
                                created_by_type: "doctor",
                                created_by: reminder?.doctorId,
                                content: message,
                                url: '',
                                for_portal_user: reminder?.doctorId,
                                notitype: 'Appointment Reminder',
                                appointmentId: reminder?.appointment_id
                            }
                            var result = await notification(appointmentDetails?.madeBy, reminder?.doctorId, "hospitalServiceUrl", appointmentDetails?.doctorId, "reminder for appointment", "https://mean.stagingsdei.com:451", {}, requestData)
                            console.log("result_______", result)
                            var modifiedresult = await Reminder.updateOne(
                                { _id: reminder?._id },
                                { status: 1 },
                                { new: true }
                            ).exec();
                        } else {
                            console.log("DEFG")
                            var requestData = {
                                created_by_type: "patient",
                                created_by: reminder?.patientId,
                                content: message,
                                url: '',
                                for_portal_user: reminder?.patientId,
                                notitype: 'Appointment Reminder',
                                appointmentId: reminder?.appointment_id
                            }
                            var result = await notification('patient', reminder?.patientId, "patientServiceUrl", reminder?.patientId, "reminder for appointment", "https://mean.stagingsdei.com:451", {}, requestData)

                            var modifiedresult = await Reminder.updateOne(
                                { _id: reminder?._id },
                                { status: 1 },
                                { new: true }
                            ).exec();
                        }
                    } else {
                        console.log("No need to send notification");
                    }
                }
            }
        } catch (error) {
            console.error('Error sending reminder notifications:', error);
        }
    }

    async getRatingReviewByPatient(req, res) {
        try {
            const { patientId } = req.query;
            // const result = await review.find({patient_login_id:patientId });

            const result = await review.aggregate([
                {
                    $match: { patient_login_id: mongoose.Types.ObjectId(patientId) }
                },
                {
                    $lookup: {
                        from: 'portalusers',
                        localField: 'portal_user_id',
                        foreignField: '_id',
                        as: 'portalusers'
                    }
                },
                { $unwind: { path: "$portalusers", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'basicinfos',
                        localField: 'portal_user_id',
                        foreignField: 'for_portal_user',
                        as: 'basicinfos'
                    }
                },
                { $unwind: { path: "$basicinfos", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'documentinfos',
                        localField: 'basicinfos.profile_picture',
                        foreignField: '_id',
                        as: 'documentinfos'
                    }
                }
                ,
                { $unwind: { path: "$documentinfos", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'hospitaladmininfos',
                        localField: 'portal_user_id',
                        foreignField: 'for_portal_user',
                        as: 'hospitaladmininfos'
                    }
                },
                { $unwind: { path: "$hospitaladmininfos", preserveNullAndEmptyArrays: true } },

                {
                    $lookup: {
                        from: 'hospitaladmininfos',
                        localField: 'basicinfos.for_hospital',
                        foreignField: 'for_portal_user',
                        as: 'hospitaladmininfosForHosDoctor'
                    }
                },
                { $unwind: { path: "$hospitaladmininfosForHosDoctor", preserveNullAndEmptyArrays: true } },


                {
                    $project: {
                        _id: 1,
                        rating: 1,
                        comment: 1,
                        portal_user_id: 1,
                        updatedAt: 1,
                        role: "$portalusers.role",
                        doctorName: "$basicinfos.full_name",
                        hospitalName: "$hospitaladmininfos.hospital_name",
                        doctorProfileUrl: "$documentinfos.url",
                        hospitalProfileUrl: "$hospitaladmininfos.profile_picture",
                        for_hospital: "$hospitaladmininfosForHosDoctor.hospital_name"


                    }
                }
            ]);

            console.log("RESULT HOSPITAL===>", result)

            let objArray = [];

            //arrange data
            for (const element of result) {
                const date = new Date(element.updatedAt);

                const year = date.getFullYear();
                const month = date.getMonth() + 1; // JavaScript months are zero-based
                const day = date.getDate();
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const seconds = date.getSeconds();

                let filteredDate = `${year}-${month}-${day}`
                let filteredTime = `${hours}:${minutes}:${seconds}`

                if (element.role === 'HOSPITAL_ADMIN') {
                    objArray.push(
                        {
                            _id: element?._id,
                            rating: element?.rating,
                            comment: element?.comment,
                            date: filteredDate,
                            time: filteredTime,
                            role: element?.role,
                            name: element?.hospitalName,
                            for_portal_user: element?.portal_user_id,
                            profileUrl: element?.hospitalProfileUrl ? element?.hospitalProfileUrl : '',
                        }
                    )
                } else {
                    objArray.push(
                        {
                            _id: element?._id,
                            rating: element?.rating,
                            comment: element?.comment,
                            role: element?.role,
                            date: filteredDate,
                            time: filteredTime,
                            name: element?.doctorName,
                            for_portal_user: element?.portal_user_id,
                            profileUrl: element?.doctorProfileUrl ? element?.doctorProfileUrl : '',
                            for_hospital: element?.for_hospital
                        }
                    )
                }
            }

            //get signed profile picture url
            for (const element of objArray) {
                if (element?.profileUrl != "") {
                    const profilePic = await getDocument(element?.profileUrl)
                    element.profileUrl = profilePic
                } else {
                    element.profileUrl = ""
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                data: objArray,
                message: `Rating & Review fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `something went wrong`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listAppointmentUpcomingCount(req, res) {

        try {
            const { patient_portal_id, consultation_type, status, date } = req.query;
            var appointmentTypeFilter = {}
            if (consultation_type && consultation_type != "") {
                if (consultation_type == 'ALL') {
                    appointmentTypeFilter = {
                        appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
                    }
                } else {
                    appointmentTypeFilter = {
                        appointmentType: consultation_type
                    }
                }
            }

            var statusFilter = {}
            if (status && status != "") {
                statusFilter = {
                    status: { $ne: 'NA' }
                }
                if (status == 'ALL') {
                    statusFilter = {
                        status: { $ne: 'NA' }
                    }
                }
                if (status == 'NEW') {
                    statusFilter = {
                        status: "NEW"
                    }
                }
                if (status == 'MISSED') {
                    statusFilter = {
                        status: "MISSED"
                    }
                }
                if (status == 'TODAY') {
                    statusFilter = {
                        consultationDate: { $eq: new Date().toISOString().split('T')[0] },
                        status: "APPROVED"
                    }
                }
                if (status == 'UPCOMING') {
                    statusFilter = {
                        consultationDate: { $gt: new Date().toISOString().split('T')[0] },
                        status: "APPROVED"
                    }
                }
                if (status == 'PAST') {
                    statusFilter = {
                        consultationDate: { $lt: new Date().toISOString().split('T')[0] },
                        status: "PAST"
                    }
                }
                if (status == 'REJECTED') {
                    statusFilter = {
                        status: "REJECTED"
                    }
                }

                if (status == 'APPROVED') {
                    statusFilter = {
                        status: "APPROVED"
                    }
                }


            } else {
                statusFilter = {
                    status: { $ne: 'NA' }
                }
            }

            var dateFilter = {}
            if (date && date != "") {
                dateFilter = {
                    consultationDate: date,
                }
            }


            let aggregate = [
                {
                    $match: {
                        patientId: mongoose.Types.ObjectId(patient_portal_id),
                        $and: [
                            appointmentTypeFilter,
                            statusFilter,
                            dateFilter
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'reasonforappointments',
                        localField: 'reasonForAppointment',
                        foreignField: '_id',
                        as: 'reasonForAppointment'
                    }
                },
                { $unwind: "$reasonForAppointment" },
                {
                    $lookup: {
                        from: 'basicinfos',
                        localField: 'doctorId',
                        foreignField: 'for_portal_user',
                        as: 'doctorId'
                    }
                },
                { $unwind: "$doctorId" },
                {
                    $project: {
                        patientDetails: 1,
                        doctorId: 1,
                        madeBy: 1,
                        consultationDate: 1,
                        consultationTime: 1,
                        appointmentType: 1,
                        consultationFee: 1,
                        reasonForAppointment: 1,
                        status: 1,
                        hospital_details: 1
                    }
                },
            ];
            const totalCount = await Appointment.aggregate(aggregate);
            aggregate.push({
                $sort: {
                    createdAt: -1
                }
            })
            // if (limit > 0) {
            //     aggregate.push({ $skip: (page - 1) * limit }, { $limit: limit * 1 })
            // }
            const result = await Appointment.aggregate(aggregate);
            let listArray = []
            for (const appointment of result) {
                // console.log("appointment-------->",appointment);
                // const date = formatDateAndTime(new Date())
                const todayDate = new Date().toISOString().split('T')[0]
                // const doctorDetails = await BasicInfo.find({for_portal_user: {$eq: appointment.doctorId}})
                let status = ''
                if (appointment.status === 'NEW') status = 'New'
                if (appointment.status === 'REJECTED') status = 'Rejected'
                if (appointment.status == 'PAST') status = 'Past'
                if (appointment.status == 'MISSED') status = 'Missed'
                if (appointment.status === 'APPROVED') {
                    // status = date == appointment.consultationDate ? 'Today' : 'Upcoming'
                    status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
                }
                let consultationType = ''
                if (appointment.appointmentType == 'HOME_VISIT') consultationType = 'Home Visit'
                if (appointment.appointmentType == 'ONLINE') consultationType = 'Online'
                if (appointment.appointmentType == 'FACE_TO_FACE') consultationType = 'Face to Face'

                //getting doctor profile signed url
                const basic_info = await BasicInfo.findOne(
                    { for_portal_user: appointment.doctorId.for_portal_user }
                ).select(
                    {
                        for_portal_user: 1, full_name: 1, speciality: 1,
                        years_of_experience: 1
                    }
                ).populate(
                    { path: 'profile_picture', select: 'url' }
                ).populate(
                    { path: 'in_fee_management' }
                )

                // let feeMAnagementArray = []
                // feeMAnagementArray = await FeeManagement.find({ for_portal_user: appointment.doctorId.for_portal_user, location_id: appointment.hospital_details.location_id})

                if (basic_info != null && basic_info?.profile_picture != null && basic_info?.profile_picture?.url != "") {
                    const image_url = await getDocument(basic_info?.profile_picture?.url)
                    basic_info.profile_picture.url = image_url ? image_url : ''
                }

                var speciality = ""

                if (basic_info?.speciality) {
                    const res = await specialty_info.findOne({ _id: basic_info.speciality });
                    if (res) {
                        speciality = res.specilization;
                    } else {
                        speciality = "";
                    }
                }

                listArray.push({
                    appointment_id: appointment._id,
                    patient_name: appointment.patientDetails.patientFullName,
                    // doctor_name: doctorDetails[0].full_name,
                    doctor_name: appointment.doctorId.full_name,
                    order_id: appointment.appointment_id,
                    doctor_id: appointment.doctorId.for_portal_user,
                    hospital_name: appointment.hospital_details ? appointment.hospital_details.hospital_name : 'N/A',
                    made_by: appointment.madeBy,
                    consultation_date: appointment.consultationDate,
                    consultation_time: appointment.consultationTime,
                    consultation_type: consultationType,
                    hospital_details: appointment.hospital_details,
                    reason_for_appointment: appointment.reasonForAppointment.name,
                    fee: appointment.consultationFee,
                    order_id: appointment.order_id ? appointment.order_id : '',
                    status,
                    doctor_profile_url: basic_info?.profile_picture?.url ? basic_info?.profile_picture?.url : '',
                    years_of_experience: basic_info?.years_of_experience,
                    speciality: speciality,
                    in_fee_management: basic_info?.in_fee_management
                })

            }
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: listArray,
                    totalCount: totalCount.length,
                    // currentPage: page,
                    // totalPages: limit > 0 ? Math.ceil(totalCount.length / limit) : 1,
                },
                message: `patient appointment list fetched successfully`,
                errorCode: null,
            });

        } catch (error) {
            console.log(error.message);
            sendResponse(req, res, 500, {
                status: false,
                body: error.message ? error.message : error,
                message: `something went wrong while fetching list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getappointmentdetailDoctorName(req, res) {

        const { ids } = req.query

        let condition = {}
        let mytext = req.query.searchText || "";
        var regexValue = new RegExp(mytext);
        if (mytext) {
            condition = {
                $or: [
                    { firstName: { $regex: regexValue, $options: "i" } },
                    { middleName: { $regex: regexValue, $options: "i" } },
                    { lastName: { $regex: regexValue, $options: "i" } },
                ]
            };
        }



        try {
            const query = [
                {
                    $match: {
                        order_id: { $in: ids },
                    }
                },
                {
                    $lookup: {
                        from: "basicinfos",
                        localField: "doctorId",
                        foreignField: "for_portal_user",
                        as: "DoctorData",
                    }
                },

                {
                    $project: {
                        firstName: "$DoctorData.first_name",
                        middleName: "$DoctorData.middle_name",
                        lastName: "$DoctorData.last_name",
                        consultationDate: "$consultationDate",
                        consultationTime: "$consultationTime",
                        order_id: "$order_id"
                    },
                },
                { $match: condition },

            ]
            const appointmentData = await Appointment.aggregate(query)
            let dataObject = {}
            for (const value of appointmentData) {
                dataObject[value.order_id] = {
                    fullName: `${value.firstName[0]} ${value.middleName[0]} ${value.lastName[0]}`,
                    consultationDate: `${value.consultationDate} ${value.consultationTime}`,

                }
            }

            sendResponse(req, res, 200, {
                status: true,
                body: dataObject,
                message: `patient appointment data fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error.message);
            sendResponse(req, res, 500, {
                status: false,
                body: error.message ? error.message : error,
                message: `something went wrong while fetching list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async getAllPatientAddedByHospitalDoctor(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        }

        try {
            var { hospitalId, limit, page, searchText, sort } = req.query;

            let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(hospitalId) });

            if (checkUser.role === "HOSPITAL_STAFF") {

                let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(hospitalId) });

                hospitalId = adminData?.in_hospital;
            }

            var filter = {
                'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
                'for_portal_user.isDeleted': false,
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospitalId)] }
            };

            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },

                { $match: filter },
                {
                    $project: {
                        doctorId: "$for_portal_user._id"
                    }
                },
            ];

            const result = await BasicInfo.aggregate(aggregate);
            const fourportalData = await httpService.getStaging('labimagingdentaloptical/get-all-fouportal-list-for-hospital', { hospital_portal_id: mongoose.Types.ObjectId(hospitalId) }, headers, 'labimagingdentalopticalServiceUrl');

            const responseData = [];

            if (fourportalData) {
                fourportalData?.data.forEach(item => {
                    responseData.push({
                        doctorId: item.for_portal_user._id
                    });
                });
            }

            const combinedResponseData = [...responseData, ...result.map(({ doctorId }) => ({ doctorId }))];

            const doctorIds = combinedResponseData.map(item => item.doctorId);


            const allPatientList = await httpService.getStaging('patient/get-all-patient-added-by-doctor', { doctorId: doctorIds, limit: limit, page: page, searchText: searchText, sort: sort }, headers, 'patientServiceUrl');
            if (allPatientList) {
                let data = allPatientList.body;
                if(data){                    
                    return sendResponse(req, res, 200, {
                        status: true,
                        body: data,
                        message: `Hospital doctor fetched successfully`,
                        errorCode: null,
                    });
                }
            } else {
                return sendResponse(req, res, 500, {
                    status: false,
                    body: error,
                    message: "Internal server error",
                    errorCode: null,
                });
            }

        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }

    }

}
module.exports = new PatientController();