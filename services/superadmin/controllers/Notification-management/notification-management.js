import mongoose from "mongoose";
import Notification from "../../models/superadmin/Chat/Notification";
import NotificationManagement from "../../models/superadmin/notification-management"
import Http from "../../helpers/httpservice";
const httpService = new Http()
import { sendResponse } from "../../helpers/transmission";
import { sendNotification } from "../../helpers/firebase_notification";

export const addNotification = async (req, res) => {
    try {
        const { notification_name, notification_type, time, notification_applies, content, created_by, created_by_type, notitype, notificationId } = req.body;

        const headers = {
            'Authorization': req.headers['authorization']
        }
        var userDetails = {};
        var portalData = {};
        var data1 = {};
        var objectData = {};
        if (req.body.notification_applies == 'Patient Push' || req.body.notification_applies == 'Patient App') {
            try {
                userDetails = await httpService.getStaging('patient/getAllPatientForSuperAdmin', { insuranceStatus: "", searchText: "", page: 1, limit: 0, createdDate: "", updatedDate: "", status: "all" }, headers, 'patientServiceUrl');

                const userObjects = userDetails?.body?.result;
                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {
                        if (userObject?.portalusers?.notification === true) {
                            const portal_user_id = mongoose.Types.ObjectId(userObject?.portalusers?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                notification_name: req.body.notification_name,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'patient/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'patientServiceUrl'
                            );

                            for (const userObject of userObjects) {
                                if (userObject?.portalusers?.fcmToken) {
                                    // Assuming 'sendNotification' returns a Promise
                                    await sendNotification(
                                        req.body.content,
                                        req.body.notification_name,
                                        userObject.portalusers.fcmToken,
                                        userObject.portalusers._id
                                    );
                                }
                            }

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }
            } catch (err) {
                console.log("errorrrrr", err)
            }

        }

        if (req.body.notification_applies == 'Pharmacy Push' || req.body.notification_applies == 'Pharmacy App') {
            try {
                userDetails = await httpService.getStaging('pharmacy/list-pharmacy-admin-user', { page: 1, limit: 0, name: "", status: "APPROVED", start_date: "", end_date: "" }, headers, 'pharmacyServiceUrl');

                const userObjects = userDetails?.data?.data;
                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {
                        if (userObject?.for_portal_user?.notification === true) {

                            const portal_user_id = mongoose.Types.ObjectId(userObject?.for_portal_user?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                // notification_name: req.body.notification_name,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'pharmacy/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'pharmacyServiceUrl'
                            );
                            for (const userObject of userObjects) {
                                if (userObject?.for_portal_user?.fcmToken) {
                                    // Assuming 'sendNotification' returns a Promise
                                    await sendNotification(
                                        req.body?.content,
                                        req.body?.notification_name,
                                        userObject?.for_portal_user?.fcmToken,
                                        userObject?.for_portal_user?._id
                                    );
                                }
                            }

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }
            } catch (err) {
                console.log("errorrrrr", err)
            }
        }

        if (req.body.notification_applies == 'Doctor App') {
            try {
                userDetails = await httpService.getStaging('hospital-doctor/get-doctor-list', { page: 1, limit: 0, status: "APPROVED", searchText: "", from_date: "", to_date: "" }, headers, 'hospitalServiceUrl');

                const userObjects = userDetails?.data?.data;
                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {
                        console.log("userObject)_)___________",userObject)
                        if (userObject?.for_portal_user?.notification === true) {
                            const portal_user_id = mongoose.Types.ObjectId(userObject?.for_portal_user?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                // notification_name: req.body.notification_name,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'hospital-doctor/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'hospitalServiceUrl'
                            );

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }
            } catch (err) {
                console.log("errorrrrr", err)
            }

        }

        if (req.body.notification_applies == 'Hospital App') {
            try {
                userDetails = await httpService.getStaging('hospital/get-all-hospital-list', { page: 1, limit: 0, status: "APPROVED" }, headers, 'hospitalServiceUrl');
                const userObjects = userDetails?.data?.data;
                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {
                        if (userObject?.for_portal_user?.notification === true) {
                            const portal_user_id = mongoose.Types.ObjectId(userObject?.for_portal_user?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                // notification_name: req.body.notification_name,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'hospital/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'hospitalServiceUrl'
                            );

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }

            } catch (err) {
                console.log("errorrrrr", err)
            }
        }

        if (req.body.notification_applies == 'Insurance App') {
            try {
                userDetails = await httpService.getStaging('insurance/get-insurance-admin-approved-list-superadmin', { page: 1, limit: 0, searchText: "", startDate: "", endDate: "" }, headers, 'insuranceServiceUrl');
                const userObjects = userDetails?.body?.result;

                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {
                        if (userObject?.for_portal_user?.notification === true) {

                            const portal_user_id = mongoose.Types.ObjectId(userObject?.for_portal_user?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                // notification_name: req.body.notification_name,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'insurance/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'insuranceServiceUrl'
                            );

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }

            } catch (err) {
                console.log("errorrrrr", err)
            }
        }

        if (req.body.notification_applies == 'Dental') {
            try {
                userDetails = await httpService.getStaging('labimagingdentaloptical/get-four-portal-superadmin-list', { page: 1, limit: 0, status: "APPROVED", searchText: "", from_date: "", to_date: "", type: notification_applies }, headers, 'labimagingdentalopticalServiceUrl');

                const userObjects = userDetails?.data?.data;

                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {
                        if (userObject?.for_portal_user?.notification === true) {
                            const portal_user_id = mongoose.Types.ObjectId(userObject?.for_portal_user?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'labimagingdentaloptical/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'labimagingdentalopticalServiceUrl'
                            );

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }
            } catch (err) {
                console.log("errorrrrr", err)
            }
        }

        if (req.body.notification_applies == 'Optical') {
            try {
                userDetails = await httpService.getStaging('labimagingdentaloptical/get-four-portal-superadmin-list', { page: 1, limit: 0, status: "APPROVED", searchText: "", from_date: "", to_date: "", type: notification_applies }, headers, 'labimagingdentalopticalServiceUrl');

                const userObjects = userDetails?.data?.data;

                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {
                        if (userObject?.for_portal_user?.notification === true) {
                            const portal_user_id = mongoose.Types.ObjectId(userObject?.for_portal_user?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'labimagingdentaloptical/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'labimagingdentalopticalServiceUrl'
                            );

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }
            } catch (err) {
                console.log("errorrrrr", err)
            }
        }

        if (req.body.notification_applies == 'Paramedical-Professions') {
            try {
                userDetails = await httpService.getStaging('labimagingdentaloptical/get-four-portal-superadmin-list', { page: 1, limit: 0, status: "APPROVED", searchText: "", from_date: "", to_date: "", type: notification_applies }, headers, 'labimagingdentalopticalServiceUrl');

                const userObjects = userDetails?.data?.data;

                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {
                        if (userObject?.for_portal_user?.notification === true) {
                            const portal_user_id = mongoose.Types.ObjectId(userObject?.for_portal_user?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'labimagingdentaloptical/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'labimagingdentalopticalServiceUrl'
                            );

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }
            } catch (err) {
                console.log("errorrrrr", err)
            }
        }

        if (req.body.notification_applies == 'Laboratory-Imaging') {
            try {
                userDetails = await httpService.getStaging('labimagingdentaloptical/get-four-portal-superadmin-list', { page: 1, limit: 0, status: "APPROVED", searchText: "", from_date: "", to_date: "", type: notification_applies }, headers, 'labimagingdentalopticalServiceUrl');

                const userObjects = userDetails?.data?.data;

                if (Array.isArray(userObjects)) {
                    for (const userObject of userObjects) {

                        if (userObject?.for_portal_user?.notification === true) {

                            const portal_user_id = mongoose.Types.ObjectId(userObject?.for_portal_user?._id);

                            const objectData = {
                                created_by: req.body.created_by,
                                content: req.body.content,
                                created_by_type: req.body.created_by_type,
                                for_portal_user: [portal_user_id],
                                notitype: req.body.notification_name,
                            };

                            // Assuming 'httpService.postStaging' returns a Promise
                            const portalData = await httpService.postStaging(
                                'labimagingdentaloptical/save-superadmin-notification',
                                { data: objectData },
                                headers,
                                'labimagingdentalopticalServiceUrl'
                            );

                            const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: '' }, {}, "gatewayServiceUrl");
                        }
                    }
                }
            } catch (err) {
                console.log("errorrrrr", err)
            }
        }

        // Create a new notification
        const newNotification = new NotificationManagement({
            notification_name,
            created_by,
            content,
            notification_type,
            time,
            notification_applies,
        });

        data1 = await newNotification.save();

        sendResponse(req, res, 200, {
            status: true,
            body: data1,
            message: "notification send successfully.",
            errorCode: null,
        });
    } catch (error) {
        console.log(error);
        sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Failed to add notification. ",
            errorCode: "INTERNAL_SERVER_ERROR",
        });
    }
}

export const getNotificationList = async (req, res) => {
    try {
        const { limit, page, searchText } = req.query;

        var sort = req.query.sort
        // console.log("sort------",sort);
        var sortingarray = {};
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            console.log("IFFFFFF");
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = Number(value);
        } else {
            sortingarray['createdAt'] = -1;
        }
        var filter = {
            isDeleted:false
        }

        if (searchText != "") {
            filter['$or'] = [
                {
                    notification_name: { $regex: searchText, $options: "i" },
                }
            ]
        }
        var notificationCount;
        var notificationList;
        var aggregate = [
            {
                $match: filter,
            }
        ]
        notificationCount = await NotificationManagement.aggregate(aggregate)
        aggregate.push(
            {
                $sort: sortingarray
            }
        )
        if (limit != 0) {
            aggregate.push(
                {
                    $skip: (page - 1) * limit

                }, {
                $limit: limit * 1
            }
            )
        }
        notificationList = await NotificationManagement.aggregate(aggregate)

        return sendResponse(req, res, 200, {
            status: true,
            body: {
                data: notificationList,
                totalPages: Math.ceil(notificationCount.length / limit),
                currentPage: page,
                totalRecords: notificationCount.length,
            },
            message: "List fetched successfully",
        });

    } catch (err) {
        console.log("err", err);
        return sendResponse(req, res, 500, {
            status: false,
            body: err,
            message: "Internal server error",
        });
    }
}

export const getNotificationById = async (req, res) => {
    try {
        const { _id } = req.query;
        const result = await NotificationManagement.findOne({ _id: mongoose.Types.ObjectId(_id) })

        sendResponse(req, res, 200, {
            status: true,
            data: result,
            message: `Notification Fetch successfully`,
            errorCode: null,
        })

    } catch (err) {
        console.log(err);
        sendResponse(req, res, 500, {
            status: false,
            data: err,
            message: `failed to fetched list`,
            errorCode: "INTERNAL_SERVER_ERROR",
        });
    }
}

export const deleteNotification = async (req, res) => {
    try{
       const {_id} = req.body;
       const result = await NotificationManagement.findByIdAndUpdate(_id, { $set: {isDeleted:true} }, { new: true });

       if(result){
        sendResponse(req, res, 200, {
            status: true,
            data: result,
            message: `Notification Deleted successfully`,
            errorCode: null,
        })
       }else{
        sendResponse(req, res, 400, {
            status: true,
            data: [],
            message: `Notification Not Deleted`,
            errorCode: null,
        })
       }
    } catch (err) {
        console.log("err", err);
        return sendResponse(req, res, 500, {
            status: false,
            body: err,
            message: "Internal server error",
        });
    }
}