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
  check("categories.*.status").isBoolean(),
  check("categories.*.name").not().isEmpty(),
  body("userId", "Please Enter a Valid UserId").not().isEmpty(),
];

const categoryServiceValiator = [
  ...commonValidator,
  body("categoryId", "Please Enter a Valid CategoryId").not().isEmpty(),
];

const listCategoryValiator = [
  ...paginationValidator,
  // body("userId", "Please Enter a Valid UserId").not().isEmpty(),
  body("searchText", "Please Enter search text").exists(),
];

const updateCategoryServiceValiator = [
  ...commonValidator,
  body("categoryId", "Please Enter a Valid Category Id").not().isEmpty(),
  body("categoryServiceId", "Please Enter a Valid Category ServiceId")
    .not()
    .isEmpty(),
];

const deleteCategoryValidator = [
  body("categoryId", "Please Enter a Valid Category Id").not().isEmpty(),
];

const deleteCategoryServiceValidator = [
  body("serviceId", "Please Enter a Valid Category ServiceId").not().isEmpty(),
];

const categoryUserServiceValiator = [
  check("services.*.status").isBoolean(),
  check("services.*.name").not().isEmpty(),
  check("services.*.categoryId").not().isEmpty(),
  body("userId", "Please Enter a Valid UserId").not().isEmpty(),
];

const exclusionValidator = [
  check("exclusions.*.status").isBoolean(),
  check("exclusions.*.name").not().isEmpty(),
  body("userId", "Please Enter a Valid UserId").not().isEmpty(),
];

const exclusionDataValiator = [
  body("details.*.brand_name", "Please Enter a Valid BrandName")
    .not()
    .isEmpty(),
  body("details.*.exclusion_inn", "Please Enter a Valid Exclusion Inn")
    .not()
    .isEmpty(),
  check("details.*.comment").exists(),
  body("details.*.exclusionId", "Please Enter a Valid ExclusionId")
    .not()
    .isEmpty(),
  body("details.*.status", "Please enter a valid Status").isBoolean(),
  body("userId", "Please Enter a Valid UserId").not().isEmpty(),
];

const deleteExclusionValidator = [
  body("exclusionId", "Please Enter a Valid Exclusion Id").not().isEmpty(),
];

const deleteExclusionDataValidator = [
  body("exclusionDataId", "Please Enter a Valid Exclusion DataId").not().isEmpty(),
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
    "services.*.reimbursment_rate",
    "Please Enter a Valid Reimbursment Rate"
  ).isNumeric(),
  body(
    "services.*.pre_authorization",
    "Please Enter a Valid Pre Authorization"
  ).isBoolean(),
  body("services.*.has_category", "Please Enter a Valid CategoryServiceId")
    .not()
    .isEmpty(),
  body(
    "services.*.waiting_period.duration",
    "Please Enter a Valid Waiting Period Duration"
  )
    .not()
    .isEmpty(),
  body(
    "services.*.waiting_period.redeemed",
    "Please Enter a Valid Waiting Period Redeemed"
  )
    .not()
    .isEmpty(),
  body(
    "services.*.has_conditions.repayment_condition",
    "Please Enter a Valid Repayment Condition"
  )
    .not()
    .isEmpty(),
  body(
    "services.*.has_conditions.category_condition",
    "Please Enter a Valid Category Condition"
  )
    .not()
    .isEmpty(),
  body(
    "services.*.in_limit.service_limit",
    "Please Enter a Valid Service Limit"
  ).isNumeric(),
  body(
    "services.*.in_limit.category_limit",
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
  body("exclusions.*.in_exclusion", "Please Enter a Valid exclusionDataId")
    .not()
    .isEmpty(),
  body("for_plan", "Please Enter a Valid planId").not().isEmpty(),
  body("for_user", "Please Enter a Valid UserId").not().isEmpty(),
];

const updatePlanServiceValidator = [
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
  body("planServiceId", "Please Enter a Valid planServiceId").not().isEmpty(),
];

const getPlanValidator = [
  check("planId", "Please Enter a Valid planId").not().isEmpty(),
];

const updatePlanValidator = [
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
  ...getPlanValidator,
];

const updatePlanExclusionValidator = [
  body("in_exclusion", "Please Enter a Valid exclusionDataId").not().isEmpty(),
  body("for_plan", "Please Enter a Valid planId").not().isEmpty(),
  body("planExclusionId", "Please Enter a Valid planExclusionId")
    .not()
    .isEmpty(),
];

const listPlanValidator = [...paginationValidator, ...getPlanValidator];

//.....................Insurance user validator......................................................

const adminSignupValidator = [
  body("fullName", "Please Enter a Valid full Name").not().isEmpty(),
  body("insuranceName", "Please Enter a Valid insurance Name").not().isEmpty(),
  body("email", "Please enter a valid email").isEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("must be at least 6 chars long")
    .matches(/\d/)
    .withMessage("must contain a number"),
];

const adminLoginValidator = [
  body("email", "Please enter a valid email").isEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("must be at least 6 chars long")
    .matches(/\d/)
    .withMessage("must contain a number"),
];

const companyProfileValidator = [
  // body("address", "Please Enter a Valid Address").not().isEmpty(),
  // body("zip", "Please Enter a Valid Zip").not().isEmpty(),
  // body("companyName", "Please enter a Company Name").isEmail(),
  // body("companySlogan", "Please enter a Company Slogan").isEmail(),
  // body("companySlogan", "Please enter a Company Slogan").isEmail(),
];

const loginValidator = [body("email", "Please enter a valid email").isEmail()];

module.exports = {
  categoryValidator,
  categoryServiceValiator,
  categoryUserServiceValiator,
  deleteCategoryValidator,
  deleteExclusionDataValidator,
  deleteCategoryServiceValidator,
  updateCategoryServiceValiator,
  listCategoryValiator,
  exclusionValidator,
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

  //Insurance user validator
  adminSignupValidator,
  adminLoginValidator,
  companyProfileValidator,
  loginValidator,
};
