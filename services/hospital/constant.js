import { config } from "./config/constants"
const { PORTS } = config;

//responseCodes
export const responseCodes = {
    successStatus: "Success",
    failedStatus: "Failed"
};

export const messages = {
    createAccount: "Your account create successfully.",
    failedAccount: "Your account create failed.",
    userExist: "User already exist.",
    userNotFound: "Please Check Your Credential.",
    dataNotFound: "No data found",
    incorrectPassword: "Incorrect Password",
    passwordNotCreated: "Password Not Created",
    loginSuccess: "Login Successfully",
    listSuccess: "Data fetch successfully",
    updateSuccess: "Data update successfully",
    statusUpdate: "Status update successfully",
    internalServerError: "Internal Server Error",
    passwordChangeSuccess: "Password Change Successfully",
    profileUpdate: "Profile Setup Successfully",
    authError: "Auth Error",
    tokenExpire: "Token Expire",
    invalidToken: "Invalid Token",
    internalError: "Internal Server Error",
    emailSend: "Email successfully send.",
    add: "Data Add successfully",
    emailNotVerified: "Email Not Verified",
    emailVerified: "Email Verified",
    emailAlreadyVerified: "Email Alredy Verified",
    emailSend: "Email Send Successfully.",
    userAlredyAdd: "User already add wait for approval.",
    userAdd: "User add success wait for approval.",
    notAuthorized: "Not authorized for this route"

};

export const messageID = {
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

}

export const emailText = {
    subjectEmail: "Email Verificaion",
    subjectEmailProfile: "Profile Setup"
}

export const htmlEmailVerify = (token, name, role) => {

    console.log(`${PORTS.APIHOST}`);
    return `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta http-equiv="X-UA-Compatible" content="IE=edge">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Dock Nock Email Template</title>
                      <style>
                          @media (max-width: 576px){
                              section{
                                  width: auto !important;
                              }
                              .box{
                                  max-width: none !important;
                                  width: 100% !important;
                              }
                              .innerBox{
                                  max-width: 255px !important;
                              }
                          }
                      </style>
                  </head>
                  <body style="background-color: #F9F9F9; width: 100% !important; margin: 0; padding: 0;">
                  <div class="box" style="max-width: 500px; margin: 0 auto; background-color: #F9F9F9;">
                  <div class="innerBox" style="max-width: 300px; width: 100%; margin: auto; background-color: #fff; border-radius: 10px; padding: 20px; position: absolute; left: 50%; transform: translateX(-50%);">
                      <h1 style="font-size: 32px; color: #272727; font-weight: 600; margin-top: 0; margin-bottom: 0;">Welcome ${name}</h1>
                      <p style="font-size: 15px; font-weight: 300; color: #656565; margin-top: 25px;">Your account is created please verify your Email using click below.</p>
                      <a href=${PORTS.APIHOST}:${PORTS.EMAIL_PORT}/email-verify/${token}?data=${role} style="background-color: #64BD05; text-align: center; display: inline-block; padding: 8px 0px; max-width: 150px; width: 100%; font-size: 14px; font-weight: 300; margin: 15px  auto 0; color: #fff; border-radius: 35px; text-decoration: none;">Verify Email</a>
                      <p style="font-size: 15px; font-weight: 300; color: #656565; text-align: left;margin-top: 25px;">Thanks, healthcare-crm.</p>
                  </div>
          </div>
                  </body>
                  </html>
  `
}

export const htmlEmailProfileSetup = (token, name, role, username) => {
    console.log(`${PORTS.APIHOST}:${PORTS.EMAIL_PORT}/create-profile/${token}?data=${role}`, "testdata");
    return `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta http-equiv="X-UA-Compatible" content="IE=edge">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Dock Nock Email Template</title>
                      <style>
                          @media (max-width: 576px){
                              section{
                                  width: auto !important;
                              }
                              .box{
                                  max-width: none !important;
                                  width: 100% !important;
                              }
                              .innerBox{
                                  max-width: 255px !important;
                              }
                          }
                      </style>
                  </head>
                  <body style="background-color: #F9F9F9; width: 100% !important; margin: 0; padding: 0;">
                  <div class="box" style="max-width: 500px; margin: 0 auto; background-color: #F9F9F9;">
                  <div class="innerBox" style="max-width: 300px; width: 100%; margin: auto; background-color: #fff; border-radius: 10px; padding: 20px; position: absolute; left: 50%; transform: translateX(-50%);">
                      <h1 style="font-size: 32px; color: #272727; font-weight: 600; margin-top: 0; margin-bottom: 0;">Welcome ${name}</h1>
                      <p style="font-size: 15px; font-weight: 300; color: #656565; margin-top: 25px;">Your account is setup.</p>
                      <p style="font-size: 15px; font-weight: 300; color: #656565; margin-top: 25px;">Your username is <strong>${username}</strong>.Please create your password click to button.</p>
                      <a href=${PORTS.APIHOST}:${PORTS.EMAIL_PORT}/create-profile/${token}?data=${role} style="background-color: #64BD05; text-align: center; display: inline-block; padding: 8px 0px; max-width: 150px; width: 100%; font-size: 14px; font-weight: 300; margin: 15px  auto 0; color: #fff; border-radius: 35px; text-decoration: none;">Setup Profile</a>
                      <p style="font-size: 15px; font-weight: 300; color: #656565; text-align: left;margin-top: 25px;">Thanks, healthcare-crm.</p>
                  </div>
                  </div>
                  </body>
                  </html>
  `
}

export const roleInInteger = (role) => {
    let roleText = '';
    if (role === 2) {
        return roleText = "patient"
    } else if (role === 1) {
        return roleText = "physician"
    }
    else if (role === 3) {
        return roleText = "staff"
    } else {
        return roleText = "admin"
    }
}

export const roleInText = (role) => {
    let roleText = '';
    if (role === "patient") {
        return roleText = 2
    } else if (role === "physician") {
        return roleText = 1
    }
    else if (role === "staff") {
        return roleText = 3
    } else {
        return roleText = 0
    }
}


export const forgetPasswordSub = {
    subjectEmail: "Forgot Your Password"
}
export const htmlForgetPassword = (token, role) => {

    console.log(`${PORTS.APIHOST}`);

    return `<!DOCTYPE html>
  <html lang="en">
  <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dock Nock Email Template</title>
        <style>
            @media (max-width: 576px){
                section{
                    width: auto !important;
                }
                .box{
                    max-width: none !important;
                    width: 100% !important;
                }
                .innerBox{
                    max-width: 255px !important;
                }
            }
        </style>
    </head>
  <body style="background-color: #F9F9F9; width: 100% !important; margin: 0; padding: 0;">
  <div class="box" style="max-width: 500px; margin: 0 auto; background-color: #F9F9F9;">
   <div class="innerBox" style="max-width: 300px; width: 100%; margin: auto; background-color: #fff; border-radius: 10px; padding: 20px; position: absolute; left: 50%; transform: translateX(-50%);">
       <h1 style="font-size: 32px; color: #272727; font-weight: 600; margin-top: 0; margin-bottom: 0;">Hello</h1>
      <p style="font-size: 15px; font-weight: 300; color: #656565; margin-top: 25px;">To reset your password, click on the below link:</p>
      <a href=${PORTS.APIHOST}:${PORTS.EMAIL_PORT}/create-password/${token} style="background-color: #64BD05; text-align: center; display: inline-block; padding: 8px 0px; max-width: 150px; width: 100%; font-size: 14px; font-weight: 300; margin: 15px  auto 0; color: #fff; border-radius: 35px; text-decoration: none;">Click To change Password</a>
      <p style="font-size: 15px; font-weight: 300; color: #656565; text-align: left;margin-top: 25px;">Thanks, healthcare-crm.</p>
   </div>
 </div>
 <script>
        function data(){
        console.log("Hello");
        window.open('${PORTS.APIHOST}:${PORTS.EMAIL_PORT}/create-password/${token}?data=${role}')
        }
        </script>  
   </body>
</html > `
}

export const notificationlist = () => {
    let data = [
        {
            image: "test",
            name: "Reported improving scores"
        },
        {
            image: "test",
            name: "Reported worsening scores"
        },
        {
            image: "test",
            name: "Completed assessment"
        },
        {
            image: "test",
            name: "Missed assessment(s)"
        },
        {
            image: "test",
            name: "New patient sign-ups"
        },
    ]

    return data;
}

export const contactUs = (html) => {

    console.log(`${PORTS.APIHOST}`);

    return `<!DOCTYPE html>
  <html lang="en">
  <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dock Nock Email Template</title>
        <style>
            @media (max-width: 576px){
                section{
                    width: auto !important;
                }
                .box{
                    max-width: none !important;
                    width: 100% !important;
                }
                .innerBox{
                    max-width: 255px !important;
                }
            }
        </style>
    </head>
    <body style="background-color: #F9F9F9; width: 100% !important; margin: 0; padding: 0;">
    <div class="box" style="max-width: 500px; margin: 0 auto; background-color: #F9F9F9;">
     <div class="innerBox" style="max-width: 300px; width: 100%; margin: auto; background-color: #fff; border-radius: 10px; padding: 20px; position: absolute; left: 50%; transform: translateX(-50%);">
         <h1 style="font-size: 32px; color: #272727; font-weight: 600; margin-top: 0; margin-bottom: 0;">Hello</h1>
        <p style="font-size: 15px; font-weight: 300; color: #656565; margin-top: 25px;"></p>
  <div>
  ${html}
  </div>
  <p style="font-size: 15px; font-weight: 300; color: #656565; text-align: left;margin-top: 25px;">Thanks, healthcare-crm.</p>
  </div>
</div>
  </body>
  </html>
`
}

export const smsTemplateOTP = (otp2fa) => {
    return `Your verification OTP is: ${otp2fa}. Please don't share with anyone else.
  Website link- https://www.healthcare-crm.com`
}

export const generate6DigitOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
}