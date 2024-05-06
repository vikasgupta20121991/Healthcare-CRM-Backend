import "dotenv/config.js";

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
                <a href="${healthcare-crmFrontendUrl}/pharmacy/newpassword?token=${code}&role="button">RESET YOUR PASSWORD</a>
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
            Data: `healthcare-crm Pharmacy OTP Verification`,
        }
    },
})

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
            Data: `healthcare-crm Pharmacy Staff Credential.`,
        }
    },
})

export const sendMailInvitations = (email,first_name,last_name,loggeInname) => ({
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
          <h3>Mail Invitation</h3>
          <br/>
          <p>Hello ${first_name} ${last_name},</p>
          <br/>
          <p>Please register yourself on this</p>
          <br/>
          <a href="${healthcare-crmFrontendUrl}/pharmacy/signup" role="button">CLICK</a>
          <br/>
          <p>which is very helpful with us to use health plan for make order,schedule consultation,make claim</p>
          <br/>
          <p>Thanks,</p>
          <p>${loggeInname}</p>`
            },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: `Mail Invitation from healthcare-crm `,
        }
    },
})

export const emailNotification = (useremail,username,content,notificationtype,navigationlink) => ({
    Source: 'healthcarecrm <no-reply@healthcare-crm.com>',
    Destination: {
        ToAddresses: [
            useremail
        ],
    },
    ReplyToAddresses: [useremail],
    Message: {
        Body: {
            Html: {
                Charset: 'UTF-8',
                Data: `
          <p>Hello ${username},</p>
          <br/>
          <p>${content.replace(/_/g, ' ')}</p>
          <br/>
          <a href="${healthcare-crmFrontendUrl}/${navigationlink}" role="button">CLICK</a>
          <br/>
          <p> Click Above Link to see all the details .</p>
          <p> Ps: Login First and See all the details.</p>
          <br/>
          <p>Thanks</p>`
        },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: `${notificationtype.replace(/_/g, ' ')} from healthcare-crm `,
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