import "dotenv/config.js";

const healthcare-crmFrontendUrl = process.env.healthcare-crm_FRONTEND_URL || "http://localhost:4200";

console.log("healthcare-crmFrontendUrlhealthcare-crmFrontendUrl",healthcare-crmFrontendUrl);
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

export const forgotPasswordEmailForIndividualDoctor = (email, code, user_id, type) => {
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
                <h3>Password Reset for ${type} portal.</h3>
                <br/>
               
                <a href="${healthcare-crmFrontendUrl}/portals/newpassword/${type}?token=${code}&user_id=${user_id}&type=${type}&role="button">RESET YOUR PASSWORD</a>
                <br/>
                <p>Click the below button to reset your password</p>
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
            Data: `healthcare-crm Hospital OTP Verification`,
        }
    },
})

export const sendHospitalDoctorCred = (email, password,type) => ({
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
          <h3>Credential For Login</h3>
          <br/>
          <p>Please use the credential to sign in.</p>
          <br/>
                <a href="${healthcare-crmFrontendUrl}/individual-doctor/login" role="button">Login</a>
          <p>email- ${email}</p>
          <p>password- ${password}</p>
          <br/>
          <p>If you didn’t request this, you can ignore this email.</p>
          <br/>
          <p>Thanks,</p>
          <p>healthcare-crm</p>`
            },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: `healthcare-crm Hospital ${type} Credential`,
        }
    },
})

export const sendMailInvitations = (email, first_name, last_name, loggeInname) => ({
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
          <p>which is very helpful with us to use health plan for make order,schedule consultation,make claim.</p>
          <br/>
          <p>Thanks</p>
          <p>${loggeInname}</p>`
            },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: `Mail Invitation from healthcare-crm `,
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
            Data: `healthcare-crm ${type} Staff Credential.`,
        }
    },
})

export const sendEprescriptionEmail = (patient_email, portal_email, appointmentId,patient_name,portal_name,portal_type) => ({
    Source: portal_email,
    Destination: {
        ToAddresses: [
            patient_email
        ],
    },
    ReplyToAddresses: [portal_email],
    Message: {
        Body: {
            Html: {
                Charset: 'UTF-8',
                Data: `
                <p>Hello ${patient_name},</p>
                <br/>
                <p>Please find below attachment of your EPrescription by Dr. ${portal_name}.</p>
                <br/>
                <a href="${healthcare-crmFrontendUrl}/portals/eprescription-viewpdf?id=${appointmentId}&portal_type=${portal_type}">Link to Download PDF</a>           
                <br/>
                <br/>
                <p>Thanks & Regards</p>
                <p>Dr. ${portal_name}</p>`
            }
        },

        Subject: {
            Charset: 'UTF-8',
            Data: `EPrescription Document.`,
        }
    },
})

export const sendAppointmentInvitation = (appointmentUseremail,appointmentUsername,content,appointmentId,title,portalType) => ({
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
          <a href="${healthcare-crmFrontendUrl}/portals/appointment/${portalType}/appointment-details/${appointmentId}" role="button">CLICK</a>
          <br/>
          <p>Click Above Link to see all the details of appointment.</p>
          <br/>
          <p>Thanks</p>`
        },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: `${title.replace(/_/g, ' ')} from healthcare-crm `,
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