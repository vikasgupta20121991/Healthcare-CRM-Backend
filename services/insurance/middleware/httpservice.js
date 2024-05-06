
"use strict";

import axios from "axios";
const config = require("../config/config.js").get();
const { BaseUrl } = config;

class Http {

    get(path, data, headers){
        const baseurl = BaseUrl.insuranceServiceUrl;
        return new Promise((resolve, reject) => {
            axios({
                method: 'get',
                url: `${baseurl}/${path}`,
                params: data,
                headers
            }).then(async function (response) {
                resolve(response.data)
            }).catch(async function (error) {
                reject(error)
            });
        })
    }
}

module.exports = Http