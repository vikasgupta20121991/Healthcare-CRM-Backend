const { body, check } = require("express-validator");

const staffValidator = [
    body("staff_name", "Please Enter a Valid Name").not().isEmpty(),
    body("dob", "Please enter a valid date").not().isEmpty(),
    body("language","Please enter valid language").not().isEmpty(),
    body("address","Please enter valid address").not().isEmpty(),
    body("city","Please enter valid city").not().isEmpty(),
    body("zip","Please enter valid zip").not().isEmpty(),
    body("country","Please enter valid country").not().isEmpty(),
    body("state","Please enter valid state").not().isEmpty(),
    body("degree","Please enter valid degree").not().isEmpty(),
    body("phone_no","Please enter valid phone no").not().isEmpty(),
    body('email',"please enter valid email").isEmail().normalizeEmail(),
    body('for_role',"please enter valid email").not().isEmpty(),
    body('username',"please enter valid username").not().isEmpty(),
    body('password',"please enter valid password").not().isEmpty(),

];

const editStaffValidator=[
    ...staffValidator,
    body("id", "Please Enter a Valid Id").not().isEmpty(),
]


module.exports = {
    staffValidator,
    editStaffValidator
}