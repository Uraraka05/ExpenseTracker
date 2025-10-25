import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // 1. Configure email transport (using Gmail)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT, // 465 uses SSL
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Your App Password
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false
    }
  });

  // 2. Define email content
  const mailOptions = {
    from: `Finance Dashboard <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: '<h1>Optional HTML content</h1>'
  };

  // 3. Send the email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;