// import {ComplaintManagement} from "../../models/complaint_management/complaint_management";
import ComplaintManagement from "../../models/complaint_management/complaint_management"
import { sendResponse } from "../../helpers/transmission";
import Http from "../../helpers/httpservice";
import mongoose from "mongoose";
const httpService = new Http()

class ComplaintManagementController {

    async addComplaintManagement(req, res) {
        try {
            const { complaint_id,
                complaint_subject,
                provider_type_to,
                provider_type_from,
                complaint_body,
                provider_response,
                super_admin_response,
                complaint_to_user_id,
                complaint_to_user_name,
                complaint_from_user_id,
                complaint_from_user_name,
                status,
                complain_date,
                complain_time,
                dateofcreation
             } = req.body


            const savedata = new ComplaintManagement({
                complaint_id,
                complaint_subject,
                provider_type_to,
                provider_type_from,
                complaint_body,
                provider_response,
                super_admin_response,
                complaint_to_user_id,
                complaint_to_user_name,
                complaint_from_user_id,
                complaint_from_user_name,
                status,
                complain_date,
                complain_time,
                dateofcreation
            })

            const savedComplaintManagement = await savedata.save();

            sendResponse(req, res, 200, {
                status: true,
                body: savedComplaintManagement,
                message: "Complaint added successfully.",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to add complaint. ",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async allComplaintManagement(req, res) {
        try {
            const { limit, page, searchText, dateFilter, type, userId  } = req.query;

      var sort = req.query.sort;
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined)  {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            console.log("sortingarray===",sortingarray);

            var filter = {}
            if(dateFilter !="" && dateFilter != undefined){
                filter.createdAt = dateFilter;
            }
            if (searchText != "") {
                filter['$or'] =  [

                    {
                        complaint_subject: { $regex: searchText, $options: "i" },
                    }

                ]               

            }
            if(userId && type == 'patient'){
                filter.complaint_from_user_id = mongoose.Types.ObjectId(userId) 
                
            }
            if(userId && (type == 'pharmacy' || type == 'doctor' || type == 'hospital' || type == "Laboratory-Imaging" || type == "Paramedical-Professions" || type == "Optical" || type == "Dental" ) ){
                filter.complaint_to_user_id = mongoose.Types.ObjectId(userId) 
                
            }
            var complaintCount;
            var complaintList;
            if (type == "patient" || type == 'pharmacy' || type == 'doctor' || type == 'hospital' || type == "Laboratory-Imaging" || type == "Paramedical-Professions" || type == "Optical" || type == "Dental" ) {
                var aggregate = [
                    {
                        $match: filter,
                    }
                     

                ]
                complaintCount = await ComplaintManagement.aggregate(aggregate)
                aggregate.push(
                    {
                        $sort: sortingarray
                    }
                )
                if(limit != 0){
                    aggregate.push(
                        {
                            $skip: (page - 1) * limit
    
                        }, {
                            $limit: limit * 1
                        }
                    )
                }
                complaintList = await ComplaintManagement.aggregate(aggregate)

            }

            if (type == 'superadmin') {
                var aggregate = [
                    {
                        $match: filter,
                    }
                     
                ]
                complaintCount = await ComplaintManagement.aggregate(aggregate)
                aggregate.push(
                    {
                        $sort: sortingarray
                    }
                )
                if(limit != 0){
                    aggregate.push(
                        {
                            $skip: (page - 1) * limit
    
                        }, {
                            $limit: limit * 1
                        }
                    )
                }
                complaintList = await ComplaintManagement.aggregate(aggregate)
            }
            if (complaintList) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        data: complaintList,
                        totalPages: Math.ceil(complaintCount.length / limit),
                        currentPage: page,
                        totalRecords:complaintCount.length,
                    },
                    message: "Getting Complaint list successsfully.",
                    errorCode: null,
                });

            }

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to get Complaint list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async allDetails(req, res) {

        try {
            const { _id } = req.query;

            const complaintReason = await ComplaintManagement.findOne({ _id });
            const headers = {
                'Authorization': req.headers['authorization']
            }
            var userDetails = {};
            if (complaintReason.provider_type_to == 'doctor' || complaintReason.provider_type_to == 'hospital') {
                userDetails = await httpService.getStaging('individual-doctor/get-individual-doctors-by-id', { for_portal_user: complaintReason?.complaint_to_user_id.toString(), forUser: complaintReason?.provider_type_to }, headers, 'hospitalServiceUrl');
            }

            if (complaintReason.provider_type_to == 'pharmacy') {
             
                try {
                    userDetails = await httpService.getStaging('pharmacy/get-PharmacyBy-Id', { for_portal_user: complaintReason?.complaint_to_user_id.toString() }, headers, 'pharmacyServiceUrl');
        console.log("userDetails 1",userDetails);
                    
                } catch (error) {
                    console.log(error, 'errorerrorerrorerror');
                }
            }

            if (complaintReason.provider_type_to == 'insurance') {
                userDetails = await httpService.getStaging('insurance/get-Insurance-By-Id', { for_portal_user: complaintReason.complaint_to_user_id.toString() }, headers, 'insuranceServiceUrl');
            }
        
        if (complaintReason.provider_type_to == 'Paramedical-Professions' || complaintReason.provider_type_to == 'Laboratory-Imaging' || complaintReason.provider_type_to == 'Optical' || complaintReason.provider_type_to == 'Dental' ) {
            userDetails = await httpService.getStaging('labimagingdentaloptical/get-Idby-portaluser-name', { portalId: complaintReason.complaint_to_user_id.toString() }, headers, 'labimagingdentalopticalServiceUrl');
        }
        let userData = userDetails?.body;
        let profilePic=userDetails?.profilePic
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    userData,
                    complaintReason,
                    profilePic
                },
                message: `Getting complaint successsfully.`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to get complaint.",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async add_updateResponse(req, res) {
        const { super_admin_response, provider_response, _id, status } = req.body
        try {
            let payload = {}
            if (super_admin_response) {
                payload.super_admin_response = super_admin_response
            }
            if (provider_response) {
                payload.provider_response = provider_response
            }
            if (status) {
                payload.status = status
            }
            const complaint = await ComplaintManagement.findOneAndUpdate({ _id }, {
                $set: payload
            });

            if(complaint){

                sendResponse(req, res, 200, {
                    status: true,
                    body: complaint,
                    message: "Complaint has been Successfully Updated",
                    errorCode: null,
                });
            }else{

                sendResponse(req, res, 404, {
                    status: false,
                    body: complaint,
                    message: "Something went wrong please try again.",
                    errorCode: null,
                });
            }
           
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to update complaint.",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
}

module.exports = new ComplaintManagementController();
