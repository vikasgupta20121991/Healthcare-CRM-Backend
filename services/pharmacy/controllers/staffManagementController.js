"use strict";

import mongoose from "mongoose";
// models
import PortalUser from "../models/portal_user";
import StaffInfo from "../models/staff_info";
import LocationDetails from "../models/location_info";
import DocumentInfo from "../models/document_info";

// utils
import { sendResponse } from "../helpers/transmission";
import { hashPassword } from "../helpers/string";
import { uploadFile, getFile,getDocument } from "../helpers/s3";
import { sendEmail } from "../helpers/ses";
import { sendStaffDetails } from "../helpers/emailTemplate";
import SubscriptionPurchaseStatus from "../models/subscription/purchasestatus"
const getDocumentObject = async (req, userId) => {
    let staff_profile_object = {}
    if (req.files) {
        if ('staff_profile' in req.files) {
            const s3result = await uploadFile(req.files.staff_profile.data, {
                Bucket: 'healthcare-crm-stage-docs',
                Key: `pharmacy/${userId}/staff-profile/${req.files.staff_profile.name}`,
            })
            staff_profile_object['name'] = req.files.staff_profile.name
            staff_profile_object['code'] = 'staff-profile'
            staff_profile_object['e_tag'] = s3result.ETag
            staff_profile_object['url'] = s3result.Key
        } else {
            staff_profile_object = {}
        }
    }
    return {
        staff_profile_object,
    }
}
class StaffManagementController {

    async addStaff(req, res) {
        const { staff_name, first_name, middle_name, last_name, dob, language, address, neighborhood, country, region, province, department, city, village, pincode, email, phone_number, country_code, degree, role, password, about, userId,doj } = req.body;
        try {

            // const staffCount = await PortalUser.countDocuments({staff_createdBy:userId,isDeleted:false});
            // const checkPlan = await SubscriptionPurchaseStatus.find({for_user:userId});
            const checkUser = await PortalUser.findOne({_id:userId});
            let staffCount = {};
            let checkPlan={};
            if (checkUser?.role === 'PHARMACY_STAFF') {
                staffCount = await PortalUser.countDocuments({ staff_createdBy: checkUser?.staff_createdBy, isDeleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: checkUser?.staff_createdBy });
            } else {
                staffCount = await PortalUser.countDocuments({ staff_createdBy: userId, isDeleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: userId });
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
                    console.log(language, "languagell________");
                    const selectedLanguagesArray = JSON.parse(language);
                    const userExist = await PortalUser.find({ email, isDeleted: false });
                    // const userExist1 = await PortalUser.find({ phone_number });
                    if (userExist.length > 0) {
                        sendResponse(req, res, 500, {
                            status: false,
                            data: null,
                            message: `user email already exists`,
                            errorCode: "INTERNAL_SERVER_ERROR",
                        });
                        return
                    }
                    const passwordHash = await hashPassword(password);
                    // Portal user details
                    const portalUserDetails = new PortalUser({
                        email, phone_number, user_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name, country_code, password: passwordHash, role: "PHARMACY_STAFF", staff_createdBy: userId
                    })
                    const portalData = await portalUserDetails.save();
                    //Location details
                    const locationObject = { address, neighborhood, pincode, for_portal_user: portalData._id }
                    if (department) locationObject['department'] = department
                    if (country) locationObject['nationality'] = country
                    if (region) locationObject['region'] = region
                    if (province) locationObject['province'] = province
                    if (city) locationObject['city'] = city
                    if (village) locationObject['village'] = village
                    const locationDetails = new LocationDetails(locationObject)
                    const locationData = await locationDetails.save();
                    //Handle Image Upload
                    const result = await getDocumentObject(req, portalData._id)
                    let staff_profile
                    if (Object.values(result.staff_profile_object).length > 0) {
                        const saveDoc = new DocumentInfo({
                            name: result.staff_profile_object.name,
                            code: result.staff_profile_object.code,
                            e_tag: result.staff_profile_object.e_tag,
                            url: result.staff_profile_object.url,
                            for_portal_user: portalData._id,
                            uploaded_by: userId
                        })
                        const ass_doc = await saveDoc.save()
                        staff_profile = ass_doc._id
                        const profilePicture = await PortalUser.findByIdAndUpdate({ _id: portalData._id }, { profile_picture: result.staff_profile_object.url },
                            { new: true })
                    }

                    const staffDetails = new StaffInfo({
                        role, staff_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name, dob, language: selectedLanguagesArray, in_location: locationData._id, staff_profile, degree, about, for_staff: userId, for_portal_user: portalData._id,doj:doj
                    })
                    await staffDetails.save()
                    const content = sendStaffDetails(email, password, 'Pharmacy');
                    console.log("AA---->", content);

                    let checkerror = await sendEmail(content);
                    console.log("AA---->", checkerror);
                    sendResponse(req, res, 200, {
                        status: true,
                        data: null,
                        message: `staff added successfully`,
                        errorCode: null,
                    });
                } else {
                    console.log(language, "languagell________");
                    const selectedLanguagesArray = JSON.parse(language);
                    const userExist = await PortalUser.find({ email, isDeleted: false });
                    // const userExist1 = await PortalUser.find({ phone_number });
                    if (userExist.length > 0) {
                        sendResponse(req, res, 500, {
                            status: false,
                            data: null,
                            message: `user email already exists`,
                            errorCode: "INTERNAL_SERVER_ERROR",
                        });
                        return
                    }
                    const passwordHash = await hashPassword(password);
                    // Portal user details
                    const portalUserDetails = new PortalUser({
                        email, phone_number, user_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name, country_code, password: passwordHash, role: "PHARMACY_STAFF", staff_createdBy: userId
                    })
                    const portalData = await portalUserDetails.save();
                    //Location details
                    const locationObject = { address, neighborhood, pincode, for_portal_user: portalData._id }
                    if (department) locationObject['department'] = department
                    if (country) locationObject['nationality'] = country
                    if (region) locationObject['region'] = region
                    if (province) locationObject['province'] = province
                    if (city) locationObject['city'] = city
                    if (village) locationObject['village'] = village
                    const locationDetails = new LocationDetails(locationObject)
                    const locationData = await locationDetails.save();
                    //Handle Image Upload
                    const result = await getDocumentObject(req, portalData._id)
                    let staff_profile
                    if (Object.values(result.staff_profile_object).length > 0) {
                        const saveDoc = new DocumentInfo({
                            name: result.staff_profile_object.name,
                            code: result.staff_profile_object.code,
                            e_tag: result.staff_profile_object.e_tag,
                            url: result.staff_profile_object.url,
                            for_portal_user: portalData._id,
                            uploaded_by: userId
                        })
                        const ass_doc = await saveDoc.save()
                        staff_profile = ass_doc._id
                        const profilePicture = await PortalUser.findByIdAndUpdate({ _id: portalData._id }, { profile_picture: result.staff_profile_object.url },
                            { new: true })
                    }

                    const staffDetails = new StaffInfo({
                        role, staff_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name, dob, language: selectedLanguagesArray, in_location: locationData._id, staff_profile, degree, about, for_staff: userId, for_portal_user: portalData._id,doj:doj
                    })
                    await staffDetails.save()
                    const content = sendStaffDetails(email, password, 'Pharmacy');
                    console.log("AA---->", content);

                    let checkerror = await sendEmail(content);
                    console.log("AA---->", checkerror);
                    sendResponse(req, res, 200, {
                        status: true,
                        data: null,
                        message: `staff added successfully`,
                        errorCode: null,
                    });
                }

            }
            
        } catch (err) {
            console.log("CheckRR=----->",err);           
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async editStaff(req, res) {
        const { id, staff_name, first_name, middle_name, last_name,email, dob, language, address, neighbourhood, country, region, province, department, city, village, pincode, role, about, degree, old_staff_profile, userId, country_code, phone,doj } = req.body;
        console.log("req.body", req.body);
        try {

            const selectedLanguagesArray = JSON.parse(language);
            const userExist = await StaffInfo.find({ for_portal_user: { $eq: id } });
            if (userExist.length <= 0) {
                sendResponse(req, res, 500, {
                    status: false,
                    data: null,
                    message: `staff not exists`,
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
                return
            }
            const result = await getDocumentObject(req, id)
            console.log(result, 'result');
            let staff_profile = ''
            if (Object.values(result.staff_profile_object).length > 0) {
                const saveDoc = new DocumentInfo({
                    name: result.staff_profile_object.name,
                    code: result.staff_profile_object.code,
                    e_tag: result.staff_profile_object.e_tag,
                    url: result.staff_profile_object.url,
                    for_portal_user: id,
                    uploaded_by: id
                })
                const ass_doc = await saveDoc.save()
                staff_profile = ass_doc._id
            }
            const PortalUserDetails = await PortalUser.findOneAndUpdate(
                { _id: id },
                {
                    $set: {
                        country_code: country_code,
                        phone_number: phone,
                        user_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name,
                        staff_createdBy: userId,
                        profile_picture: result.staff_profile_object.url,
                        email:email
                    },
                },
                { upsert: false, new: true }
            )
            //Location details
            const locationObject = {
                address,
                neighborhood: neighbourhood,
                pincode,
                nationality: country == '' ? null : country,
                department: department == '' ? null : department,
                region: region == '' ? null : region,
                province: province == '' ? null : province,
                city: city == '' ? null : city,
                village: village == '' ? null : village
            }
            console.log("locationObject", locationObject);          
            const updateLocationDetails = await LocationDetails.findOneAndUpdate(
                { _id: userExist[0].in_location },
                {
                    $set: locationObject
                },
                { new: true }
            )
            //Handle Image Upload
            // const result = await getDocumentObject(req, id)
            // console.log(result, 'result');
            // let staff_profile = ''
            // if (Object.values(result.staff_profile_object).length > 0) {
            //     const saveDoc = new DocumentInfo({
            //         name: result.staff_profile_object.name,
            //         code: result.staff_profile_object.code,
            //         e_tag: result.staff_profile_object.e_tag,
            //         url: result.staff_profile_object.url,
            //         for_portal_user: id,
            //         uploaded_by: id
            //     })
            //     const ass_doc = await saveDoc.save()
            //     staff_profile = ass_doc._id
            // }
            //Staff Info
            let infoObject = {
                role, staff_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name, dob, language:selectedLanguagesArray, degree, about,doj:doj
            }
            if (staff_profile) {
                infoObject['staff_profile'] = staff_profile
            }
            await StaffInfo.findOneAndUpdate(
                { for_portal_user: { $eq: id } },
                {
                    $set: infoObject
                },
                { new: true }
            )

            sendResponse(req, res, 200, {
                status: true,
                data: null,
                message: `staff updated successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getDocument(req, res) {
        try {
            const { userId, docType, docName } = req.body;
            const result = getFile({
                Bucket: 'healthcare-crm-stage-docs',
                Key: `pharmacy/${userId}/${docType}/${docName}`,
                Expires: 60 * 5
            })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `file fetched successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get file url`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listStaff(req, res) {
        try {
            var { page, limit, admin_id, role_id, searchKey } = req.query;
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;

            }

            let checkUser = await PortalUser.findOne({_id:mongoose.Types.ObjectId(admin_id)});

            if(checkUser.role === 'PHARMACY_STAFF'){

                let adminData = await StaffInfo.findOne({for_portal_user:mongoose.Types.ObjectId(admin_id)});

                admin_id = adminData?.for_staff

            }

            var filter = {
                'for_portal_user.role': 'PHARMACY_STAFF',
                'for_portal_user.isDeleted': false,
                for_staff: mongoose.Types.ObjectId(admin_id),
                'role.status': true,
                'role.is_delete': 'No'
            };
            if (searchKey) {
                filter['staff_name'] = { $regex: searchKey || "", $options: "i" }
            }
            if(role_id) {
                filter['role._id'] = mongoose.Types.ObjectId(role_id)
            }
            let aggregate = [
                {
                    $lookup: {
                        from: "roles",
                        localField: "role",
                        foreignField: "_id",
                        as: "role",
                    }
                },
                { $unwind: "$role" },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user"
                    }
                },
                { $unwind: "$for_portal_user" },
                { $match: filter },
                {
                    $project: {
                        _id: 0,
                        doj: 1,
                        staff_name: 1,
                        role: {
                            name: "$role.name",
                            _id:"$role._id"
                        },
                        createdAt: 1,
                        for_portal_user: {
                            _id: '$for_portal_user._id',
                            country_code: '$for_portal_user.country_code',
                            email: '$for_portal_user.email',
                            isActive: '$for_portal_user.isActive',
                            lock_user: '$for_portal_user.lock_user',
                            phone_number: '$for_portal_user.phone_number',
                        }
                    }
                },
            ];
            const totalCount = await StaffInfo.aggregate(aggregate);
            aggregate.push({
                $sort:sortingarray
            },
                { $limit: limit * 1 },
                { $skip: (page - 1) * limit })
            const result = await StaffInfo.aggregate(aggregate);

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: result,
                    totalCount: totalCount.length
                },
                message: `staff fetched successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllStaff(req, res) {
        try {
            var filter = {
                'for_portal_user.role': 'PHARMACY_STAFF',
                'for_portal_user.isDeleted': false,
                for_staff: mongoose.Types.ObjectId(req.query.for_user),
                'role.status': true,
                'role.is_delete': 'No'
            };
            let aggregate = [
                {
                    $lookup: {
                        from: "roles",
                        localField: "role",
                        foreignField: "_id",
                        as: "role",
                    }
                },
                { $unwind: "$role" },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: "$for_portal_user" },
                { $match: filter },
                {
                    $project: {
                        staff_name: 1,
                        for_portal_user: {
                            _id: '$for_portal_user._id',
                        }
                    }
                },
            ];
            const result = await StaffInfo.aggregate(aggregate);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "fetched all staff",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "failed to fetch insurance staff",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async viewStaff(req, res) {
        try {
            const { userId } = req.query;
            const result = await PortalUser.find({
                _id: { $eq: userId },
                role: 'PHARMACY_STAFF',
                isDeleted: false
            })
                .select({ email: 1, country_code: 1, phone_number: 1 })
                .exec();

            const staffInfo = await StaffInfo.find({
                for_portal_user: { $eq: userId },
            })
                .populate({
                    path: "in_location",
                })
                .populate({
                    path: "staff_profile",
                    select: { url: 1 }
                })
                .populate({
                    path: "role",
                    select: { name: 1 }
                })
                .exec();

            console.log(staffInfo, 'staffInfo');

            let documentURL = ''
            if (staffInfo[0] && staffInfo[0].staff_profile) {
                documentURL = await getFile({
                    Bucket: 'healthcare-crm-stage-docs',
                    Key: staffInfo[0].staff_profile.url,
                    Expires: 60 * 5
                })
            }


            sendResponse(req, res, 200, {
                status: true,
                data: {
                    profileData: result,
                    staffInfo: staffInfo,
                    documentURL
                },
                message: `staff fetched successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async deleteActiveLockStaff(req, res) {
        let actionMessage;
        try {
            const { action_name, action_value, staff_id } = req.body
            console.log(req.body, 'req.body');
            let key;
            key = action_name === "delete" ? 'isDeleted' : action_name === "lock" ? "lock_user" : action_name === "active" ? "isActive" : ''
            console.log(key, 'key');
            if (key) {
                const portalData = await PortalUser.findOneAndUpdate(
                    { _id: { $eq: staff_id } },
                    {
                        $set: {
                            [key]: action_value
                        }
                    },
                    { new: true },
                )
                if (action_name === "active" && action_value) {
                    actionMessage = "actived"
                } else if (action_name === "active" && !action_value) {
                    actionMessage = "deactived"
                }
                if (action_name === "delete" && action_value) {
                    actionMessage = "deleted"
                }
                if (action_name === "lock" && action_value) {
                    actionMessage = "locked"
                } else if (action_name === "lock" && !action_value) {
                    actionMessage = "unlocked"
                }
                sendResponse(req, res, 200, {
                    status: true,
                    data: null,
                    message: `staff ${actionMessage} successfully`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 500, {
                    status: false,
                    data: null,
                    message: `Something went wrong`,
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to ${actionMessage} staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listCategoryStaff(req, res) {
        try {
            const { pharmacyId, staffRoleId } = req.query
            const staffList = await StaffInfo.find({ for_staff: pharmacyId, role: staffRoleId })
            // const staffInfo = await StaffInfo.aggregate([
            //     {
            //         $lookup: {
            //             from: "roles",
            //             localField: "role",
            //             foreignField: "_id",
            //             as: "roles",
            //         }
            //     },
            //     {
            //         $match: {
            //             for_staff: mongoose.Types.ObjectId(pharmacyId)
            //         }
            //     },
            //     { $unwind: "$roles" },
            //     {
            //         $addFields: {
            //             staffRole: "$roles.name",
            //         }
            //     },
            //     {
            //         $unset: "roles"
            //     },
            // ])
            sendResponse(req, res, 200, {
                status: true,
                data: staffList,
                message: `Get staff list successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to get staff list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    // async pharmacyListForChat(req, res) {
    //     try {
    //         const { page, limit, searchKey, admin_id } = req.query;

    //         let matchFilter = {
    //             isDeleted: false,
    //             _id: mongoose.Types.ObjectId(admin_id)
    //         };
    //         var filter = {}

    //         if (searchKey && searchKey !== "") {
    //           filter["$or"] = [
    //             // {
    //             //   groupName: { $regex: searchKey, $options: "i" },
    //             // },
    //             {
    //               user_name: { $regex: searchKey, $options: "i" },
    //             },
    //           ];
    //         }

    //         let getLoginUserData = await PortalUser.findOne(matchFilter);

    //         const parsedLimit = parseInt(limit);

    //         let aggregate;

    //         if (getLoginUserData?.role === 'PHARMACY_ADMIN') {
    //             aggregate = [
    //                 { $match: filter },
    //                 {
    //                     $lookup: {
    //                       from: "documentinfos",
    //                       localField: "_id",
    //                       foreignField: "for_portal_user",
    //                       as: "staff_image",
    //                     }
    //                 },
    //                 {
    //                     $unwind: {
    //                       path: "$staff_image",
    //                       preserveNullAndEmptyArrays: true
    //                     }
    //                 },
    //                 {
    //                     $match: {
    //                         isDeleted: false,
    //                         staff_createdBy: admin_id
    //                     }
    //                 },
    //                 {
    //                     $sort: { createdAt: -1 },
    //                 },
    //                 {
    //                     $skip: (page - 1) * parsedLimit,
    //                 },
    //                 {
    //                     $limit: parsedLimit,
    //                 },
    //             ];
    //         }

    //         if (getLoginUserData?.role === 'PHARMACY_STAFF') {
    //             aggregate = [
    //                 { $match: filter },
    //                 {
    //                     $lookup: {
    //                       from: "documentinfos",
    //                       localField: "_id",
    //                       foreignField: "for_portal_user",
    //                       as: "staff_image",
    //                     }
    //                   },
    //                   {
    //                     $unwind: {
    //                       path: "$staff_image",
    //                       preserveNullAndEmptyArrays: true
    //                     }
    //                   },
    //                   {
    //                     $lookup: {
    //                       from: "admininfos",
    //                       localField: "_id",
    //                       foreignField: "for_portal_user",
    //                       as: "admin_image",
    //                     }
    //                   },
    //                   {
    //                     $unwind: {
    //                       path: "$admin_image",
    //                       preserveNullAndEmptyArrays: true
    //                     }
    //                   },
    //                 {
    //                     $match: {
    //                         isDeleted: false,
    //                         $and: [
    //                             { _id: { $ne: mongoose.Types.ObjectId(admin_id) } },
    //                             {
    //                                 $or: [
    //                                     { _id: mongoose.Types.ObjectId(getLoginUserData.staff_createdBy) },
    //                                     { staff_createdBy: getLoginUserData.staff_createdBy }
    //                                 ]
    //                             }
    //                         ]
    //                     }
    //                 },
    //                 {
    //                     $sort: { createdAt: -1 },
    //                 },
    //                 {
    //                     $skip: (page - 1) * parsedLimit,
    //                 },
    //                 {
    //                     $limit: parsedLimit,
    //                 },
    //             ];
    //         }

    //         const result = await PortalUser.aggregate(aggregate);
    //         // console.log("aggregate [2] ::", aggregate);

    //         const uniqueDataObject = {}; // Object to store unique data by _id

    //         for (const doc of result) {
    //             if (!uniqueDataObject[doc._id]) {
    //                 let staffImage = null;
    //                 let adminImage = null;
            
    //                 if (doc.staff_image) {
    //                     staffImage = await getDocument(doc.staff_image.url);
    //                 }
            
    //                 if (doc.admin_image) {
    //                     adminImage = await getDocument(doc.admin_image.profile_picture);
    //                 }
            
    //                 uniqueDataObject[doc._id] = {
    //                     ...doc,
    //                     staff_image: staffImage || '',
    //                     admin_image: adminImage || ''
    //                 };
    //             }
    //         }
            
    //         const dataArray = Object.values(uniqueDataObject); // Convert object values to an array
            
    //         return res.status(200).json({
    //             status: true,
    //             data: {
    //                 data: dataArray,
    //                 totalCount: dataArray.length,
    //             },
    //             message: "Portal users fetched successfully",
    //             errorCode: null,
    //         });
            
    //     } catch (err) {
    //         console.log(err);
    //         return res.status(500).json({
    //             status: false,
    //             data: err,
    //             message: "Failed to fetch portal users",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async pharmacyListForChat(req, res) {
        try {
            const { page, limit, searchKey, admin_id } = req.query;

            let matchFilter = {
                isDeleted: false,
                _id: mongoose.Types.ObjectId(admin_id)
            };
            var filter = {}

            if (searchKey && searchKey !== "") {
              filter["$or"] = [
                // {
                //   groupName: { $regex: searchKey, $options: "i" },
                // },
                {
                  user_name: { $regex: searchKey, $options: "i" },
                },
              ];
            }

            let getLoginUserData = await PortalUser.findOne(matchFilter);

            const parsedLimit = parseInt(limit);

            let aggregate;

            if (getLoginUserData?.role === 'PHARMACY_ADMIN') {
                aggregate = [
                    { $match: filter },
                    // {
                    //     $match: {
                    //       $or: [ // Include PHARMACY_ADMIN users
                    //         {isDeleted: false, role: 'PHARMACY_ADMIN' },
                    //         { isDeleted: false, staff_createdBy: admin_id }
                    //       ]
                    //     }
                    // },
                    {
                        $match: {
                            isDeleted: false,
                            staff_createdBy: admin_id
                        }
                    },
                    {
                        $sort: { createdAt: -1 },
                    },
                    {
                        $skip: (page - 1) * parsedLimit,
                    },
                    {
                        $limit: parsedLimit,
                    },
                ];
            }

            if (getLoginUserData?.role === 'PHARMACY_STAFF') {
                aggregate = [
                    { $match: filter },
                    {
                        $match: {
                            isDeleted: false,
                            $and: [
                                { _id: { $ne: mongoose.Types.ObjectId(admin_id) } },
                                {
                                    $or: [
                                        { _id: mongoose.Types.ObjectId(getLoginUserData?.staff_createdBy) },
                                        { staff_createdBy: getLoginUserData?.staff_createdBy }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        $sort: { createdAt: -1 },
                    },
                    {
                        $skip: (page - 1) * parsedLimit,
                    },
                    {
                        $limit: parsedLimit,
                    },
                ];
            }

            const result = await PortalUser.aggregate(aggregate);

            const uniqueDataObject = {}; // Object to store unique data by _id

            for (const doc of result) {
                if (!uniqueDataObject[doc?._id]) {
                    let profilePic = null;
            
                    if (doc?.profile_picture) {
                        profilePic = await getDocument(doc?.profile_picture);
                    }
            
                    uniqueDataObject[doc?._id] = {
                        ...doc,
                        profile_picture: profilePic || ''
                    };
                }
            }
            
            const dataArray = Object.values(uniqueDataObject); // Convert object values to an array
            
            return res.status(200).json({
                status: true,
                data: {
                    data: dataArray,
                    totalCount: dataArray.length,
                },
                message: "Portal users fetched successfully",
                errorCode: null,
            });
            
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                status: false,
                data: err,
                message: "Failed to fetch portal users",
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
module.exports = new StaffManagementController();
