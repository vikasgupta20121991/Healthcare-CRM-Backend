const { body, check } = require("express-validator");

const menuValidator = [
    body("menu_order", "Please Enter a Valid Number").not().isEmpty(),
    body("slug", "Please Enter a Valid Slug").not().isEmpty()
];

const editMenuValidator=[
    ...menuValidator,
    body("id", "Please Enter a Valid Id").not().isEmpty(),
]

const permValidator = [
    body("menu_id", "Please Enter a Valid MenuId").not().isEmpty(),
    body("perm_name", "Please Enter Permission Name").not().isEmpty()
];

const editPermValidator = [
    ...permValidator,
    body("id", "Please Enter a Valid Id").not().isEmpty(),
]



module.exports = {
    menuValidator,
    editMenuValidator,
    permValidator,
    editPermValidator
}