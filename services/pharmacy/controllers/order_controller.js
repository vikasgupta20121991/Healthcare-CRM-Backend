"use strict";

// models
import PortalUser from "../models/portal_user";
import OrderDetail from "../models/order/order_detail";
import AdminInfo from "../models/admin_info";
import MedicineDetail from "../models/order/medicine_detail";
import MedicineBill from "../models/order/medicine_bill";
import DocumentInfo from "../models/document_info";
const Http = require('../helpers/httpservice');

import mongoose from "mongoose";

// utils
import { sendResponse } from "../helpers/transmission";
import { config } from "../config/constants";
import { decryptionData } from "../helpers/crypto";
import { getNextSequenceValue } from "../middleware/utils";
import { getDocument } from "../helpers/s3";
import { notification } from "../helpers/notification";
import moment from "moment";

const httpService = new Http()

class OrderController {
    async newOrder(req, res) {
        try {
            const {
                from_user,
                patient_details,
                subscriber_id,
                insurance_no,
                request_type,
                for_portal_user,
                prescription_url,
                medicine_list,
                document_meta_data,
                action,
                eprescription_number,
                orderBy
            } = req.body;
            let medicineFrom
            const headers = {
                'Authorization': req.headers['authorization']
            }
            if (action == 'eprecription') {
                let checkEprescriptionNumberExist;
                // Check if e-prescription number is available or not
                checkEprescriptionNumberExist = await httpService.getStaging("hospital-doctor/check-eprescription-availability", { eprescription_number, test_type: 'Medicine' }, headers, "hospitalServiceUrl");
                if (!checkEprescriptionNumberExist.status) {
                    checkEprescriptionNumberExist = await httpService.getStaging("labimagingdentaloptical/checkEprescriptionAvailabilityForFourPortal", { eprescription_number }, headers, "labimagingdentalopticalServiceUrl")
                }

                if (!checkEprescriptionNumberExist.status) {
                    return sendResponse(req, res, 200, checkEprescriptionNumberExist);
                }
                const medicineDosage = checkEprescriptionNumberExist.body.medicineDosageData
                medicineFrom = medicineDosage
            } else {
                console.log("run1")
                medicineFrom = medicine_list
            }
            if (subscriber_id === undefined) {
                var subscriber = null
            }
            subscriber = subscriber_id
            var list = []
            let patientdetails;
            for (let index = 0; index < for_portal_user.length; index++) {
                const element = for_portal_user[index];
                const order_id = await getNextSequenceValue("orderid");
                var from_user_id = from_user.user_id;
                var patient_details_id = patient_details.user_id;
                var from_userdetails = await httpService.getStaging("patient/patient-details", { patient_id: from_user_id }, headers, "patientServiceUrl");
                var from_userimage = from_userdetails?.body?.personalDetails?.profile_pic;
                console.log("from_userimage-----", from_userimage);
                from_user.image = from_userimage
                patientdetails = await httpService.getStaging("patient/patient-details", { patient_id: patient_details_id }, headers, "patientServiceUrl");
                var patient_detailsimage = patientdetails?.body?.personalDetails?.profile_pic;
                patient_details.image = patient_detailsimage
                const obj = {
                    from_user: from_user,
                    patient_details: patient_details,
                    subscriber_id: subscriber,
                    insurance_no: '',
                    request_type: request_type,
                    for_portal_user: element,
                    order_id: "ORD-" + order_id,
                    orderBy:orderBy
                }
                list.push(obj)
            }

            const orderData = await OrderDetail.insertMany(list)

            let prescription_url_array = []
            if (prescription_url === undefined) {
                if (document_meta_data.length > 0) {
                    const results = await DocumentInfo.insertMany(document_meta_data);
                    const IDArray = []
                    for (const result of results) {
                        IDArray.push(result._id.toString());
                    }
                    prescription_url_array = IDArray
                }
            } else {
                prescription_url_array = prescription_url
            }
            const medicineDataArray = orderData.map((singleData) => ({
                prescription_url: prescription_url_array,
                for_portal_user: singleData.for_portal_user,
                for_order_id: singleData._id,
            }));
            const medicineBill = await MedicineBill.insertMany(medicineDataArray)

            let medicineDetails = null;
            if (medicineFrom.length >= 1) {
                var medicineList = []
                for (let index = 0; index < medicineBill.length; index++) {
                    for (let index1 = 0; index1 < medicineFrom.length; index1++) {
                        const medicine = medicineFrom[index1];
                        let obj = {}
                        if (action == 'eprecription') {
                            let prescribed = 0
                            let days = 0
                            let frequency = 0
                            if (medicine.take_for.type == 'Days') days = medicine.take_for.quantity
                            if (medicine.take_for.type == 'Week') days = parseInt(medicine.take_for.quantity) * 7
                            if (medicine.frequency.frequency_type == "Moment") {
                                frequency = (parseInt(medicine.frequency.morning) + parseInt(medicine.frequency.morning) + parseInt(medicine.frequency.morning) + parseInt(medicine.frequency.morning) + parseInt(medicine.frequency.morning))
                                prescribed = frequency * days
                            }
                            obj = {
                                name: medicine.medicine_name,
                                medicine_id: medicine.medicineId,
                                quantity_data: {
                                    prescribed
                                },
                                frequency,
                                duration: days,
                                for_order_id: medicineBill[index].for_order_id,
                                in_medicine_bill: medicineBill[index]._id,
                                for_portal_user: medicineBill[index].for_portal_user,
                            }
                        } else {
                            obj = {
                                ...medicine,
                                for_order_id: medicineBill[index].for_order_id,
                                in_medicine_bill: medicineBill[index]._id,
                                for_portal_user: medicineBill[index].for_portal_user,
                            }
                        }
                        medicineList.push(obj)
                    }
                }
                medicineDetails = await MedicineDetail.insertMany(medicineList);
            }

            for (const user of for_portal_user) {
                var message = `${orderData[0]?.request_type} by ${patientdetails?.body?.personalDetails?.full_name}`
                var requestData = {
                    created_by_type: "patient",
                    created_by: from_user?.user_id,
                    content: message,
                    url: '',
                    for_portal_user: user,
                    notitype: orderData[0]?.request_type,
                    appointmentId: orderData[0]?._id,
                    title: "Order Request"
                }

                var result = await notification("pharmacyServiceUrl", headers, requestData)
                console.log("result-->", result);
            }
            sendResponse(req, res, 200, {
                status: true,
                data: orderData,
                message: "successfully ordered medicine",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: error.message ? error.message : "failed to order medicine",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listOrder(req, res) {
        try {
            const {
                page,
                limit,
                name,
                status,
                start_date,
                portal,
                patient_id,
                end_date,
                request_type,
                for_portal_user,
            } = req.body;
            const headers = {
                'Authorization': req.headers['authorization']
            }
            console.log("req.query.sort-----", req.body.sort);

            var sort = req.body.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;

            }
            console.log("sortingarraysortingarray", sortingarray);

            let id_search = null;
            if (portal == "patient") {
                id_search = { "patient_details.user_id": new mongoose.Types.ObjectId(patient_id) }
            } else {
                id_search = { for_portal_user: new mongoose.Types.ObjectId(for_portal_user) }
            }
            let end_date_search = {}
            if (end_date != "") {
                end_date_search = { createdAt: { $lte: new Date(end_date) } }
            }
            let start_date_search = {}
            if (start_date != "") {
                start_date_search = { createdAt: { $gte: new Date(start_date) } }
            }
            const searchQuery = {
                $and: [
                    id_search,
                    { request_type: { $regex: request_type, $options: "i" } },
                    {
                        status: { $eq: status },
                    },
                    {
                        "patient_details.user_name": { $regex: name || "", $options: "i" },
                    },
                    // { createdAt: { $lte: new Date(end_date) } },
                    // { createdAt: { $gte: new Date(start_date) } },
                    end_date_search,
                    start_date_search
                ],
            };
            // const orderData = await OrderDetail.find(searchQuery)
            //     .select(
            //         "patient_details from_user request_type order_id createdAt status _id "
            //     )
            //     .populate({
            //         path: "for_portal_user",
            //         select: { role: 0, password: 0 },
            //     })
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();
            // const medicineBillData = await MedicineBill.findOne({for_order_id: orderData._id, for_portal_user}).select("total_medicine_cost co_pay insurance_paid").lean();
            const aggregateQuery = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "pharmacyDetails",
                    }
                },
                { $unwind: "$pharmacyDetails" },
                {
                    $lookup: {
                        from: "admininfos",
                        localField: "pharmacyDetails._id",
                        foreignField: "for_portal_user",
                        as: "pharmacyAdmin",
                    }
                },
                { $unwind: "$pharmacyAdmin" },
                {
                    $addFields: {
                        pharmacy_name: "$pharmacyAdmin.pharmacy_name",
                        pharmacy_profile_picture: "$pharmacyAdmin.profile_picture",
                    }
                },
                {
                    $unset: [
                        "pharmacyDetails",
                        "pharmacyAdmin"
                    ]
                },
                { $match: searchQuery },
                {
                    $lookup: {
                        from: "medicinebills",
                        let: { orderId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$for_order_id", "$$orderId"],
                                            },
                                        ],
                                    },
                                },
                            },
                            {
                                $project: {
                                    total_medicine_cost: 1,
                                    co_pay: 1,
                                    insurance_paid: 1,
                                    mode: 1,
                                },
                            },
                        ],
                        as: "medicine_bill",
                    },
                },
                { $unwind: "$medicine_bill" },
                { $sort: sortingarray },
                { $skip: limit * (page - 1) },
                { $limit: limit },
            ]

            const result = await OrderDetail.aggregate(aggregateQuery).exec();
            for (let index = 0; index < result.length; index++) {
                const profilePicKey = result[index].pharmacy_profile_picture;
                if (profilePicKey != "") {
                    const profilePictureArray = [profilePicKey]
                    const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArray }, headers, 'pharmacyServiceUrl');
                    result[index].pharmacy_profile_picture = pharmacyLogo.data[0]
                }
                const fromuserimage = result[index].from_user?.image;
                if (fromuserimage != '' && fromuserimage != undefined) {
                    const profilePictureArrayfrom_user = [fromuserimage]
                    const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArrayfrom_user }, headers, 'pharmacyServiceUrl');
                    result[index].from_user.image = pharmacyLogo.data[0]
                }
                const patient_detailsimage = result[index].patient_details?.image;
                if (patient_detailsimage != '' && patient_detailsimage != undefined) {
                    const profilePictureArraypatient_details = [patient_detailsimage]
                    const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArraypatient_details }, headers, 'pharmacyServiceUrl');
                    result[index].patient_details.image = pharmacyLogo.data[0]
                }
            }
            const count = await OrderDetail.countDocuments(searchQuery);

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    order_list: result,
                    total_count: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalResult: count,
                },
                message: "successfully fetched order list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch order list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async verifyInsuranceForOrder(req, res) {
        try {
            const {
                orderId,
                insurance_no,
                subscriber_id,
                portal_user_id
            } = req.body;
            const headers = {
                'Authorization': req.headers['authorization']
            }
            let insurance_verified = false
            const verifyInsurance = await httpService.get('insurance-subscriber/get-plan-service-by-subscriber', { subscriber_id: subscriber_id }, {}, 'insuranceServiceUrl');
            const decryptData = JSON.parse(decryptionData(verifyInsurance))
            // const decryptData = verifyInsurance

            if (decryptData.errorCode !== "SUBSCRIBER_NOT_FOUND") {
                insurance_verified = true
            }
            const orderDetail = await OrderDetail.findOneAndUpdate({ _id: orderId },
                {
                    $set: {
                        insurance_verified
                    }
                },
                { new: true }
            ).exec();

            // For Notification
            if(orderDetail?.insurance_verified === true){
                const orderData = await OrderDetail.find({ _id: orderId });
                console.log("orderData===>>>", orderData)
                var message = `Your Insurance Verified Successfully`
                var requestData = {
                    created_by_type: "pharmacy",
                    created_by: portal_user_id,
                    content: message,
                    url: '',
                    for_portal_user: orderData[0]?.patient_details?.user_id,
                    notitype: "Insurance Verified",
                    appointmentId: orderId,
                    title: "Your Insurance Verified"
                }
    
                var result = await notification("patientServiceUrl", headers, requestData)
                console.log("result==>", result);
            }
            
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



    async updateOrderComplete(req, res) {
        try {
            const {
                orderId,
            } = req.body
            console.log(req.body, "check log 999");
            // let insurance_verified = false
            // const verifyInsurance = await httpService.get('insurance-subscriber/get-plan-service-by-subscriber', { subscriber_id: subscriber_id }, {}, 'insuranceServiceUrl');
            // const decryptData = JSON.parse(decryptionData(verifyInsurance))
            // const decryptData = verifyInsurance

            const orderDetail = await OrderDetail.findOneAndUpdate({ _id: orderId },
                {
                    $set: {
                        order_complete: true
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


    async totalOrderCount(req, res) {
        try {
            const {
                portal,
                for_portal_user,
                patient_id,
                request_type
            } = req.query;
            const searchQuery = {
                $and: [
                    portal == "pharmacy" ? { for_portal_user: new mongoose.Types.ObjectId(for_portal_user) } : { "patient_details.user_id": new mongoose.Types.ObjectId(patient_id) },
                    { request_type: { $regex: request_type, $options: "i" } },
                ]
            }
            // const result = await OrderDetail.aggregate([
            //     { $match: searchQuery },
            //     { $group: { _id: "$status", count: { $sum: 1 } } },
            //     { $project: { _id: 1, count: 1 } }
            // ]).exec();
            const result = await OrderDetail.aggregate([
                { $match: searchQuery },
                { $project: { status: 1, count: 1 } }
            ]).exec();
            const resultData = []
            let newCount = 0
            let acceptedCount = 0
            let scheduledCount = 0
            let completedCount = 0
            let cancelledCount = 0
            let rejectedCount = 0

            for (const data of result) {
                if (data.status === 'new') newCount += 1
                if (data.status === 'accepted') acceptedCount += 1
                if (data.status === 'scheduled') scheduledCount += 1
                if (data.status === 'completed') completedCount += 1
                if (data.status === 'cancelled') cancelledCount += 1
                if (data.status === 'rejected') rejectedCount += 1
            }
            const countResult = [
                {
                    _id: 'new',
                    count: newCount
                },
                {
                    _id: 'accepted',
                    count: acceptedCount
                },
                {
                    _id: 'scheduled',
                    count: scheduledCount
                },
                {
                    _id: 'completed',
                    count: completedCount
                },
                {
                    _id: 'cancelled',
                    count: cancelledCount
                },
                {
                    _id: 'rejected',
                    count: rejectedCount
                }
            ]
            sendResponse(req, res, 200, {
                status: true,
                data: countResult,
                message: "successfully fetched order count",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch order count",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async fetchOrderDetails(req, res) {
        try {
            const {
                for_order_id,
                for_portal_user
            } = req.body;
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const orderData = await OrderDetail.findOne({ _id: for_order_id, for_portal_user }).lean();
            const patientId = orderData.patient_details.user_id

            const patientDetails = await httpService.getStaging('patient/patient-common-details', { patientId: patientId }, headers, 'patientServiceUrl');
            console.log("patientDetails", patientDetails);
            const pharmacyDetails = await AdminInfo.findOne({ for_portal_user }, { pharmacy_name: 1, address: 1, mobile_phone_number: 1, profile_picture: 1 })
                .populate({
                    path: "for_portal_user",
                    // select: ("email")
                    select: "email phone_number"
                })
            var pharmacyProfile
            if (pharmacyDetails.profile_picture != "" && pharmacyDetails.profile_picture != undefined) {
                const headers = {
                    Authorization: req.headers["authorization"],
                };
                const profilePictureArray = [pharmacyDetails.profile_picture];
                const profile_picdata = await httpService.postStaging(
                    "pharmacy/get-signed-url",
                    { url: profilePictureArray },
                    headers,
                    "pharmacyServiceUrl"
                );
                pharmacyProfile = profile_picdata.data[0]
                console.log("profile_picdata", profile_picdata);
                pharmacyDetails.profile_picture = profile_picdata;
            }

            const medicineDetails = await MedicineDetail.find({ for_order_id, for_portal_user }).lean();
            const medicineIDArray = []
            var getMedicines = {
                body: null
            }
            if (medicineDetails.length > 0) {
                for (const medicine of medicineDetails) {
                    medicineIDArray.push(medicine.medicine_id)
                }
                getMedicines = await httpService.postStaging('superadmin/get-all-medicine-byits-id', { medicineIds: medicineIDArray }, headers, 'superadminServiceUrl');
            }

            const medicineBill = await MedicineBill.findOne({ for_order_id, for_portal_user }).lean();
            if (medicineBill != null) {
                const urlArray = await DocumentInfo.find({ _id: { $in: medicineBill.prescription_url } }).select('url').exec();
                let prescriptionUrlArray = [];
                for (const data of urlArray) {
                    let signedUrl = await getDocument(data.url)
                    prescriptionUrlArray.push(signedUrl)
                }
                medicineBill.prescription_url = prescriptionUrlArray
            }
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    orderData,
                    medicineDetails,
                    medicineBill,
                    medicineNameObject: getMedicines.body,
                    patientDetails: patientDetails.body,
                    pharmacyDetails,
                    pharmacyProfile
                },
                message: "successfully fetched order details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errrrrrrrrrrrr");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch order details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // 
    async updateOrderDetails(req, res) {
        try {
            const {
                medicine_details,
                medicine_bill: { total_medicine_cost, co_pay, insurance_paid },
                for_portal_user,
                for_order_id,
                in_medicine_bill,
                request_type,
                status,
                name,
                total_cost,
                price_per_unit,
                medicine_id,

                // service
            } = req.body;
            console.log("req.body--->>>>>>", req.body)
            const headers = {
                'Authorization': req.headers['authorization']
            }
            if (status == "completed") {
                const orderDataResult = await OrderDetail.updateOne({ _id: for_order_id }, {
                    $set: {
                        status,
                        // service
                    }
                }, { new: true, upsert: false }).exec();
                // For Notification
                const orderData = await OrderDetail.find({ _id: for_order_id })
                console.log("orderData===>>>", orderData)
                var message = `Prescription Price Received`
                var requestData = {
                    created_by_type: "pharmacy",
                    created_by: for_portal_user,
                    content: message,
                    url: '',
                    for_portal_user: orderData[0]?.patient_details?.user_id,
                    notitype: "Amount Send",
                    appointmentId: for_order_id,
                    title: "Sent Amount"
                }

                var result = await notification("patientServiceUrl", headers, requestData)
                console.log("result==>", result);
                // const medicineDetailRecord = medicine_details.map((record) => (
                //     {
                //     ...record,                              

                //     in_medicine_bill,
                //     for_order_id,
                //     for_portal_user
                // }
                // ))
                // const medicineDetailResult = await MedicineDetail.insertMany(medicineDetailRecord);
                sendResponse(req, res, 200, {
                    status: true,
                    data: orderDataResult,
                    message: "successfully updated medicine list",
                    errorCode: null,
                });
            }
            else {
                const medicineBillResult = await MedicineBill.updateOne({ for_portal_user, for_order_id }, {
                    $set: {
                        total_medicine_cost,
                        co_pay,
                        insurance_paid
                    }
                }, { new: true, upsert: false }).exec();
                const orderDataResult = await OrderDetail.updateOne({ _id: for_order_id }, {
                    $set: {
                        request_type,
                        status,
                        // service
                    }
                }, { new: true, upsert: false }).exec();
                await MedicineDetail.deleteMany({ for_portal_user, for_order_id }, { new: true }).exec();
                const medicineDetailRecord = medicine_details.map((record) => (
                    {
                        ...record,
                        in_medicine_bill,
                        for_order_id,
                        for_portal_user
                    }
                ))
                console.log(medicineDetailRecord, "medicineDetailRecord");
                const medicineDetailResult = await MedicineDetail.insertMany(medicineDetailRecord);

                // For Notification
                const orderData = await OrderDetail.find({ _id: for_order_id })
                console.log("orderData===>>>", orderData)
                var message = `Prescription Price Received`
                var requestData = {
                    created_by_type: "pharmacy",
                    created_by: for_portal_user,
                    content: message,
                    url: '',
                    for_portal_user: orderData[0]?.patient_details?.user_id,
                    notitype: "Amount Send",
                    appointmentId: for_order_id,
                    title: "Sent Amount"
                }

                var result = await notification("patientServiceUrl", headers, requestData)
                console.log("result==>", result);
                sendResponse(req, res, 200, {
                    status: true,
                    data: {
                        medicineBillResult,
                        medicineDetailResult,
                        orderDataResult
                    },
                    message: "successfully updated medicine list",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to update medicine list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async confirmOrder(req, res) {
    //     try {
    //         const {
    //             _id,
    //             for_portal_user,
    //             patient_details,
    //             payment_type
    //         } = req.body;
    //         console.log("req.body>>>>>>>>>>",req.body)
    //         const headers = {
    //             'Authorization': req.headers['authorization']
    //         }
    //         const orderDataResult = await OrderDetail.updateOne({ _id, for_portal_user }, {
    //             $set: {
    //                 patient_details,
    //                 payment_type
    //             }
    //         }).exec();
    //         // for (const user of for_portal_user) {
    //             var message = `${patient_details?.user_name} has confirmed Medicine order`
    //             var requestData = {
    //                 created_by_type: "patient",
    //                 created_by:patient_details?.user_id,
    //                 content: message,
    //                 url: '',
    //                 for_portal_user: for_portal_user,
    //                 notitype: "Order Confirmed",
    //                 appointmentId: _id,
    //                 title:"Order Confirmed"
    //             }

    //             var result = await notification( "pharmacyServiceUrl", headers, requestData)
    //             console.log("result==>", result);
    //         //  }
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             data: {
    //                 orderDataResult
    //             },
    //             message: "successfully confirmed order details",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             data: error,
    //             message: "failed to confirm order details",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async confirmOrder(req, res) {
        try {
            let {
                _id,
                for_portal_user,
                patient_details,
                payment_type
            } = req.body;

            // Check if req.body has a 'data' property
            if (req.body.data) {
                ({
                    _id,
                    for_portal_user,
                    patient_details,
                    payment_type
                } = req.body.data);
            }

            console.log("req.body>>>>>>>>>>", req.body);

            const headers = {
                'Authorization': req.headers['authorization']
            };

            const orderDataResult = await OrderDetail.updateOne({
                _id,
                for_portal_user
            }, {
                $set: {
                    patient_details,
                    payment_type
                }
            }).exec();

            // for (const user of for_portal_user) {
            var message = `${patient_details?.user_name} has confirmed Medicine order`;
            var requestData = {
                created_by_type: "patient",
                created_by: patient_details?.user_id,
                content: message,
                url: '',
                for_portal_user: for_portal_user,
                notitype: "Order Confirmed",
                appointmentId: _id,
                title: "Order Confirmed"
            };

            var result = await notification("pharmacyServiceUrl", headers, requestData);
            console.log("result==>", result);
            //  }

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    orderDataResult
                },
                message: "successfully confirmed order details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to confirm order details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async cancelOrder(req, res) {
        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const { cancelled_by, for_portal_user, status, _id } = req.body;
            console.log("reqqqqqqqqqqqq", req.body)
            const orderDataResult = await OrderDetail.updateOne({ _id, for_portal_user }, {
                $set: {
                    cancelled_by,
                    status
                }
            }).exec();

            const orderData = await OrderDetail.find({ _id: _id })
            console.log("orderData===>>>", orderData)

            const pharmacy_details = await PortalUser.find({ _id: for_portal_user });
            console.log("pharmacy_details>>>>>>>>>", pharmacy_details)
            var message = `${pharmacy_details[0]?.user_name} has Cancelled Medicine Order`
            var requestData = {
                created_by_type: "pharmacy",
                created_by: for_portal_user,
                content: message,
                url: '',
                for_portal_user: orderData[0]?.patient_details?.user_id,
                notitype: "Order Cancelled",
                appointmentId: _id,
                title: "Order Cancelled"
            }

            var result = await notification("patientServiceUrl", headers, requestData)
            console.log("result==>", result);
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    orderDataResult
                },
                message: "successfully cancelled order details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to cancel order details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async newOrderForEPrescription(req, res) {
        try {
            const {
                from_user,
                patient_details,
                subscriber_id,
                eprescription_number,
                request_type,
                for_portal_user,
                prescription_url,
                medicine_list,
                document_meta_data
            } = req.body;
            const headers = {
                'Authorization': req.headers['authorization']
            }

            // Check if e-prescription number is available or not
            const checkEprescriptionNumberExist = await httpService.getStaging("hospital-doctor/check-eprescription-availability", { eprescription_number }, headers, "hospitalServiceUrl");
            if (!checkEprescriptionNumberExist.status) {
                return sendResponse(req, res, 200, checkEprescriptionNumberExist);
            }
            //Proceed to order completion
            if (subscriber_id === undefined) {
                var subscriber = null
            }
            subscriber = subscriber_id
            var list = []
            for (let index = 0; index < for_portal_user.length; index++) {
                const element = for_portal_user[index];
                const order_id = await getNextSequenceValue("orderid");
                var from_user_id = from_user.user_id;
                var patient_details_id = patient_details.user_id;
                const headers = {
                    'Authorization': req.headers['authorization']
                }
                var from_userdetails = await httpService.getStaging("patient/patient-details", { patient_id: from_user_id }, headers, "patientServiceUrl");
                var from_userimage = from_userdetails?.body?.personalDetails?.profile_pic;
                from_user.image = from_userimage
                var patientdetails = await httpService.getStaging("patient/patient-details", { patient_id: patient_details_id }, headers, "patientServiceUrl");
                var patient_detailsimage = patientdetails?.body?.personalDetails?.profile_pic;
                patient_details.image = patient_detailsimage
                const obj = {
                    from_user: from_user,
                    patient_details: patient_details,
                    subscriber_id: subscriber,
                    insurance_no: '',
                    request_type: request_type,
                    for_portal_user: element,
                    order_id: "ORD-" + order_id,
                }
                list.push(obj)
            }

            const orderData = await OrderDetail.insertMany(list)
            const medicineDataArray = orderData.map((singleData) => ({
                prescription_url: [],
                for_portal_user: singleData.for_portal_user,
                for_order_id: singleData._id,
            }));
            const medicineBill = await MedicineBill.insertMany(medicineDataArray)
            // console.log(medicineBill, 'medicineBill');
            let medicineDetails = null;
            const medicineDosage = checkEprescriptionNumberExist.body.medicineDosageData
            if (medicineDosage.length >= 1) {
                var medicineList = []
                for (let index = 0; index < medicineBill.length; index++) {
                    for (let index1 = 0; index1 < medicineDosage.length; index1++) {
                        const medicine = medicineDosage[index1];
                        let prescribed = 0
                        let days = 0
                        let frequency = 0
                        if (medicine.take_for.type == 'Days') days = medicine.take_for.quantity
                        if (medicine.take_for.type == 'Week') days = parseInt(medicine.take_for.quantity) * 7
                        if (medicine.frequency.frequency_type == "Moment") {
                            frequency = (parseInt(medicine.frequency.morning) + parseInt(medicine.frequency.morning) + parseInt(medicine.frequency.morning) + parseInt(medicine.frequency.morning) + parseInt(medicine.frequency.morning))
                            prescribed = frequency * days
                        }
                        const obj = {
                            name: medicine.medicineId,
                            medicine_id: medicine.medicineId,
                            quantity_data: {
                                prescribed
                            },
                            frequency,
                            duration: days,
                            for_order_id: medicineBill[index].for_order_id,
                            in_medicine_bill: medicineBill[index]._id,
                            for_portal_user: medicineBill[index].for_portal_user,
                        }
                        medicineList.push(obj)
                    }
                }
                console.log(medicineList, 'medicineList');
                medicineDetails = await MedicineDetail.insertMany(medicineList);
                // medicineDetails = await MedicineDetail.insertMany(medicineList);
            }

            sendResponse(req, res, 200, {
                status: true,
                data: checkEprescriptionNumberExist,
                message: "Order placed successfully",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async updateConfirmScheduleorder(req, res) {
        console.log("req.body.", req.body);
        try {
            let jsondata = {
                order_schedule_confirm: true,

            };
            const result = await OrderDetail.updateOne(
                { _id: mongoose.Types.ObjectId(req.body._id) },
                { $set: jsondata },
                { new: true }
            );
            if (!result) {
                res.send({ status: false, message: "Unable to update" });
            } else {
                res.send({
                    status: true,
                    message: "update successfully",
                    result: result,
                });
            }
        }
        catch (e) {
            console.log("erooooooooo", e);
            // res.send({
            //   status: false,
            //   messgae: "Oops!! something went wrong",
            // });
        }
    }

    async totalOrderDashboardCount(req, res) {
        try {
            const {
                for_portal_user,
            } = req.query;
            let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(for_portal_user) });

            if (checkUser.role === 'PHARMACY_STAFF') {

                let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(for_portal_user) });

                for_portal_user = adminData?.for_staff

            }
            
            const searchQuery = {
                $and: [
                    { for_portal_user: mongoose.Types.ObjectId(for_portal_user) },
                    { request_type: 'order_request' }
                ]
            };
            const result = await OrderDetail.aggregate([
                { $match: searchQuery },


            ]).exec();
            const resultData = []
            let totalOrder = 0;
            let totalScheduled = 0;
            let cancelled = 0;
            let pickUp = 0;
            let completed = 0;
            let rejected = 0;
            for (const data of result) {

                if (data) totalOrder += 1
                if (data.status === 'scheduled') totalScheduled += 1
                if (data.status === 'cancelled') cancelled += 1
                if (data.status === 'completed') completed += 1
                if (data.status === 'rejected') rejected += 1
                if (data.order_schedule_confirm === true) pickUp += 1
            }

            const finalcount = {
                totalOrder: totalOrder,
                totalScheduled: totalScheduled,
                cancelled: cancelled,
                pickUp: pickUp,
                completed: completed,
                rejected: rejected,

            }
            sendResponse(req, res, 200, {
                status: true,
                data: finalcount,
                message: "successfully fetched order count",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch order count",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    
    // edit medicine name from superadmin
    async editMedicineName(req, res) {
        const {
            medicines, medicineId
        } = req.body;
        try {
            const result = await MedicineDetail.findOneAndUpdate(
                { medicine_id: medicineId },
                {
                    $set: {
                        name: medicines.medicine_name
                    }
                },
                { new: true }
            )

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully update medicine name`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update imaging test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async dashboardLineGraph(req, res) {
        try {
            const { for_portal_user, yearFilter } = req.query;
            const currentYear = yearFilter ? yearFilter : new Date().getFullYear();
            let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(for_portal_user) });

            if (checkUser.role === 'PHARMACY_STAFF') {

                let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(for_portal_user) });

                for_portal_user = adminData?.for_staff

            }

            let filter1 = {
                for_portal_user: mongoose.Types.ObjectId(for_portal_user), request_type: 'order_request', status: 'completed', createdAt: {
                    $gte: new Date(currentYear, 0, 1), $lt: new Date(currentYear, 11, 31)
                }
            };
            let filter2 = {
                for_portal_user: mongoose.Types.ObjectId(for_portal_user), request_type: 'order_request', status: 'rejected', createdAt: {
                    $gte: new Date(currentYear, 0, 1), $lt: new Date(currentYear, 11, 31)
                }
            };
            const pip = [
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        month: '$_id',
                        count: 1
                    }
                },
                {
                    $sort: { month: 1 }
                }

            ];
            let data1 = {}
            if (filter1) {
                const result1 = await OrderDetail.aggregate([{ $match: filter1 }, ...pip]);
                const formattedResult = Object.fromEntries(
                    result1.map(item => [item.month, item.count])
                )
                const allMonths = Array.from({ length: 12 }, (_, i) => i + 1)
                    .map(month => new Date(0, month - 1).toLocaleString('en-US', { month: 'long' }));
                allMonths.forEach((month, i) => {
                    data1[month] = formattedResult[i + 1] || 0;

                });
            }
            let data2 = {}
            if (filter2) {
                const result2 = await OrderDetail.aggregate([{ $match: filter2 }, ...pip]);
                const formattedResult = Object.fromEntries(
                    result2.map(item => [item.month, item.count])
                )
                const allMonths = Array.from({ length: 12 }, (_, i) => i + 1)
                    .map(month => new Date(0, month - 1).toLocaleString('en-US', { month: 'long' }));
                allMonths.forEach((month, i) => {
                    data2[month] = formattedResult[i + 1] || 0;
                });
            }

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    completed: data1,
                    rejected: data2
                },
                message: "successfully fetched order count",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch order count",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async getTotalCoPayment(req,res){
        try {
            let {pharmacyId,createdDate, updatedDate} = req.query;
            const dateFilter = {};
            if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);
 
                dateFilter.$and = [
                    { createdAt: { $gte: createdDateObj } },
                    { createdAt: { $lte: updatedDateObj } },
                ];
            } else if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                dateFilter.createdAt = { $gte: createdDateObj };
            } else if (updatedDate && updatedDate !== "") {
                const updatedDateObj = new Date(updatedDate);
                dateFilter.createdAt = { $lte: updatedDateObj };
            }
            let coPayAmountDetails = await MedicineDetail.find({for_portal_user: pharmacyId,...dateFilter });
 
            let allco_payment = 0;
            coPayAmountDetails.forEach((item) => {
                if(item.co_payment != null && !isNaN(item.co_payment)){
                    allco_payment += parseFloat(item.co_payment);
                }
            });
           
            let monthlyCoPayment = {};
            let currentYear = moment().year();
 
            moment.months().forEach((month) => {
                monthlyCoPayment[month] = 0;
            });
 
            coPayAmountDetails.forEach((item) => {
                if (item) {
                    let createDate = moment(item.createdAt);
                    let year = createDate.year();
                    let month = createDate.format("MMMM");
                    if(item.co_payment != null && !isNaN(item.co_payment)){
                    if (year === currentYear) {
                        monthlyCoPayment[month] += parseFloat(item.co_payment);
                    }
                }
                }
            });
 
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    allco_payment:allco_payment.toFixed(2),
                    graphdata:monthlyCoPayment
                },
                message: `All data fetched successfully`,
                errorCode: null,
            });
 
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "Internal server error",
            });
        }
    }

    async getOrderPaymentHistory(req, res) {
        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }
            let {pharmacyId,createdDate, updatedDate,limit,page,searchKey} = req.query;

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

           
            let orderDetails = await OrderDetail.find({for_portal_user: pharmacyId });

            let orderId = [];
            const promises1 = orderDetails.map(async (item) => {
                try {
                    orderId.push(item?._id)
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises1);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }
 
            let orderpaymentData = await httpService.getStaging('payment/get-pharmacy-order-payment-history', { orderId, createdDate ,updatedDate,searchKey }, headers, 'patientServiceUrl');
            // console.log("orderpaymentData__________",orderpaymentData)

            let claimpaymentData = await httpService.getStaging('claim/get-pharmacy-claim-payment-history', { pharmacyId, createdDate ,updatedDate,searchKey }, headers, 'insuranceServiceUrl');
            // console.log("claimpaymentData__________",claimpaymentData)

            let data1 = [...orderpaymentData?.data,...claimpaymentData?.data]
            // console.log("data1___________",data1)

            let filteredData = data1.filter(item => item.totalApprovedAmount !== null );
           
            const promises2 = filteredData.map(async (item) => {
                try {
                    let totalPayment;
                    for (const key in item) {
                        if(key == "plan_price"){
                            return {
                                ...item,
                                totalPayment : item[key]
                            }
                        }
                        else if(key == "totalApprovedAmount"){
                            return {
                                ...item,
                                totalPayment : item[key]
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });

            let result;
            let totalRecords = 0;
            try {
                let all_details= await Promise.all(promises2);

                if (keynew == 'createdAt') {
                    if (value == 1) {
                        all_details.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                    } else {
                        all_details.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    }
                }

                if (keynew == 'patientName') {
                    if (value == 1) {
                        all_details.sort((a, b) => {
                            if (a.patientName < b.patientName) return -1;
                            if (a.patientName > b.patientName) return 1;
                            return 0;
                        });

                    } else {
                        all_details.sort((a, b) => {
                            if (a.patientName > b.patientName) return -1;
                            if (a.patientName < b.patientName) return 1;
                            return 0;
                        });
                    }
                }

                if (keynew == 'totalPayment') {
                    if (value == 1) {
                        all_details.sort((a, b) => parseInt(a.totalPayment) - parseInt(b.totalPayment));

                    } else {
                        all_details.sort((a, b) => parseInt(b.totalPayment) - parseInt(a.totalPayment));

                    }
                }

                if (keynew == 'payment_mode') {
                    if (value == 1) {
                        all_details.sort((a, b) => {
                            if (a.payment_mode < b.payment_mode) return -1;
                            if (a.payment_mode > b.payment_mode) return 1;
                            return 0;
                        });

                    } else {
                        all_details.sort((a, b) => {
                            if (a.payment_mode > b.payment_mode) return -1;
                            if (a.payment_mode < b.payment_mode) return 1;
                            return 0;
                        });
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
    
                result = all_details.slice(start_index, end_index);

            } catch (error) {
                console.error("Error in one of the promises:", error);
            }

            let totalAmount = 0;
            result?.forEach((item)=>{
                if(item?.totalPayment != null){
                    totalAmount = totalAmount + parseInt(item?.totalPayment)
                }
            })

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result:result,
                    totalAmount:totalAmount,
                    totalCount: filteredData.length,
                    currentPage: page,
                    totalPages: limit > 0 ? Math.ceil(filteredData.length/ limit) : 1,
                },
                message: `All data fetched successfully`,
                errorCode: null,
            });
 
        } catch (error) {
            console.log(error, "eeeeeeerror");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "Internal server error",
            });
        }
    }
    

}
module.exports = new OrderController();
