"use strict";

import HttpService from "../../middleware/httpservice";

export const getAllHealthPlan = async (req, res) => {
    HttpService.getWithAuth(req, res, 'insurance/get-all-health-plan', 'insuranceServiceUrl');
}
