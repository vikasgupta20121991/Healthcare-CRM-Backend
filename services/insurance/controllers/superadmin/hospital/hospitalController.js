class HospitalController {
    async listAllHospitalAdminUser(req, res) {
        try {
            handleResponse(req, res, 200, {
                status: true,
                body: null,
                message: "list hospital admin user",
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