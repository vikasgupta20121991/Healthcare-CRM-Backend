import { handleResponse, sendResponse } from "../../helpers/transmission";
// import speciality from "../../models/speciality";

// const config = require("../../config/config")
import { config } from "../../config/constants"
const BASEURL = config.BaseUrl
import axios from "axios"

class SpecialityController {

    async create(req, res) {
        const baseurl = BASEURL.hospitalServiceUrl;
        axios({
            method: 'post',
            url: `${baseurl}/hospital/add-specialty`,
            data: req.body,
            params: req.query,
            headers: { 'Authorization': req.header("Authorization") },
        }).then(async function (response) {
            await res.status(response.status).json(response.data)
        }).catch(async function (error) {
            console.log(error)
            await res.status(200).json(error)
        });
    }

    // async create(req, res) {
    //     try {
    //         const { specialityArray, added_by } = req.body
    //         const list = specialityArray.map((singleData) => ({
    //             ...singleData,
    //             added_by
    //         }));

    //         const savedSpeciality = await speciality.insertMany(list)
    //         handleResponse(req, res, 200, {
    //             status: true,
    //             body: savedSpeciality,
    //             message: "Successfully add speciality",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         handleResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "Something went wrong",
    //             errorCode: null,
    //         });
    //     }
    // }
    async update(req, res) {
        const baseurl = BASEURL.hospitalServiceUrl;
        axios({
            method: 'post',
            url: `${baseurl}/hospital/update-specialty`,
            data: req.body,
            params: req.query,
            headers: { 'Authorization': req.header("Authorization") },
        }).then(async function (response) {
            await res.status(response.status).json(response.data)
        }).catch(async function (error) {
            console.log(error)
            await res.status(200).json(error)
        });
    }
    // async update(req, res) {
    //     try {
    //         const {
    //             specialityId,
    //             specilization,
    //             active_status,
    //             delete_status
    //         } = req.body
    //         const updateSpeciality = await speciality.updateOne(
    //             { _id: specialityId },
    //             {
    //                 $set: {
    //                     specilization,
    //                     active_status,
    //                     delete_status
    //                 }
    //             },
    //             { new: true }
    //             ).exec();
    //         handleResponse(req, res, 200, {
    //             status: true,
    //             body: updateSpeciality,
    //             message: "Successfully updated speciality",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         handleResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "Something went wrong",
    //             errorCode: null,
    //         });
    //     }
    // }

    async delete(req, res) {
        const baseurl = BASEURL.hospitalServiceUrl;
        axios({
            method: 'post',
            url: `${baseurl}/hospital/action-on-specialty`,
            data: req.body,
            params: req.query,
            headers: { 'Authorization': req.header("Authorization") },
        }).then(async function (response) {
            await res.status(response.status).json(response.data)
        }).catch(async function (error) {
            console.log(error)
            await res.status(200).json(error)
        });
    }


    // async delete(req, res) {
    //     try {
    //         const { specialityId, action_name, action_value } = req.body

    //         const filter = {}
    //         if (action_name == "active") filter['active_status'] = action_value
    //         if (action_name == "delete") filter['delete_status'] = action_value

    //         const deleteSpeciality = await speciality.updateOne(
    //             { _id: specialityId },
    //             filter,
    //             { new: true }
    //             ).exec();
    //         handleResponse(req, res, 200, {
    //             status: true,
    //             message: "Successfully action done",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         handleResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "Something went wrong",
    //             errorCode: null,
    //         });
    //     }
    // }

    async list(req, res) {
        const baseurl = BASEURL.hospitalServiceUrl;
        axios({
            method: 'get',
            url: `${baseurl}/hospital/all-specialty`,
            data: req.body,
            params: req.query,
            headers: { 'Authorization': req.header("Authorization") },
        }).then(async function (response) {
            await res.status(response.status).json(response.data)
        }).catch(async function (error) {
            console.log(error)
            await res.status(200).json(error)
        });
    }
    // async list(req, res) {
    //     try {
    //         const { limit, page, searchText } = req.query
    //         var filter = { delete_status: false }
    //         if (searchText != "") {
    //             filter = {
    //                 delete_status: false,
    //                 specilization: { $regex: searchText || '', $options: "i" }
    //             }
    //         }
    //         const specialityList = await speciality.find(filter)
    //             .populate({
    //                 path: "added_by",
    //                 select: {
    //                     role: 1
    //                 }
    //             })
    //             .sort([["createdAt", -1]])
    //             .limit(limit * 1)
    //             .skip((page - 1) * limit)
    //             .exec();
    //         const count = await speciality.countDocuments(filter);
    //         handleResponse(req, res, 200, {
    //             status: true,
    //             body: {
    //                 totalCount: count,
    //                 data: specialityList,
    //             },
    //             message: "Successfully get speciality list",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         handleResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "Something went wrong",
    //             errorCode: null,
    //         });
    //     }
    // }
    
}

module.exports = new SpecialityController()