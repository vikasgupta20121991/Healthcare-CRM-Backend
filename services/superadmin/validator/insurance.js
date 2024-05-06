const { body, check } = require("express-validator");

const commonValidator = [
  body("name", "Please Enter a Valid Name").not().isEmpty(),
  body("status", "Please enter a valid Status").isBoolean(),
];

const paginationValidator = [
  body("limit", "Please enter a valid Limit").isNumeric(),
  body("page", "Please enter a valid Page").isNumeric(),
];

const categoryValidator = [
  ...commonValidator,
  body("userId", "Please Enter a Valid UserId").not().isEmpty(),
];

const categoryServiceValiator = [
  ...commonValidator,
  body("categoryId", "Please Enter a Valid CategoryId").not().isEmpty(),
];

const listCategoryValiator = [
  ...paginationValidator,
  body("userId", "Please Enter a Valid UserId").not().isEmpty(),
];

const updateCategoryServiceValiator = [
  ...commonValidator,
  body("categoryId", "Please Enter a Valid CategoryId").not().isEmpty(),
  body("categoryServiceId", "Please Enter a Valid categoryServiceId")
    .not()
    .isEmpty(),
];

const deleteCategoryValidator = [
  body("categoryId", "Please Enter a Valid CategoryId").not().isEmpty(),
];

const categoryUserServiceValiator = [
  ...categoryValidator,
  ...deleteCategoryValidator,
];

const exclusionDataValiator = [
  body("brand_name", "Please Enter a Valid BrandName").not().isEmpty(),
  body("exclusion_inn", "Please Enter a Valid Exclusion Inn").not().isEmpty(),
  check("comment").exists(),
  body("exclusionId", "Please Enter a Valid ExclusionId").not().isEmpty(),
  body("userId", "Please Enter a Valid UserId").not().isEmpty(),
  body("status", "Please enter a valid Status").isBoolean(),
];

const deleteExclusionValidator = [
  body("exclusionId", "Please Enter a Valid ExclusionId").not().isEmpty(),
];

const updateExclusionValiator = [
  ...commonValidator,
  body("exclusionId", "Please Enter a Valid ExclusionId").not().isEmpty(),
];

const updateExclusionDataValiator = [
  ...exclusionDataValiator,
  body("exclusionDataId", "Please Enter a Valid ExclusionDataId")
    .not()
    .isEmpty(),
];

const planServiceValidator = [
  body(
    "reimbursment_rate",
    "Please Enter a Valid Reimbursment Rate"
  ).isNumeric(),
  body(
    "pre_authorization",
    "Please Enter a Valid Pre Authorization"
  ).isBoolean(),
  body("has_category", "Please Enter a Valid CategoryServiceId")
    .not()
    .isEmpty(),
  body(
    "waiting_period.duration",
    "Please Enter a Valid Waiting Period Duration"
  )
    .not()
    .isEmpty(),
  body(
    "waiting_period.redeemed",
    "Please Enter a Valid Waiting Period Redeemed"
  )
    .not()
    .isEmpty(),
  body(
    "has_conditions.repayment_condition",
    "Please Enter a Valid Repayment Condition"
  )
    .not()
    .isEmpty(),
  body(
    "has_conditions.category_condition",
    "Please Enter a Valid Category Condition"
  )
    .not()
    .isEmpty(),
  body(
    "in_limit.service_limit",
    "Please Enter a Valid Service Limit"
  ).isNumeric(),
  body(
    "in_limit.category_limit",
    "Please Enter a Valid Category Limit"
  ).isNumeric(),
  body("for_plan", "Please Enter a Valid PlanId").not().isEmpty(),
  body("for_user", "Please Enter a Valid UserId").not().isEmpty(),
];

const planValiator = [
  body("name", "Please Enter a Valid Name").not().isEmpty(),
  body("description", "Please Enter a Valid Description").not().isEmpty(),
  body("plan_type", "Please Enter a Valid Plan Type").not().isEmpty(),
  body(
    "total_care_limit.primary_care_limit",
    "Please Enter a Valid Primary Care Limit"
  ).isNumeric(),
  body(
    "total_care_limit.secondary_care_limit",
    "Please Enter a Valid Secondary Care Limit"
  ).isNumeric(),
  body(
    "total_care_limit.grand_total",
    "Please Enter a Valid Total Care Limit"
  ).isNumeric(),
  body("for_user", "Please Enter a Valid UserId").not().isEmpty(),
];

const planExclusionValidator = [
  body("in_exclusion", "Please Enter a Valid exclusionDataId").not().isEmpty(),
  body("for_plan", "Please Enter a Valid planId").not().isEmpty(),
  body("for_user", "Please Enter a Valid UserId").not().isEmpty(),
];

const updatePlanServiceValidator = [
  ...planServiceValidator.slice(0, -1),
  body("planServiceId", "Please Enter a Valid planServiceId").not().isEmpty(),
];

const getPlanValidator = [
  check("planId", "Please Enter a Valid planId").not().isEmpty(),
];

const updatePlanValidator = [...planValiator.slice(0, -1), ...getPlanValidator];

const updatePlanExclusionValidator = [
  ...planExclusionValidator.slice(0, -1),
  body("planExclusionId", "Please Enter a Valid planExclusionId")
    .not()
    .isEmpty(),
];

const listPlanValidator = [...paginationValidator, ...getPlanValidator];

module.exports = {
  categoryValidator,
  categoryServiceValiator,
  categoryUserServiceValiator,
  deleteCategoryValidator,
  updateCategoryServiceValiator,
  listCategoryValiator,
  exclusionDataValiator,
  deleteExclusionValidator,
  updateExclusionValiator,
  updateExclusionDataValiator,
  planServiceValidator,
  planValiator,
  planExclusionValidator,
  updatePlanServiceValidator,
  updatePlanValidator,
  updatePlanExclusionValidator,
  listPlanValidator,
  getPlanValidator,
};
