
"use strict";

import axios from "axios";
import { decryptionData } from "./crypto";
const config = require("../config/constants");
const BaseUrl = config.config.BaseUrl;
const BACKEND_SERVER_URL = config.config.BACKEND_SERVER_URL;
class Http {

    get(path, data, headers, service) {
        const baseurl = BaseUrl[service];
        console.log(`${baseurl}/${path}`);
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
    getStaging(path, data, headers, service) {
        const baseurl = BaseUrl[service];
        console.log(baseurl+path,"sddsdsssssssssss");
        return new Promise((resolve, reject) => {
            axios({
                method: 'get',
                url: `${baseurl}/${path}`,
                params: data,
                headers
            }).then(async function (response) {
                // console.log(response,"responseresponseresponse");
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
    }
    post(path, data, headers, service) {
        const baseurl = BaseUrl[service];
        console.log(`${baseurl}/${path}`);
        return new Promise((resolve, reject) => {
            axios({
                method: 'post',
                url: `${baseurl}/${path}`,
                data,
                headers
            }).then(async function (response) {
                resolve(response.data)
            }).catch(async function (error) {
                reject(error)
            });
        })
    }
    postStaging(path, data, headers, service) {
        const baseurl = BaseUrl[service];
        return new Promise((resolve, reject) => {
            axios({
                method: 'post',
                url: `${baseurl}/${path}`,
                data,
                headers
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
    }
}

module.exports = Http