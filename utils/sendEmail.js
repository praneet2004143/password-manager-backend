const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Password Manager Login OTP",
    text: `Hello,

Your OTP is: ${otp}

This OTP is valid for 5 minutes.

Do not share this OTP with anyone.`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendOTPEmail;