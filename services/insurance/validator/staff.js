const { body, check } = require("express-validator");

const staffValidator = [
    body("staff_name", "Please Enter a Valid Name").not().isEmpty(),   
    body('email',"please enter valid email").isEmail().normalizeEmail(),
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