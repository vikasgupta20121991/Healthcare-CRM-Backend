const nodemailer = require("nodemailer");
const smtpTransport = require('nodemailer-smtp-transport')
const { config } = require("../config/constants");
const { EMAIL } = config;

export const sendSmtpEmail = async (email, subject, html) => {

    let transport = nodemailer.createTransport(smtpTransport({
        service: 'gmail',
        host: EMAIL.HOST,
        auth: {
            user: EMAIL.USER,
            pass: EMAIL.PASSWORD
        }
    }));

    const mailOptions = {
        from: EMAIL.USER,
        to: email,
        subject,
        html
    }

    transport.sendMail(mailOptions, function (error, response) {
        if (error) {
            return false;
        } else {
            return true;
        }
    })

}