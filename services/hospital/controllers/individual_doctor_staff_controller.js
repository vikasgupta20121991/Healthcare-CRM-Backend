"use strict";

// utils
import { handleResponse, sendResponse } from "../helpers/transmission";
import { hashPassword } from "../helpers/string";
import { generate6DigitOTP, smsTemplateOTP } from "../constant";
import { sendSms } from "../middleware/sendSms";
import { checkPassword, generateRefreshToken, generateTenSaltHash, generateToken } from "../middleware/utils";
import { verifyEmail2fa, forgotPasswordEmail,sendStaffDetails } from "../helpers/emailTemplate";
import { sendEmail } from "../helpers/ses";
import crypto from "crypto";
import department_info from "../models/department_info";
import service_info from "../models/service_info";
import unit_info from "../models/unit_info";
import { resourceLimits } from "worker_threads";
import bcrypt from "bcrypt"
import Http from "../helpers/httpservice"
const httpService = new Http()
import mongoose from "mongoose";
import SubscriptionPurchaseStatus from "../models/subscription/purchasestatus";
// models
import Counter from "../models/counter";
import PortalUser from "../models/portal_user";
import LocationInfo from "../models/location_info";
import StaffInfo from "../models/staff_info";
import ProfileInfo from "../models/profile_info";
import basic_info from "../models/basic_info";


class IndividualDoctorStaffController {
    async addStaff(req, res) {
        const {
            staff_name,
            first_name,
            middle_name,
            last_name,
            dob,
            language,
            addressInfo,
            email,
            password,
            countryCode,
            mobile,
            role,
            assignToDoctor,
            assignToStaff,
            aboutStaff,
            specialty,
            // services,
            // department,
            // unit,
            // expertise,
            profilePic,
            creatorId,
            doj
        } = req.body;

        console.log("req.body;", req.body);
        try {

            // const staffCount = await PortalUser.countDocuments({created_by_user:creatorId,isDeleted:false , role:"INDIVIDUAL_DOCTOR_STAFF"});
            // const checkPlan = await SubscriptionPurchaseStatus.find({for_user:creatorId});

            const checkUser = await PortalUser.findOne({_id:creatorId});
            let staffCount = {};
            let checkPlan={};
            if (checkUser?.role === 'INDIVIDUAL_DOCTOR_STAFF') {
                staffCount = await PortalUser.countDocuments({role:"INDIVIDUAL_DOCTOR_STAFF", created_by_user: checkUser?.created_by_user, isDeleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: checkUser?.created_by_user });
            } else {
                staffCount = await PortalUser.countDocuments({role:"INDIVIDUAL_DOCTOR_STAFF",created_by_user: creatorId, isDeleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: creatorId });
            }
            let checkCondition;
            checkCondition = await getData(checkPlan);

            if (checkCondition?.statusData === "active") {
                // for (const data of checkPlan) {
                let shouldAddStaff = false;
                for (const data12 of checkCondition?.data1?.services) {
                    if (data12?.name === 'staff' && data12?.is_unlimited === false) {
                        if (staffCount < data12?.max_number) {
                            shouldAddStaff = true;
                            break; // Exit the inner loop if conditions are satisfied
                        } else {
                            return sendResponse(req, res, 200, {
                                status: false,
                                body: null,
                                message: "Unable to add Staff. As Staff Maximum limit has exceeded as per your purchased plan.",
                                errorCode: null,
                            });
                        }
                    }
                }

                if (shouldAddStaff) {
                    let userFind = await PortalUser.findOne(
                        {
                            email: email.toLowerCase(),
                            isDeleted: false
                        }
                    );
                    if (userFind) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: userFind,
                            message: "Staff already exist",
                            errorCode: null,
                        });
                    }
                    console.log("userFinduserFind", userFind);
                    const salt = await bcrypt.genSalt(10);
                    let newPassword = await bcrypt.hash(password, salt);
                    var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
                    let userData = new PortalUser(
                        {
                            full_name: first_name + " " + middle_name + " " + last_name,
                            user_id: sequenceDocument.sequence_value,
                            email,
                            country_code: countryCode,
                            mobile,
                            role: "INDIVIDUAL_DOCTOR_STAFF",
                            password: newPassword,
                            profile_picture: profilePic,
                            created_by_user: creatorId
                        }
                    );
                    let userDetails = await userData.save();
                    console.log("userDetails", userDetails);
                    let locationData = new LocationInfo(
                        {
                            ...addressInfo,
                            for_portal_user: userDetails._id
                        }
                    );
                    console.log("locationData-->", locationData);
                    let locationDetails = await locationData.save();
                    console.log("locationDetails-->", locationDetails);

                    let profileData = new ProfileInfo(
                        {
                            name: first_name + " " + middle_name + " " + last_name,
                            first_name,
                            middle_name,
                            last_name,
                            dob,
                            language,
                            about: aboutStaff,
                            profile_picture: profilePic,
                            in_location: locationDetails._id,
                            for_portal_user: userDetails._id,
                        }
                    );
                    let staffProfileDetails = await profileData.save()
                    let staffData = new StaffInfo(
                        {
                            name: first_name + " " + middle_name + " " + last_name,
                            in_profile: staffProfileDetails._id,
                            role,
                            for_doctor: assignToDoctor,
                            for_staff: assignToStaff,
                            specialty,
                            // services,
                            // department,
                            // unit,
                            // expertise,
                            in_hospital: creatorId,
                            for_portal_user: userDetails._id,
                            profile_picture: profilePic,
                            doj: doj
                        }
                    );
                    let staffDetails = await staffData.save()
                    let staffFullDetails = await StaffInfo.findOne({ _id: staffDetails._id })
                        .populate({
                            path: "in_profile",
                            populate: {
                                path: 'in_location',
                                populate: {
                                    path: "for_portal_user"
                                }
                            },
                        })
                    const content = sendStaffDetails(email, password, 'Doctor');
                    console.log("AA---->", content);

                    let checkerror = await sendEmail(content);
                    console.log("AA---->", checkerror);

                    sendResponse(req, res, 200, {
                        status: true,
                        body: staffFullDetails,
                        message: "successfully created individual doctor staff",
                        errorCode: null,
                    });
                } else {
                    let userFind = await PortalUser.findOne(
                        {
                            email: email.toLowerCase(),
                            isDeleted: false
                        }
                    );
                    if (userFind) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: userFind,
                            message: "Staff already exist",
                            errorCode: null,
                        });
                    }
                    console.log("userFinduserFind", userFind);
                    const salt = await bcrypt.genSalt(10);
                    let newPassword = await bcrypt.hash(password, salt);
                    var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
                    let userData = new PortalUser(
                        {
                            full_name: first_name + " " + middle_name + " " + last_name,
                            user_id: sequenceDocument.sequence_value,
                            email,
                            country_code: countryCode,
                            mobile,
                            role: "INDIVIDUAL_DOCTOR_STAFF",
                            password: newPassword,
                            profile_picture: profilePic,
                            created_by_user: creatorId
                        }
                    );
                    let userDetails = await userData.save();
                    console.log("userDetails", userDetails);
                    let locationData = new LocationInfo(
                        {
                            ...addressInfo,
                            for_portal_user: userDetails._id
                        }
                    );
                    console.log("locationData-->", locationData);
                    let locationDetails = await locationData.save();
                    console.log("locationDetails-->", locationDetails);

                    let profileData = new ProfileInfo(
                        {
                            name: first_name + " " + middle_name + " " + last_name,
                            first_name,
                            middle_name,
                            last_name,
                            dob,
                            language,
                            about: aboutStaff,
                            profile_picture: profilePic,
                            in_location: locationDetails._id,
                            for_portal_user: userDetails._id,
                        }
                    );
                    let staffProfileDetails = await profileData.save()
                    let staffData = new StaffInfo(
                        {
                            name: first_name + " " + middle_name + " " + last_name,
                            in_profile: staffProfileDetails._id,
                            role,
                            for_doctor: assignToDoctor,
                            for_staff: assignToStaff,
                            specialty,
                            // services,
                            // department,
                            // unit,
                            // expertise,
                            in_hospital: creatorId,
                            for_portal_user: userDetails._id,
                            profile_picture: profilePic,
                            doj: doj
                        }
                    );
                    let staffDetails = await staffData.save()
                    let staffFullDetails = await StaffInfo.findOne({ _id: staffDetails._id })
                        .populate({
                            path: "in_profile",
                            populate: {
                                path: 'in_location',
                                populate: {
                                    path: "for_portal_user"
                                }
                            },
                        })
                    const content = sendStaffDetails(email, password, 'Doctor');
                    console.log("AA---->", content);

                    let checkerror = await sendEmail(content);
                    console.log("AA---->", checkerror);

                    sendResponse(req, res, 200, {
                        status: true,
                        body: staffFullDetails,
                        message: "successfully created individual doctor staff",
                        errorCode: null,
                    });
                }
            }
        //     if (checkCondition?.statusData === "active") {
        //             for (const data12 of checkCondition?.data1?.services) {
        //                 if (data12?.name === 'staff' && data12?.is_unlimited === false) {
        //                     if (staffCount < data12?.max_number) {
        //                         let userFind = await PortalUser.findOne(
        //                             {
        //                                 email: email.toLowerCase(),
        //                                 isDeleted: false
        //                             }
        //                         );
        //                         if (userFind) {
        //                             return sendResponse(req, res, 200, {
        //                                 status: false,
        //                                 body: userFind,
        //                                 message: "Staff already exist",
        //                                 errorCode: null,
        //                             });
        //                         }
        //                         console.log("userFinduserFind",userFind);
        //                         const salt = await bcrypt.genSalt(10);
        //                         let newPassword = await bcrypt.hash(password, salt);
        //                         var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
        //                         let userData = new PortalUser(
        //                             {
        //                                 full_name: first_name + " " + middle_name + " " + last_name,
        //                                 user_id: sequenceDocument.sequence_value,
        //                                 email,
        //                                 country_code: countryCode,
        //                                 mobile,
        //                                 role: "INDIVIDUAL_DOCTOR_STAFF",
        //                                 password: newPassword,
        //                                 profile_picture: profilePic,
        //                                 created_by_user : creatorId
        //                             }
        //                         );
        //                         let userDetails = await userData.save();
        //                         console.log("userDetails",userDetails);
        //                         let locationData = new LocationInfo(
        //                             {
        //                                 ...addressInfo,
        //                                 for_portal_user: userDetails._id
        //                             }
        //                         );
        //                         console.log("locationData-->", locationData);
        //                         let locationDetails = await locationData.save();
        //                         console.log("locationDetails-->", locationDetails);
                    
        //                         let profileData = new ProfileInfo(
        //                             {
        //                                 name: first_name + " " + middle_name + " " + last_name,
        //                                 first_name,
        //                                 middle_name,
        //                                 last_name,
        //                                 dob,
        //                                 language,
        //                                 about: aboutStaff,
        //                                 profile_picture: profilePic,
        //                                 in_location: locationDetails._id,
        //                                 for_portal_user: userDetails._id,
        //                             }
        //                         );
        //                         let staffProfileDetails = await profileData.save()
        //                         let staffData = new StaffInfo(
        //                             {
        //                                 name: first_name + " " + middle_name + " " + last_name,
        //                                 in_profile: staffProfileDetails._id,
        //                                 role,
        //                                 for_doctor: assignToDoctor,
        //                                 for_staff: assignToStaff,
        //                                 specialty,
        //                                 // services,
        //                                 // department,
        //                                 // unit,
        //                                 // expertise,
        //                                 in_hospital: creatorId,
        //                                 for_portal_user: userDetails._id,
        //                                 profile_picture: profilePic,
        //                                 doj:doj
        //                             }
        //                         );
        //                         let staffDetails = await staffData.save()
        //                         let staffFullDetails = await StaffInfo.findOne({ _id: staffDetails._id })
        //                             .populate({
        //                                 path: "in_profile",
        //                                 populate: {
        //                                     path: 'in_location',
        //                                     populate: {
        //                                         path: "for_portal_user"
        //                                     }
        //                                 },
        //                             })
        //                             const content = sendStaffDetails(email, password, 'Doctor');
        //                             console.log("AA---->",content);
                        
        //                             let checkerror =  await sendEmail(content);
        //                             console.log("AA---->",checkerror);
                    
        //                         sendResponse(req, res, 200, {
        //                             status: true,
        //                             body: staffFullDetails,
        //                             message: "successfully created individual doctor staff",
        //                             errorCode: null,
        //                         });

        //                     }else {
        //                         return sendResponse(req, res, 200, {
        //                             status: false,
        //                             body: null,
        //                             message: "Unable to add Staff. As Staff Maximum limit has exceeded as per your purchased plan.",
        //                             errorCode: null,
        //                         });
        //                     }
        //                 }else{
        //             let userFind = await PortalUser.findOne(
        //                 {
        //                     email: email.toLowerCase(),
        //                     isDeleted: false
        //                 }
        //             );
        //             if (userFind) {
        //                 return sendResponse(req, res, 200, {
        //                     status: false,
        //                     body: userFind,
        //                     message: "Staff already exist",
        //                     errorCode: null,
        //                 });
        //             }
        //             console.log("userFinduserFind",userFind);
        //             const salt = await bcrypt.genSalt(10);
        //             let newPassword = await bcrypt.hash(password, salt);
        //             var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
        //             let userData = new PortalUser(
        //                 {
        //                     full_name: first_name + " " + middle_name + " " + last_name,
        //                     user_id: sequenceDocument.sequence_value,
        //                     email,
        //                     country_code: countryCode,
        //                     mobile,
        //                     role: "INDIVIDUAL_DOCTOR_STAFF",
        //                     password: newPassword,
        //                     profile_picture: profilePic,
        //                     created_by_user : creatorId
        //                 }
        //             );
        //             let userDetails = await userData.save();
        //             console.log("userDetails",userDetails);
        //             let locationData = new LocationInfo(
        //                 {
        //                     ...addressInfo,
        //                     for_portal_user: userDetails._id
        //                 }
        //             );
        //             console.log("locationData-->", locationData);
        //             let locationDetails = await locationData.save();
        //             console.log("locationDetails-->", locationDetails);
        
        //             let profileData = new ProfileInfo(
        //                 {
        //                     name: first_name + " " + middle_name + " " + last_name,
        //                     first_name,
        //                     middle_name,
        //                     last_name,
        //                     dob,
        //                     language,
        //                     about: aboutStaff,
        //                     profile_picture: profilePic,
        //                     in_location: locationDetails._id,
        //                     for_portal_user: userDetails._id,
        //                 }
        //             );
        //             let staffProfileDetails = await profileData.save()
        //             let staffData = new StaffInfo(
        //                 {
        //                     name: first_name + " " + middle_name + " " + last_name,
        //                     in_profile: staffProfileDetails._id,
        //                     role,
        //                     for_doctor: assignToDoctor,
        //                     for_staff: assignToStaff,
        //                     specialty,
        //                     // services,
        //                     // department,
        //                     // unit,
        //                     // expertise,
        //                     in_hospital: creatorId,
        //                     for_portal_user: userDetails._id,
        //                     profile_picture: profilePic,
        //                     doj:doj
        //                 }
        //             );
        //             let staffDetails = await staffData.save()
        //             let staffFullDetails = await StaffInfo.findOne({ _id: staffDetails._id })
        //                 .populate({
        //                     path: "in_profile",
        //                     populate: {
        //                         path: 'in_location',
        //                         populate: {
        //                             path: "for_portal_user"
        //                         }
        //                     },
        //                 })
        //                 const content = sendStaffDetails(email, password, 'Doctor');
        //                 console.log("AA---->",content);
            
        //                 let checkerror =  await sendEmail(content);
        //                 console.log("AA---->",checkerror);
        
        //             sendResponse(req, res, 200, {
        //                 status: true,
        //                 body: staffFullDetails,
        //                 message: "successfully created individual doctor staff",
        //                 errorCode: null,
        //             });
        //         }
        //     }
        // }
        } catch (error) {
            console.log("Check errorr",error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to create individual doctor staff",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async editStaff(req, res) {
        const {
            staffId,
            staffName,
            first_name,
            middle_name,
            last_name,
            email,
            dob,
            language,
            addressInfo,
            password,
            countryCode,
            mobile,
            role,
            assignToDoctor,
            assignToStaff,
            aboutStaff,
            specialty,
            // services,
            // department,
            // unit,
            // expertise,
            profilePic,
            creatorId,
            doj
        } = req.body;
        try {

            const locationDetails = await LocationInfo.findOneAndUpdate(
                { for_portal_user: staffId },
                {
                    $set: {
                        ...addressInfo
                    }
                },
                { upsert: false, new: true }
            )

            const staffProfileDetails = await ProfileInfo.findOneAndUpdate(
                { for_portal_user: staffId },
                {
                    $set: {
                        name: first_name + " " + middle_name + " " + last_name,
                        first_name,
                        middle_name,
                        last_name,
                        dob,
                        language,
                        about: aboutStaff,
                        profile_picture: profilePic,
                        in_location: locationDetails._id,

                    },
                },
                { upsert: false, new: true }
            )

            const staffDetails = await StaffInfo.findOneAndUpdate(
                { for_portal_user: staffId },
                {
                    $set: {
                        name: first_name + " " + middle_name + " " + last_name,
                        in_profile: staffProfileDetails._id,
                        role,
                        for_doctor: assignToDoctor,
                        for_staff: assignToStaff,
                        specialty,
                        // services,
                        // department,
                        // unit,
                        // expertise,mobile
                        // in_hospital: creatorId,
                        profile_picture: profilePic,
                        doj:doj
                    },
                },
                { upsert: false, new: true }
            )
            const PortalUserDetails = await PortalUser.findOneAndUpdate(
                { _id: staffId },
                {
                    $set: {
                        country_code: countryCode,
                        mobile: mobile,
                        full_name: `${first_name} ${middle_name} ${last_name}`,
                        profile_picture: profilePic,
                        email:email
                    },
                },
                { upsert: false, new: true }
            )
            let staffFullDetails = await StaffInfo.findOne({ for_portal_user: staffId })
                .populate({
                    path: "in_profile",
                    populate: {
                        path: 'in_location',
                        populate: {
                            path: "for_portal_user"
                        }
                    },
                })

            sendResponse(req, res, 200, {
                status: true,
                body: staffFullDetails,
                message: "successfully updated individual doctor staff",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update individual doctor staff",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getStaffDetails(req, res) {
        try {
            const { hospitalStaffId } = req.query
            let staffFullDetails = await StaffInfo.findOne({ for_portal_user: hospitalStaffId })
                .populate({
                    path: "in_profile",
                    populate: {
                        path: 'in_location',
                        populate: {
                            path: "for_portal_user"
                        }
                    },
                })
                .populate({
                    path: "role",
                })
                .populate({
                    path: 'specialty'
                })
            console.log(staffFullDetails?.unit, "staffFullDetails");
            let department = staffFullDetails?.department;
            let departdetails = [];
            if (department?.length > 0) {
                departdetails = await department_info.find({ _id: { $in: department } });
            }

            let service = staffFullDetails?.services;
            let servicedetails = [];
            if (service?.length > 0) {
                servicedetails = await service_info.find({ _id: { $in: service } });
            }
            let unit = staffFullDetails?.unit;
            let unitdetails = [];
            if (unit?.length > 0) {
                unitdetails = await unit_info.find({ _id: { $in: unit } });
            }
            let doctorIds = staffFullDetails?.for_doctor;
            let doctorDetails = [];
            if (doctorIds?.length > 0) {
                doctorDetails = await basic_info.find({ for_portal_user: { $in: doctorIds } });
            }
            const profilePicKey = staffFullDetails?.in_profile?.profile_picture;
            console.log("profilePicKey1", staffFullDetails);

            const profilePictureArray = [profilePicKey]
            if (profilePicKey != "") {
                const resData = await httpService.postStaging('hospital/get-signed-url', { url: profilePictureArray }, {}, 'hospitalServiceUrl');
                staffFullDetails.in_profile.profile_picture = resData.data[0]
            } else {
                staffFullDetails.in_profile.profile_picture = ""
            }

            let result = {
                _id: staffFullDetails._id,
                in_profile: staffFullDetails?.in_profile,
                role: staffFullDetails?.role,
                specialty: staffFullDetails?.specialty,
                departdetails: departdetails,
                servicedetails: servicedetails,
                unitdetails: unitdetails,
                doctorDetails: doctorDetails,
                doj:staffFullDetails?.doj
            }

            console.log("result>>>>>>>>>",result)

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully get individual doctor staff details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get individual doctor staff details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllStaff(req, res) {
        try {
            const { hospitalId, limit, page, searchText, role } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined)  {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            }else{
                sortingarray['createdAt'] = -1;
            }
            var filter = {}
            if (role != "" && searchText != "") {
                filter = {
                    isDeleted: false,
                    "roles._id": mongoose.Types.ObjectId(role),
                    "profileinfos.name": { $regex: searchText || '', $options: "i" },
                    in_hospital: mongoose.Types.ObjectId(hospitalId),
                    "portalusers.isDeleted":false
                }
            } else if (role != "" && searchText == "") {
                filter = {
                    isDeleted: false,
                    "roles._id": mongoose.Types.ObjectId(role),
                    in_hospital: mongoose.Types.ObjectId(hospitalId)
                }
            } else if (role == "" && searchText != "") {
                filter = {
                    isDeleted: false,
                    in_hospital: mongoose.Types.ObjectId(hospitalId),
                    "profileinfos.name": { $regex: searchText || '', $options: "i" },
                }
            } else if (role == "" && searchText == "") {
                filter = {
                    isDeleted: false,
                    in_hospital: mongoose.Types.ObjectId(hospitalId)
                }
            }
            const query = [
                {
                    $lookup: {
                        from: "profileinfos",
                        localField: "in_profile",
                        foreignField: "_id",
                        as: "profileinfos",
                    }
                },
                { $unwind: "$profileinfos" },
                {
                    $lookup: {
                        from: "roles",
                        localField: "role",
                        foreignField: "_id",
                        as: "roles",
                    }
                },
                { $unwind: "$roles" },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "portalusers",
                    }
                },
                { $unwind: "$portalusers" },
                {
                    $match: filter
                },
                {
                    $facet: {
                        totalCount: [
                            {
                                $count: 'count'
                            }
                        ],
                        paginatedResults: [{$sort: sortingarray},{ $skip: (page - 1) * limit }, { $limit: limit * 1 }],
                    }
                },
            ]
            let staffFullDetails = await StaffInfo.aggregate(query)

            for (let index = 0; index < staffFullDetails[0].paginatedResults.length; index++) {
                staffFullDetails[0].paginatedResults[index].profileinfos.profilePictureSignedUrl = ""
                const profilePicKey = staffFullDetails[0].paginatedResults[index].profileinfos.profile_picture;
                if (profilePicKey != "") {
                    const profilePictureArray = [profilePicKey]
                    const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArray }, {}, 'pharmacyServiceUrl');
                    staffFullDetails[0].paginatedResults[index].profileinfos.profilePictureSignedUrl = pharmacyLogo.data[0]
                }
            }

            console.log("staffFullDetails", staffFullDetails);
            sendResponse(req, res, 200, {
                status: true,
                body: staffFullDetails,
                message: "successfully get all individual doctor staff",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get all individual doctor staff",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllStaffWithoutPagination(req, res) {
        try {
            const { hospitalId } = req.query
            var filter = {
                in_hospital: mongoose.Types.ObjectId(hospitalId),
                "portalusers.isDeleted":false
            }
            const query = [
                {
                    $lookup: {
                        from: "profileinfos",
                        localField: "in_profile",
                        foreignField: "_id",
                        as: "profileinfos",
                    }
                },
                { $unwind: "$profileinfos" },
                {
                    $lookup: {
                        from: "roles",
                        localField: "role",
                        foreignField: "_id",
                        as: "roles",
                    }
                },
                { $unwind: "$roles" },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "portalusers",
                    }
                },
                { $unwind: "$portalusers" },
                {
                    $match: filter
                },
            ]
            let staffFullDetails = await StaffInfo.aggregate(query)

            sendResponse(req, res, 200, {
                status: true,
                body: staffFullDetails,
                message: "successfully get all individual doctor staff",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get all individual doctor staff",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async actionForStaff(req, res) {
        try {
            const { staff_id, action_name, action_value } = req.body

            const filter = {}
            if (action_name == "active") filter['isActive'] = action_value
            if (action_name == "lock") filter['lock_user'] = action_value
            if (action_name == "delete") filter['isDeleted'] = action_value
            var updatedStaffDetails = await PortalUser.updateOne(
                { _id: staff_id },
                filter,
                { new: true }
            );
            var updatedStaffInfo = await StaffInfo.updateOne(
                { for_portal_user: staff_id },
                filter,
                { new: true }
            );
            sendResponse(req, res, 200, {
                status: true,
                body: updatedStaffDetails,
                message: `successfully ${action_name} individual doctor staff`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to fetch individual doctor staff list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
}

export const getData = async (data) => {
    let result = {
        statusData: '', // You can set an appropriate default value here
        data1: null
    };
  
    for (const data1 of data) {
        let d = new Date();
        var g1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var g2 = new Date(data1?.expiry_date);
  
        if (g1.getTime() < g2.getTime()) {
            result.statusData = 'active';
            result.data1 = data1;
            break;
        }
    }
    return result;
  }
  
module.exports = new IndividualDoctorStaffController();