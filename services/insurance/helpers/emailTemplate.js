import "dotenv/config.js";
import Notification from "../models/Chat/Notification"
import PortalUser from "../models/insurance/user/portal_user";
const healthcare-crmFrontendUrl = process.env.healthcare-crm_FRONTEND_URL || "http://localhost:4200";

export const resetPasswordEmail = (email, code) => {
    return {
        Source: 'healthcarecrm <no-reply@healthcare-crm.com>',
        Destination: {
            ToAddresses: [
                email
            ],
        },
        ReplyToAddresses: ['no-reply@healthcare-crm.com'],
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `
                <h3>Password Reset</h3>
                <br/>
                <p>Click the below button to reset your password</p>
                <br/>
                <a href="${healthcare-crmFrontendUrl}/pharmacy/newpassword?token=${code}" role="button">RESET YOUR PASSWORD</a>
                <br/>
                <p>If you didn’t request this, you can ignore this email.</p>
                <br/>
                <p>Thanks,</p>
                <p>healthcare-crm</p>`,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: `healthcare-crm Forgot Password Link`,
            }
        },
    };
}

export const forgotPasswordEmail = (email, code, user_id) => {
    return {
        Source: 'healthcarecrm <no-reply@healthcare-crm.com>',
        Destination: {
            ToAddresses: [
                email
            ],
        },
        ReplyToAddresses: ['no-reply@healthcare-crm.com'],
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `
                <h3>Password Reset</h3>
                <br/>
                <p>Click the below button to reset your password</p>
                <br/>
                <a href="${healthcare-crmFrontendUrl}/insurance/newpassword?token=${code}&user_id=${user_id}&role="button">RESET YOUR PASSWORD</a>
                <br/>
                <p>If you didn’t request this, you can ignore this email.</p>
                <br/>
                <p>Thanks,</p>
                <p>healthcare-crm</p>`,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: `healthcare-crm Forgot Password Link`,
            }
        },
    };
}

export const verifyEmail2fa = (email, code) => ({
    Source: 'healthcarecrm <no-reply@healthcare-crm.com>',
    Destination: {
        ToAddresses: [
            email
        ],
    },
    ReplyToAddresses: ['no-reply@healthcare-crm.com'],
    Message: {
        Body: {
            Html: {
                Charset: 'UTF-8',
                Data: `
          <h3>Verification Code</h3>
          <br/>
          <p>Please use the verification code below to sign in.</p>
          <br/>
          <p>${code}</p>
          <br/>
          <p>If you didn’t request this, you can ignore this email.</p>
          <br/>
          <p>Thanks,</p>
          <p>healthcare-crm</p>`
            },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: `healthcare-crm Insurance OTP Verification`,
        }
    },
})

export const notification = (async (param) => {
    try {
        // console.log(param, "check param");
        // const notificationValue = new Notification(param)
        // console.log(notificationValue, "checknotification");
        // const notificationData = await notificationValue.save()

        const userData = await PortalUser.findOne({ _id: param.for_portal_user });
        let notificationData;
        if (userData?.notification) {
          const notificationValue = new Notification(req.body);
          notificationData = await notificationValue.save();
        }
        const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", {socketuserid:req.body.for_portal_user }, {}, "gatewayServiceUrl");

        if (notificationData) {
            // console.log("check if");
            return {
                status: true,
                message: "success"
            }
        } else {
            console.log("check else");
            return {
                status: false,
                message: "failed"
            }
        }
    } catch (error) {
        console.log(error, "check eroror");
        return {
            status: false,
            message: error
        }
    }
}
) 

export const sendStaffDetails = (email, password, type) => ({
    Source: 'healthcarecrm <no-reply@healthcare-crm.com>',
    Destination: {
        ToAddresses: [
            email
        ],
    },
    ReplyToAddresses: ['no-reply@healthcare-crm.com'],
    Message: {
        Body: {
            Html: {
                Charset: 'UTF-8',
                Data: `
          <h3>${type} Staff Credential</h3>
          <br/>
          <p>Please use below credential to login with ${type} portal.</p>
          <br/>
          <p><b>Login Email:</b> ${email}</p>
          <p><b>Login Password:</b> ${password}</p>
          <br/>
          <br/>
          <p>Thanks,</p>
          <p>healthcare-crm</p>`
            },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: `healthcare-crm Insurance Staff Credential.`,
        }
    },
})

export const SubscriptionMail = (email,full_name,message,planprice)=>({
    Source: 'healthcarecrm <no-reply@healthcare-crm.com>',
    Destination: {
        ToAddresses: [
            email
        ],
    },
    ReplyToAddresses: [email],
    Message: {
        Body: {
            Html: {
                Charset: 'UTF-8',
                Data: `
          <h3>${message}</h3>
          <br/>
          <p>Hello ${full_name},</p>
          <br/>
          <p>Your Plan has been purchased successfully.</p>
          <p>Amount:- CFA ${planprice}</p>
          <br/>
          <br/>
          <br/>
          <p>Thanks</p>
          <p>healthcare-crm</p>`
        },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: `healthcare-crm `,
        }
    },
})