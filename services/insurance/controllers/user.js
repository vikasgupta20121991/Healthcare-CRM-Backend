"use strict";

// models
// import InsuranceUser from "../models/user.js";

// utils
import { sendResponse } from "../helpers/transmission";

export const checkUserExistsOrNot = async (req, res) => {
  try {
      const role = req.header('role')
      const getUser = await findUser(req.query, role)
      let data;
      if (getUser) {
          data = {
              message: null,
              data: getUser,
              status: 'success'
          }
      } else {
          data = {
              message: 'User not exist',
              data: null,
              status: 'fail'
          }
      }
      res.status(200).json(data)
  } catch (error) {
      throw new Error(error.message)
  }
}

const findUser = async data => {
  return null;
  // return new Promise((resolve, reject) => {
  //   InsuranceUser.findOne(
  //     {
  //       $and: [
  //         { email: data.email }
  //       ]
  //     },
  //     "email fullName password",
  //     (err, item) => {
  //       if(err) reject(err)
  //       resolve(item);
  //     }
  //   );
  // });
};
