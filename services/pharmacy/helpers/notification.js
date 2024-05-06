"use strict";
import axios from "axios";
import { decryptionData } from "./crypto";
const config = require("../config/constants");
const BaseUrl = config.config.BaseUrl;

export const notification = (async (notificationFor, headers,requestData) => {
    console.log("headers_______",headers)
    var baseurl = BaseUrl[notificationFor]
    var path
    if (notificationFor == "pharmacyServiceUrl") {
        path = "pharmacy/notification"
    }
    if (notificationFor == "patientServiceUrl") {
        path = "patient/notification"
    }

    if (notificationFor == "superadminServiceUrl") {
        path = "superadmin/notification"
    }
    const data = requestData
    try {
        return new Promise((resolve, reject) => {
            axios({
                method: 'post',
                url: `${baseurl}/${path}`,
                data,
                // headers
                // ...(headers ?  headers : ""),
                headers: headers ? headers : ""
            }).then(async function (response) {
                if (config.config.NODE_ENV == "local") {
                    resolve(response.data)
                } else {
                    const decryData = decryptionData(response.data)
                    const obj = JSON.parse(decryData);
                    resolve(obj)
                }
            }).catch(async function (error) {
                reject(error)
            });
        })
    } catch (err) {
        console.log(err);
        return err;
    }
})