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
                <a href="${healthcare-crmFrontendUrl}/patient/setnewpass?token=${code}&user_id=${user_id}&role="button">RESET YOUR PASSWORD</a>
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
            Data: `healthcare-crm Patient OTP Verification`,
        }
    },
})

export const sendMailInvitations = (email, first_name, last_name, loggeInname, portalmessage, portalname) => ({
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
          <p>Please register yourself on this portal</p>
          <br/>
          <a href="${healthcare-crmFrontendUrl}/${portalname}/signup" role="button">CLICK HERE</a>
          <br/>
          <p>${portalmessage}</p>
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
// 

export const AppointmentInvitation = (appointmentUseremail,appointmentUsername,content,appointmentId,title,notificationtype,navigationlink) => ({
    Source: 'healthcarecrm <no-reply@healthcare-crm.com>',
    Destination: {
        ToAddresses: [
            appointmentUseremail
        ],
    },
    ReplyToAddresses: [appointmentUseremail],
    Message: {
        Body: {
            Html: {
                Charset: 'UTF-8',
                Data: `
          <p>Hello ${appointmentUsername},</p>
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

export const orderInvitation = (appointmentUseremail,appointmentUsername,content,appointmentId,title,portalType,notificationtype) => ({
    Source: 'healthcarecrm <no-reply@healthcare-crm.com>',
    Destination: {
        ToAddresses: [
            appointmentUseremail
        ],
    },
    ReplyToAddresses: [appointmentUseremail],
    Message: {
        Body: {
            Html: {
                Charset: 'UTF-8',
                Data: `
          <br/>
          <p>Hello ${appointmentUsername},</p>
          <br/>
          <p>${content.replace(/_/g, ' ')}</p>
          <br/>
          <a href="${healthcare-crmFrontendUrl}/portals/order-request/${portalType}/new-order-details?orderId=${appointmentId}" role="button">CLICK</a>
          <br/>
          <p>Click Above Link to see all the details of order.</p>
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