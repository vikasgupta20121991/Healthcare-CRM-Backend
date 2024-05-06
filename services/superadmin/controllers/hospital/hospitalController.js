import { handleResponse } from "../../helpers/transmission";
const Http = require('../../helpers/httpservice');

const httpService = new Http()
class HospitalController {
    // async listAllHospitalAdminUser(req, res) {
    //     try {
    //         const data = {
    //           page: req.query.page ? req.query.page : 1,
    //           limit: req.query.limit ? req.query.limit : 10,
    //           name: req.query.name ? req.query.name : '',
    //           email: req.query.email ? req.query.email : ''
    //         }
    //         const getAllHospital = await httpService.get('hospital/list-hospital-admin-user', data, '', 'labimagingdentalopticalServiceUrl');
    //         handleResponse(req, res, 200, {
    //             status: true,
    //             body: getAllHospital,
    //             message: "list hospital admin user",
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
    // async approveOrRejectHospital(req, res) {
    //     const body = {
    //         action: req.body.action,
    //         id: req.body.hospital_id,
    //         approved_or_rejected_by: req.user._id
    //     }
        
    //     try {
    //         const result = await httpService.post('hospital/approve-or-reject-hospital', body, '', 'labimagingdentalopticalServiceUrl');
    //         handleResponse(req, res, 200, {
    //             status: true,
    //             body: null,
    //             message: result.message,
    //             errorCode: null,
    //           });
    //     } catch (error) {
    //         handleResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "failed to accept hospital request",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //           });
    //     }
    // }
    // async viewHospitalAdminDetails(req, res) {
    //     try {
    //         const data = {
    //             hospital_admin_id: req.query.hospital_admin_id
    //         }
    //         const getHospitalAdminDetails = await httpService.get('hospital/view-hospital-admin-details', data, '', 'labimagingdentalopticalServiceUrl');
    //         handleResponse(req, res, 200, {
    //             status: true,
    //             body: getHospitalAdminDetails,
    //             message: getHospitalAdminDetails.message,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         handleResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "failed to view hospital admin details",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //           });
    //     }
    // }
}

module.exports = new HospitalController()