import formData from 'form-data';
import Mailgun from 'mailgun.js';

const sendOtpEmail = async ({ email, otp }) => {
  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
    // Optional: Use if your Mailgun domain is in the EU region
    // url: process.env.MAILGUN_HOST || 'https://api.mailgun.net',
  });

  const messageData = {
    from: `MyFinance App <no-reply@${process.env.MAILGUN_DOMAIN}>`,
    to: email,
    subject: 'Your Password Reset OTP',
    text: `Your One-Time Password (OTP) for resetting your password is: ${otp}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.`,
    // html: `<h1>Your OTP is: ${otp}</h1>` // Optional HTML version
  };

  try {
    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
    console.log('OTP Email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending OTP email via Mailgun:', error);
    throw new Error('Could not send OTP email.'); // Re-throw for controller handling
  }
};

export default sendOtpEmail;