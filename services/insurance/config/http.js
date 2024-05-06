export const RESPONSE_STATUS = {
  success: "Success",
  failed: "Failed",
};

export const STATUS_CODE = {
  //to be used when no new record is inserted but to display success message
  successCode: 200,
  //to be used when new record is inserted
  newResourceCreated: 201,
  //to be used if database query return empty record
  nocontent: 204,
  //to be used if the request is bad e.g. if we pass record id which does not exits
  badRequest: 400,
  //to be used when the user is not authorized to access the API e.g. invalid access token. "jwtTokenExpired": 401
  unAuthorizedUser: 401,
  //to be used when access token is not valid
  forbidden: 403,
  //to be used if something went wrong
  failureCode: 404,
  //to be used when error occured while accessing the API
  internalServerError: 500,
  //to be used if record already axists
  conflictCode: 409,
};
