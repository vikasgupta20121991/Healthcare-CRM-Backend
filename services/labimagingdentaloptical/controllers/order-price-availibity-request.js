import DocumentInfo from "../models/document_info";
import OrdertestBill from "../models/order/order_test_bill";
import OrderDetail from "../models/order/order_detail";
import OrderTestDetails from "../models/order/order_test_detail";
import { getNextSequenceValue } from "../middleware/utils";
import mongoose from "mongoose";
import { getDocument } from "../helpers/s3";
import { sendResponse } from "../helpers/transmission";
import Basic_info from "../models/basic_info";
import {notification} from "../helpers/notification";
import { decryptionData } from "../helpers/crypto";
import PortalUser from "../models/portal_user";
const Http = require('../helpers/httpservice');
const httpService = new Http()
class OrderFlow {
    // list
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
                portal_type
            } = req.body;
            const headers = {
                'Authorization': req.headers['authorization']
            }

            var sort = req.body.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;

            }

            let id_search = null;
            if (portal == "patient") {
                id_search = { "patient_details.user_id": new mongoose.Types.ObjectId(patient_id), portal_type }
            } else {
                id_search = { for_portal_user: new mongoose.Types.ObjectId(for_portal_user), portal_type }
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

            const aggregateQuery = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "portaldetails",
                    }
                },
                { $unwind: "$portaldetails" },
                {
                    $lookup: {
                        from: "basicinfos",
                        localField: "portaldetails._id",
                        foreignField: "for_portal_user",
                        as: "basicinfosData",
                    }
                },
                { $unwind: "$basicinfosData" },
                {
                    $addFields: {
                        portal_name: "$basicinfosData.full_name",
                        portal_profile_picture: "$basicinfosData.profile_picture",
                    }
                },
                {
                    $unset: [
                        "portaldetails",
                        "basicinfosData"
                    ]
                },
                { $match: searchQuery },
                {
                    $lookup: {
                        from: "ordertestbills",
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
                                    total_test_cost: 1,
                                    co_pay: 1,
                                    insurance_paid: 1,
                                    mode: 1,
                                },
                            },
                        ],
                        as: "ordertestbills",
                    },
                },
                { $unwind: "$ordertestbills" },
                { $sort: sortingarray },
                { $skip: limit * (page - 1) },
                { $limit: limit },
            ]

            const result = await OrderDetail.aggregate(aggregateQuery).exec();
            for (let index = 0; index < result.length; index++) {
                const profilePicKey = result[index].portal_profile_picture;
                if (profilePicKey != "" && profilePicKey != null) {
                    const profilePictureArray = [profilePicKey];
                    const profile_picdata = await DocumentInfo.findOne({ _id: profilePictureArray });

                    if (profile_picdata != null) { // Check if profile_picdata is not null or undefined
                        let profilepicture = await getDocument(profile_picdata.url);
                        result[index].portal_profile_picture = profilepicture;
                    }
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

                const onlineResultKey = result[index].online_pdf;
                if (onlineResultKey != "" && onlineResultKey != null) {
                    let onlinePDFData = await getDocument(onlineResultKey);
                    result[index].online_pdf = onlinePDFData;
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
            console.log(error,"check eror33");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch order list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // count
    async totalOrderCount(req, res) {
        try {
            const {
                portal,
                for_portal_user,
                patient_id,
                request_type,
                portal_type
            } = req.query;
            let portalArray = ["Dental", "Optical", "Paramedical-Professions", "Laboratory-Imaging"];

            const searchQuery = {
                $and: [
                    portalArray.includes(portal) ? { for_portal_user: new mongoose.Types.ObjectId(for_portal_user), portal_type } : { "patient_details.user_id": new mongoose.Types.ObjectId(patient_id), portal_type },
                    { request_type: { $regex: request_type, $options: "i" } },
                ]
            }



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
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch order count",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // newOrder
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
                test_list,
                action,
                eprescription_number,
                portal_type
            } = req.body;
            let ordertest_From
            const headers = {
                'Authorization': req.headers['authorization']
            }
            if (action == 'eprecription') {
                let checkEprescriptionNumberExist;
                // Check if e-prescription number is available or not
                 checkEprescriptionNumberExist = await httpService.getStaging("labimagingdentaloptical/checkEprescriptionAvailabilityForFourPortal", { eprescription_number, portal_type }, headers, "labimagingdentalopticalServiceUrl");
                if (!checkEprescriptionNumberExist.status) {
                    checkEprescriptionNumberExist = await httpService.getStaging("hospital-doctor/check-eprescription-availability", { eprescription_number,test_type:portal_type }, headers, "hospitalServiceUrl");
                }

                if (!checkEprescriptionNumberExist.status) {
                    return sendResponse(req, res, 200, checkEprescriptionNumberExist);
                }
                const testDosage = checkEprescriptionNumberExist.body.medicineDosageData;
                console.log("testDosage__________",testDosage);
                ordertest_From = testDosage
            } else {
                ordertest_From = test_list
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
                    portal_type: portal_type
                }
                list.push(obj)
            }

            const orderData = await OrderDetail.insertMany(list)

            const labtest_DataArray = orderData.map((singleData) => ({
                prescription_url: prescription_url,
                for_portal_user: singleData.for_portal_user,
                for_order_id: singleData._id,
                portal_type: portal_type

            }));
            const ordertest_Bill = await OrdertestBill.insertMany(labtest_DataArray)

            let ordertestDetails = null;
            if (ordertest_From.length >= 1) {
                var ordertestList = []
                for (let index = 0; index < ordertest_Bill.length; index++) {
                    for (let index1 = 0; index1 < ordertest_From.length; index1++) {
                        const test = ordertest_From[index1];
                        console.log("test__________",test);
                        let obj = {}
                        if (action == 'eprecription') {
                            let prescribed = 0
                            let days = 0
                            let frequency = 0
                            // if (test.take_for.type == 'Days') days = test.take_for.quantity
                            // if (test.take_for.type == 'Week') days = parseInt(test.take_for.quantity) * 7
                            // if (test.frequency.frequency_type == "Moment") {
                            //     frequency = (parseInt(test.frequency.morning) + parseInt(test.frequency.morning) + parseInt(test.frequency.morning) + parseInt(test.frequency.morning) + parseInt(test.frequency.morning))
                            //     prescribed = frequency * days
                            // }
                            let testname;
                            let testId;
                            if(test.imaging_name){
                                testname = test.imaging_name,
                                testId = test.imagingId
                            }else if(test?.lab_name ){
                                testname = test.lab_name,
                                testId = test.labId
                            }else if(test?.other_name ){
                                testname = test?.other_name,
                                testId = test.otherId
                            }else if(test?.eyeglass_name ){
                                testname = test.eyeglass_name,
                                testId = test.eyeglassId
                            }
                            console.log("testname_____",testname)
                            obj = {
                                name:testname,
                                test_id: testId,
                                quantity_data: {
                                    prescribed
                                },
                                frequency,
                                duration: days,
                                for_order_id: ordertest_Bill[index].for_order_id,
                                in_ordertest_bill: ordertest_Bill[index]._id,
                                for_portal_user: ordertest_Bill[index].for_portal_user,
                                portal_type: portal_type
                            }
                        } else {
                            obj = {
                                ...test,
                                for_order_id: ordertest_Bill[index].for_order_id,
                                in_ordertest_bill: ordertest_Bill[index]._id,
                                for_portal_user: ordertest_Bill[index].for_portal_user,
                                portal_type: portal_type
                            }
                        }

                        console.log(":obj______",obj)
                        ordertestList.push(obj)
                    }
                }
                ordertestDetails = await OrderTestDetails.insertMany(ordertestList);
            }

            var data= orderData[0]?.request_type.split('_').join(' ')

            for (const user of for_portal_user) {
                var message = `${data} by ${patientdetails?.body?.personalDetails?.full_name}`
                var requestData = {
                    created_by_type: "patient",
                    created_by: from_user?.user_id,
                    content: message,
                    url: '',
                    for_portal_user: user,
                    notitype: data,
                    appointmentId: orderData[0]?._id,
                    title:"Order Request"
                }
                
                var result = await notification('','',"labimagingdentalopticalServiceUrl",'','','', headers, requestData)
                console.log("result-->", result);
            }

            sendResponse(req, res, 200, {
                status: true,
                data: orderData,
                message: "Order successfully",
                errorCode: null,
            });
        } catch (error) {
            console.log("error_________",error)
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: error.message ? error.message : "failed to order",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // orderdetail
    async fetchOrderDetails(req, res) {
        try {
            const {
                for_order_id,
                for_portal_user,
                portal_type
            } = req.body;
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const orderData = await OrderDetail.findOne({ _id: for_order_id, for_portal_user, portal_type }).lean();
            const patientId = orderData.patient_details.user_id

            const patientDetails = await httpService.getStaging('patient/patient-common-details', { patientId: patientId }, headers, 'patientServiceUrl');
            const portal_Details = await Basic_info.findOne({ for_portal_user, type: portal_type }, { full_name: 1, address: 1, main_phone_number: 1, profile_picture: 1 })
                .populate({
                    path: "for_portal_user",
                    select: ("email")
                })
                .populate({
                    path: "in_location",
                    model: "LocationInfo",
                    select: "address"
                });
            var portal_Profile
            if (portal_Details.profile_picture != "" && portal_Details.profile_picture != undefined) {
                const headers = {
                    Authorization: req.headers["authorization"],
                };
                const profilePictureArray = [portal_Details.profile_picture];
                const profile_picdata = await DocumentInfo.findOne({ _id: profilePictureArray })
                let image;
                if (profile_picdata) {
                    image = await getDocument(profile_picdata.url);
                }
                portal_Profile = image;

            }

            const testDetails = await OrderTestDetails.find({ for_order_id, for_portal_user, portal_type }).lean();
            console.log("testDetails__________",testDetails)
            let checkTesttype = orderData?.portal_type
            var getTestData;
            const testIDArray = []
            
            if (checkTesttype === 'Paramedical-Professions') {
                if (testDetails.length > 0) {
                    for (const data of testDetails) {
                        testIDArray.push(data.test_id)
                    }
                    getTestData = await httpService.getStaging('hospital/lab-test-byId', { labTestId: testIDArray }, headers, 'hospitalServiceUrl');

                }
            }

            if (checkTesttype === 'Dental') {
                if (testDetails.length > 0) {
                    for (const data of testDetails) {
                        testIDArray.push(data.test_id)
                    }
                    getTestData = await httpService.getStaging('hospital/others-test-byId', { othersId: testIDArray }, headers, 'hospitalServiceUrl');

                }
            }

            if (checkTesttype === 'Optical') {
                if (testDetails.length > 0) {
                    for (const data of testDetails) {
                        testIDArray.push(data.test_id)
                    }
                    getTestData = await httpService.getStaging('hospital/eyeglasses-test-byId', { eyeglasesId: testIDArray }, headers, 'hospitalServiceUrl');

                }
            }
            
            if (checkTesttype === 'Laboratory-Imaging') {
                if (testDetails.length > 0) {
                    for (const data of testDetails) {
                        testIDArray.push(data.test_id)
                    }
                    getTestData = await httpService.getStaging('hospital/imaging-test-byId', { imagingId: testIDArray }, headers, 'hospitalServiceUrl');

                }
            }


            const testBill = await OrdertestBill.findOne({ for_order_id, for_portal_user, portal_type }).lean();

            if (testBill != null) {
                const urlArray = await DocumentInfo.find({ _id: { $in: testBill.prescription_url } }).select('url').exec();
                let prescriptionUrlArray = [];
                for (const data of urlArray) {
                    let signedUrl = await getDocument(data.url)
                    prescriptionUrlArray.push(signedUrl)
                }
                testBill.prescription_url = prescriptionUrlArray
            }

            if (orderData && orderData?.online_pdf) {
                orderData.online_pdf = await getDocument(orderData?.online_pdf);
            }
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    orderData,
                    testDetails,
                    testBill,
                    testNameObject: getTestData,
                    patientDetails: patientDetails.body,
                    portal_Details,
                    portal_Profile
                },
                message: "successfully fetched order details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch order details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // updatedetail
    async updateOrderDetails(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            const {
                test_details,
                test_bill: { total_test_cost, co_pay, insurance_paid },
                for_portal_user,
                for_order_id,
                in_ordertest_bill,
                request_type,
                status,
                name,
                total_cost,
                price_per_unit,
                test_id,
                portal_type


            } = req.body;

            if (status == "completed") {
                const orderDataResult = await OrderDetail.updateOne({ _id: for_order_id, portal_type }, {
                    $set: {
                        status,
                    }
                }, { new: true, upsert: false }).exec();

                 // For Notification
                 const orderData= await OrderDetail.find({ _id: for_order_id })
                 console.log("orderData===>>>",orderData)
                 var message = `Prescription Price Received`
                 var requestData = {
                     created_by_type:portal_type,
                     created_by:for_portal_user,
                     content: message,
                     url: '',
                     for_portal_user: orderData[0]?.patient_details?.user_id,
                     notitype: "Amount Send",
                     appointmentId: for_order_id,
                     title:"Sent Amount"
                 }
     
                 var result = await notification('','', "patientServiceUrl",'','','', headers, requestData)
                 console.log("result==>", result);

                sendResponse(req, res, 200, {
                    status: true,
                    data: orderDataResult,
                    message: "Successfully updated list",
                    errorCode: null,
                });
            }
            else {
                const testBillResult = await OrdertestBill.updateOne({ for_portal_user, for_order_id, portal_type }, {
                    $set: {
                        total_test_cost,
                        co_pay,
                        insurance_paid
                    }
                }, { new: true, upsert: false }).exec();
                const orderDataResult = await OrderDetail.updateOne({ _id: for_order_id, portal_type }, {
                    $set: {
                        request_type,
                        status,
                    }
                }, { new: true, upsert: false }).exec();
                await OrderTestDetails.deleteMany({ for_portal_user, for_order_id, portal_type }, { new: true }).exec();
                const testDetailRecord = test_details.map((record) => (
                    {
                        ...record,
                        in_ordertest_bill,
                        for_order_id,
                        for_portal_user,
                        portal_type
                    }
                ))
                const testDetailResult = await OrderTestDetails.insertMany(testDetailRecord);

                // For Notification
                const orderData= await OrderDetail.find({ _id: for_order_id })
                console.log("orderData===>>>",orderData)
                var message = `Prescription Price Received`
                var requestData = {
                    created_by_type:portal_type,
                    created_by:for_portal_user,
                    content: message,
                    url: '',
                    for_portal_user: orderData[0]?.patient_details?.user_id,
                    notitype: "Amount Send",
                    appointmentId: for_order_id,
                    title:"Sent Amount"
                }
    
                var result = await notification('','', "patientServiceUrl",'','','', headers, requestData)
                console.log("result==>", result);

                sendResponse(req, res, 200, {
                    status: true,
                    data: {
                        testBillResult,
                        testDetailResult,
                        orderDataResult
                    },
                    message: "Successfully updated list",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log("error___________",error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to update medicine list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // verify
    async verifyInsuranceForOrder(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            const {
                orderId,
                insurance_no,
                subscriber_id,
                portal_type,
                portal_user_id
            } = req.body
            let insurance_verified = false
            const verifyInsurance = await httpService.get('insurance-subscriber/get-plan-service-by-subscriber', { subscriber_id: subscriber_id }, {}, 'insuranceServiceUrl');
            const decryptData = JSON.parse(decryptionData(verifyInsurance))
            // const decryptData = verifyInsurance

            if (decryptData.errorCode !== "SUBSCRIBER_NOT_FOUND") {
                insurance_verified = true
            }
            const orderDetail = await OrderDetail.findOneAndUpdate({ _id: orderId, portal_type },
                {
                    $set: {
                        insurance_verified
                    }
                },
                { new: true }
            ).exec();

             // For Notification
             if(orderDetail?.insurance_verified === true){
             const orderData= await OrderDetail.find({ _id: orderId });
             console.log("orderData===>>>",orderData)
             var message = `Your Insurance Verified Successfully`
             var requestData = {
                 created_by_type: portal_type,
                 created_by:portal_user_id,
                 content: message,
                 url: '',
                 for_portal_user: orderData[0]?.patient_details?.user_id,
                 notitype: "Insurance Verified",
                 appointmentId: orderId,
                 title:"Your Insurance Verified"
            }
 
            var result = await notification('','', "patientServiceUrl",'','','', headers, requestData)
            console.log("result==>", result);
            }
            sendResponse(req, res, 200, {
                status: true,
                data: orderDetail,
                message: "Successfully verified insurance.",
                errorCode: null,
            });
        } catch (error) {
            console.log("error==>", error);

            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to verify insurance for this order",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // updatestatus
    async updateOrderComplete(req, res) {
        try {
            const {
                orderId, portal_type
            } = req.body
            console.log(req.body, "9090909");

            const orderDetail = await OrderDetail.findOneAndUpdate({ _id: orderId, portal_type: portal_type },
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
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to verify insurance for this order",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    //cancelOrder 
    async cancelOrder(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            const { cancelled_by, for_portal_user, status, _id, portal_type } = req.body;
            const orderDataResult = await OrderDetail.updateOne({ _id, for_portal_user, portal_type }, {
                $set: {
                    cancelled_by,
                    status
                }
            }).exec();

            const orderData= await OrderDetail.find({ _id: _id })
            console.log("orderData===>>>",orderData)

            const pharmacy_details = await PortalUser.find({_id: for_portal_user});
            console.log("pharmacy_details>>>>>>>>>",pharmacy_details)
            var message = `${pharmacy_details[0]?.user_name} has Cancelled Medicine Order`
            var requestData = {
                created_by_type: portal_type,
                created_by:for_portal_user,
                content: message,
                url: '',
                for_portal_user: orderData[0]?.patient_details?.user_id,
                notitype: "Order Cancelled",
                appointmentId: _id,
                title:"Order Confirmed"
            }

            var result = await notification('','', "patientServiceUrl",'','','', headers, requestData)
            console.log("result==>", result);
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    orderDataResult
                },
                message: "Successfully cancelled order.",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to cancel order details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // confirmOrder
    // async confirmOrder(req, res) {
    //     const headers = {
    //         'Authorization': req.headers['authorization']
    //     }
    //     try {
    //         const {
    //             _id,
    //             for_portal_user,
    //             patient_details,
    //             payment_type,
    //             portal_type
    //         } = req.body;

    //         console.log("req.body>>>>>>>>>>>>",req.body)
    //         const orderDataResult = await OrderDetail.updateOne({ _id, for_portal_user, portal_type }, {
    //             $set: {
    //                 patient_details,
    //                 payment_type
    //             }
    //         }).exec();

    //         var message = `${patient_details?.user_name} has confirmed Medicine order`
    //         var requestData = {
    //             created_by_type: "patient",
    //             created_by:patient_details?.user_id,
    //             content: message,
    //             url: '',
    //             for_portal_user: for_portal_user,
    //             notitype: "Order Confirmed",
    //             appointmentId: _id,
    //             title:"Order Confirmed"
    //         }

    //         var result = await notification('','',"labimagingdentalopticalServiceUrl",'','','', headers, requestData)
    //         console.log("result==>", result);
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             data: {
    //                 orderDataResult
    //             },
    //             message: "Successfully confirmed order",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             data: error,
    //             message: "failed to confirm order",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }
    async confirmOrder(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        };
        try {
            let {
                _id,
                for_portal_user,
                patient_details,
                payment_type,
                portal_type
            } = req.body;
    
            // Check if req.body has a 'data' property
            if (req.body.data) {
                ({
                    _id,
                    for_portal_user,
                    patient_details,
                    payment_type,
                    portal_type
                } = req.body.data);
            }
    
            console.log("req.body>>>>>>>>>>>>", req.body);
    
            const orderDataResult = await OrderDetail.updateOne({
                _id,
                for_portal_user,
                portal_type
            }, {
                $set: {
                    patient_details,
                    payment_type
                }
            }).exec();
    console.log("orderDataResult>>>>>>>>",orderDataResult)
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
    
            var result = await notification('', '', "labimagingdentalopticalServiceUrl", '', '', '', headers, requestData);
            console.log("result==>", result);
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    orderDataResult
                },
                message: "Successfully confirmed order",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to confirm order",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    
    // confirmschedule
    async updateConfirmScheduleorder(req, res) {
        try {
            let jsondata = {
                order_schedule_confirm: true,

            };
            const result = await OrderDetail.updateOne(
                { _id: mongoose.Types.ObjectId((req.body._id)), portal_type: req.body.portal_type },
                { $set: jsondata },
                { new: true }
            );
            if (!result) {
                sendResponse(req, res, 200,{ status: false, message: "Unable to update" });
            } else {
                sendResponse(req, res, 200,{
                    status: true,
                    message: "Update successfully",
                    result: result,
                });
            }
        }
        catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to confirm order",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async fourPortalSavePdf(req, res) {
        const { order_id, online_pdf,fourPortalId ,portalType} = req.body;
        try {    
            const headers = {
                'Authorization': req.headers['authorization']
            }
            let orderDetails;
            if(order_id) {
                orderDetails = await OrderDetail.findOne({_id:order_id})
                if (orderDetails) {
                    orderDetails.online_pdf = online_pdf?.url;
                    await orderDetails.save(); // Save the changes to the database
                } 
            }

           const fourPortalDetails = await PortalUser.findOne({_id: fourPortalId});

           var message = `Your ${portalType} result has been uploaded by ${fourPortalDetails?.full_name}.`
           var requestData = {
             created_by_type: portalType,
             created_by: fourPortalId,
             content: message,
             url: '',
             for_portal_user: orderDetails?.patient_details?.user_id,
             notitype: 'New Result Uploaded',
             appointmentId: order_id
           }
          var result = await notification('', '', "patientServiceUrl", '', '', '', headers, requestData);
        
          sendResponse(req, res, 200, {
            status: true,
            data: orderDetails,
            message: "PDF Added Successfully",
            errorCode: null
          });
        } catch (error) {
          console.log("error", error);
          sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
          });
        }
    }

    // edit medicine name from superadmin
    async editImagingName(req,res){
        const {
            imagingTestId,
            ImagingTestData,
        } = req.body;
        try {
            const result = await OrderTestDetails.findOneAndUpdate(
                { test_id: imagingTestId },
                {
                    $set: {
                        name:ImagingTestData.imaging
                    }
                },
                { new: true }
            )
            
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully update imaging test details`,
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
}

module.exports = new OrderFlow();