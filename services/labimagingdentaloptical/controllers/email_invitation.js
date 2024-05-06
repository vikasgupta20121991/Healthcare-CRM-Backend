import { sendMailInvitations } from '../helpers/emailTemplate'
import Invitation from '../models/email_invitation';
import mongoose from 'mongoose';
import PortalUser from '../models/portal_user'
import { sendResponse } from "../helpers/transmission";
import {sendEmail} from "../helpers/ses";

export const sendInvitation = async (req, res) => {
    try {
        const {
            first_name,
            middle_name,
            last_name,
            email,
            phone,
            address,
            created_By,
            verify_status,
            invitationId,
            type
        } = req.body;
        // console.log(req.body, "=========req");

        if (invitationId) {
            // Update the existing record
            const updatedUserData = await Invitation.findOneAndUpdate(
                { _id: invitationId },
                {
                    $set: {
                        first_name,
                        middle_name,
                        last_name,
                        email,
                        phone,
                        address,
                        created_By,
                        verify_status: "PENDING",
                        type
                    }
                },
                { new: true }
            );

            if (updatedUserData) {
                const loggedInData = await PortalUser.find({ _id: created_By });
                const loggeInname = loggedInData[0].full_name;
                // console.log("loggeInname===>", loggeInname);
                const content = sendMailInvitations(email, first_name, last_name, loggeInname);
                const mailSent = await sendEmail(content);

                if (mailSent) {
                    updatedUserData.verify_status = "SEND";
                    const result = await updatedUserData.save();
                    // console.log("result-->", result);
                }

                sendResponse(req, res, 200, {
                    status: true,
                    data: updatedUserData,
                    message: `Invitation updated and sent successfully`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 404, {
                    status: false,
                    data: null,
                    message: `Invitation with ID ${invitationId} not found`,
                    errorCode: "NOT_FOUND",
                });
            }
        } else {
            // Create a new record
            let userData = await Invitation.findOne({ email, verify_status: "PENDING" });

            if (!userData) {
                userData = new Invitation({
                    first_name,
                    middle_name,
                    last_name,
                    email,
                    phone,
                    address,
                    created_By,
                    verify_status: "PENDING",
                    type
                });
                userData = await userData.save();
            }

            const loggedInData = await PortalUser.find({ _id: created_By });
            const loggeInname = loggedInData[0].full_name;
            // console.log("loggeInname===>", loggeInname);
            const content = sendMailInvitations(email, first_name, last_name, loggeInname);
            const mailSent = await sendEmail(content);

            if (mailSent) {
                userData.verify_status = "SEND";
                const result = await userData.save();
                console.log("result-->", result);
            }

            if (userData) {
                // console.log("run");
                sendResponse(req, res, 200, {
                    status: true,
                    data: userData,
                    message: `Invitation sent successfully`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: `Invitation Send successfully`,
                    errorCode: null,
                });
            }
        }
    } catch (err) {
        console.log(err);
        sendResponse(req, res, 500, {
            status: false,
            data: err,
            message: `Failed to send invitation`,
            errorCode: "INTERNAL_SERVER_ERROR",
        });
    }
};

export const getAllInvitation = async (req, res) => {
    try {
        const { for_portal_user, page, limit, searchKey, createdDate, updatedDate,type } = req.query;
        var sort = req.query.sort
        var sortingarray = {};
        if (sort != 'undefined' && sort != '' && sort != undefined)  {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = value;
        } else {
            sortingarray['createdAt'] = -1;
        }
        const filter = {
            type:type,
            isDeleted:false
        };
        // const filterDate = {};

        if (searchKey && searchKey !== "") {
            filter.$or = [
                { first_name: { $regex: searchKey } },
            ];
        }

        var dateFilter = {}
        if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
            const createdDateObj = new Date(createdDate);
            const updatedDateObj = new Date(updatedDate);
            // dateFilter.createdAt = createdDateObj.toISOString();
            dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
        }
        else if (createdDate && createdDate !== "") {
            const createdDateObj = new Date(createdDate);
            // dateFilter.createdAt = createdDateObj.toISOString();
            dateFilter.createdAt = { $gte: createdDateObj };
        }
        else if (updatedDate && updatedDate !== "") {
            const updatedDateObj = new Date(updatedDate);
            dateFilter.createdAt = { $lte: updatedDateObj };
        }

        const listdata = await Invitation.find({
            created_By: for_portal_user,
            ...filter,
            ...dateFilter,
        })
            .sort(sortingarray)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Invitation.countDocuments({});

        sendResponse(req, res, 200, {
            status: true,
            body: {
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                totalRecords: count,
                listdata,
            },
            message: `List Fetch successfully`,
            errorCode: null,
        });
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

export const getInvitationById = async (req, res) => {
    try {
        const { id } = req.query;
        const result = await Invitation.findOne({ _id: mongoose.Types.ObjectId(id) })

        sendResponse(req, res, 200, {
            status: true,
            data: result,
            message: `Invitation Fetch successfully`,
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

export const deleteInvitation = async (req, res) => {
    const {
        invitationId
    } = req.body
    try {
        const result = await Article.findOneAndUpdate(
            { _id: invitationId },
            {
                isDeleted: true
            },
            { new: true }
        )
        sendResponse(req, res, 200, {
            status: true,
            body: result,
            message: `Successfully deleted Invitation`,
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: error.message ? error.message : "failed to delete Invitation",
            errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
        });
    }
}