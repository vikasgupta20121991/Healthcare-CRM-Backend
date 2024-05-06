import { handleResponse } from "../../helpers/transmission";
import AssignStaff from "../../models/hospital/assignstaff";

class HospitalController{
    async assignStaff(req, res) {
        try {
            const {
                id,
                parent_id,
                assign_to_id,
                assign_to_name
            } = req.body

            let assignData;
            let result;
            if (id) {
                assignData = await AssignStaff.find({_id: id})
            }
            if (assignData && assignData.length) {
                result = await AssignStaff.findOneAndUpdate(
                    { _id: id },
                    { $set: { 
                        parent_id,
                        assign_to_id,
                        assign_to_name,
                        assigned_by: req.user._id
                     } },
                    { upsert: false, new: true }
                ).exec();
            } else {
                const assign = new AssignStaff({
                    parent_id,
                    assign_to_id,
                    assign_to_name,
                    assigned_by: req.user._id
                })
                result = await assign.save();
            }
            if (result) {
                handleResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "successfully assign staff",
                    errorCode: null,
                });
            } else {
                handleResponse(req, res, 500, {
                    status: false,
                    body: null,
                    message: "Something went wrong",
                    errorCode: null,
                });
            }
        } catch (error) {
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Something went wrong",
                errorCode: null,
            });
        }
    }
    async listAssignedStaff(req, res) {
        const result = await AssignStaff.find({assigned_by: req.user._id})
                        .sort([["createdAt", -1]])
                        .exec();
        try {
            handleResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched assinged staff",
                errorCode: null,
            });
        } catch (error) {
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Something went wrong",
                errorCode: null,
            });
        }
    }
}

module.exports = new HospitalController()