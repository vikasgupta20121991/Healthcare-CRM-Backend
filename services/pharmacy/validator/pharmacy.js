const { body, check } = require("express-validator");

export const registerValidator = [
  body("email", "Please Enter the Email Id").not().isEmpty(),
  body("email", "Please Enter a Valid Email Id").isEmail(),
  body("password", "Please Enter the Password").not().isEmpty(),
  body("country_code", "Please Enter the Country code").not().isEmpty(),
  body("user_name", "Please Enter the Username").not().isEmpty(),
  body("pharmacy_name", "Please Enter the Pharmacy Name").not().isEmpty(),
  body("phone_number", "Please Enter the Phone Number").not().isEmpty(),
];
