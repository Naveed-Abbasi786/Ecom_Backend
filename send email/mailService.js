const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent, textContent) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
        secure: true, 
    });

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
        text: textContent,  
        html: htmlContent, 
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error.message);
        throw new Error('Email sending failed');
    }
};

module.exports = sendEmail;
