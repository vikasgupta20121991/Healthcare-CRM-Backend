const reader = require('xlsx')
const fs = require('fs');
import { sendResponse } from '../helpers/transmission'

const readFileContent = (req, res) => {
    // console.log(req.file, 'req.file');
    const filePath = './uploads/' + req.filename
    const file = reader.readFile(filePath)
    let data = []
    const sheets = file.SheetNames
    for (let i = 0; i < 1; i++) {
        // console.log(file.SheetNames[i], "file.SheetNames");
        const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]], {
            header: 0,
            defval: "",
            raw: false
        })
        temp.forEach((res, index) => {
            var obj = 0
            for (const key in res) {

                const element = res[key];
                if (element.trim() == "" && key.includes("__EMPTY")) {
                    delete res[key]
                }
                if (element.trim() == "" && !key.includes("__EMPTY")) {
                    obj = 1
                }
            }
            if (obj == 0) {
                for (const key in res) {
                    if (key == "category_limit") {
                        res[key] = res[key].replace(/ +/g, "")
                    }
                    if (key == "service_limit") {
                        res[key] = res[key].replace(/ +/g, "")
                    }
                    if (key == "repayment_condition_max") {
                        res[key] = res[key].replace(/ +/g, "")
                    }
                    if (key == "repayment_condition_for") {
                        res[key] = res[key].replace(/ +/g, "")
                    }
                    if (key == "waiting_period_max") {
                        res[key] = res[key].replace(/ +/g, "")
                    }
                    if (key == "reimbursment_rate") {
                        res[key] = res[key].replace(/ +/g, "")
                    }
                    res[key] = res[key].trim();
                }
                data.push(res)
            }
        })
    }
    if (data.length == 0) {
        return sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "Your uploaded excel is invalid, please check with sample excel",
            errorCode: null,
        });
    }
    const requestBodyCount = Object.keys(req.body).length
    const fileColumnCount = Object.keys(data[0]).length

    if (requestBodyCount !== fileColumnCount) {
        fs.unlinkSync(filePath)
        return sendResponse(req, res, 200, {
            status: false,
            data: null,
            message: `Uploaded excel sheet column is less than or greater than sample sheet column`,
            errorCode: "INTERNAL_SERVER_ERROR",
        });
    }
    let index = 1
    for (const iterator of Object.keys(data[0])) {
        if (iterator.trim() !== req.body[`col${index}`]) {
            fs.unlinkSync(filePath)
            return sendResponse(req, res, 200, {
                status: false,
                data: null,
                message: `Uploaded excel sheet column is miss-matched with sample sheet column`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
        index++
    }
    fs.unlinkSync(filePath)
    sendResponse(req, res, 200, {
        status: true,
        body: data,
        message: "file read successfully",
        errorCode: null,
    });
}

export default readFileContent