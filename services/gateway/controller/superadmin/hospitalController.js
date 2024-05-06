"use strict";

import HttpService from "../../middleware/httpservice";

export const listAllHospitalAdminUser = async (req, res) => {
    HttpService.getWithAuth(req, res, 'hospital/list-all-hospital-admin-user', 'superadminServiceUrl');
}
export const approveOrRejectHospital = async (req, res) => {
    HttpService.postWithAuth(req, res, 'hospital/approve-or-reject-hospital', 'superadminServiceUrl');
}
export const viewHospitalAdminDetails = async (req, res) => {
    HttpService.getWithAuth(req, res, 'hospital/view-hospital-admin-details', 'superadminServiceUrl')
}


