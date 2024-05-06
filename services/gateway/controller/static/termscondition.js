"use strict";

import 'dotenv/config';
import axios from "axios";

const NODE_ENV = process.env.NODE_ENV || "local";

const config = require("../config/config.js").get();
const { BaseUrl } = config;

export const termscondition = async (req, res) => {
    const baseurl = BaseUrl.staticService;
    axios({
      method: 'get',
      url: `${baseurl}/terms_condition/list`,
    }).then(async function (response) {
      await res.status(200).json({ data: response.data })
    })
      .catch(async function (error) {
        await res.status(400).json({ data: error.response.data })
      });
  }