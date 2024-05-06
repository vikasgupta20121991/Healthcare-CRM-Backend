//.....................Hospital user validator......................................................
const { body, check } = require("express-validator");
const adminSignupValidator = [
  body("fullName", "Please Enter a Valid full Name").not().isEmpty(),
  body("email", "Please enter a valid email").isEmail(),
  // body("hospitalName", "Please Enter a Valid Hospital Name").not().isEmpty(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("must be at least 6 chars long")
    .matches(/\d/)
    .withMessage("must contain a number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("must contain sepcial character"),
];

const hospitalProfileValidator = [
  // body("address", "Please Enter a Valid Address").not().isEmpty(),
  // body("zip", "Please Enter a Valid Zip").not().isEmpty(),
  // body("companyName", "Please enter a Company Name").isEmail(),
  // body("companySlogan", "Please enter a Company Slogan").isEmail(),
  // body("companySlogan", "Please enter a Company Slogan").isEmail(),
];

const loginValidator = [
  body("email", "Please enter a valid email").isEmail(),
];



module.exports = {
  //Insurance user validator
  adminSignupValidator,
  hospitalProfileValidator,
  loginValidator
};
