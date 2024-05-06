const { body } = require("express-validator");

const signupValidator = [
  body("username", "Please Enter a Valid Username").not().isEmpty(),
  body("email", "Please enter a valid email").isEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("must be at least 6 chars long")
    .matches(/\d/)
    .withMessage("must contain a number"),
];

const loginValidator = [
  body("email", "Please enter a valid email").isEmail(),
  body("password", "Please enter a valid password")
    .isLength({
      min: 6,
    })
    .matches(/\d/),
];

module.exports = {
  signupValidator,
  loginValidator,
};
