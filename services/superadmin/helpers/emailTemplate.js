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
                <a href="${healthcare-crmFrontendUrl}/super-admin/newpassword?token=${code}&user_id=${user_id}&role="button">RESET YOUR PASSWORD</a>
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
            Data: `healthcare-crm Super-admin OTP Verification`,
        }
    },
})

export const sendAssociationDetails = (email, password, type, link) => ({
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
          <h3>${type} Association group credential for ${type}</h3>
          <br/>
          <p>Please use below credential to login</p>
          <br/>
          <p><b>Login Email:</b> ${email}</p>
          <p><b>Login Password:</b> ${password}</p>
          <p>to login <a href="${link}"> Click Here</a></p>
          <br/>
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
          <a href="${healthcare-crmFrontendUrl}/patient/signup" role="button">CLICK</a>
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


export const sendStaffDetails = (email, password,staff_name) => ({
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
          <h3> Superadmin Staff Credential</h3>
          <br/>
          <p>Hello ${staff_name},</p>

          <p>Please use below credential to login with Superadmin portal.</p>
          <br/>
          <p>Click the below button to login</p>
          <br/>
          <a href="${healthcare-crmFrontendUrl}/super-admin/login" role="button">LOGIN</a>
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
            Data: `healthcare-crm Superadmin Staff Credential.`,
        }
    },
})