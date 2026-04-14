import nodemailer from "nodemailer";
import config from "../config";

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: Number(config.smtp_port),
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });

  return await transporter.sendMail({
    from: config.smtp_from,
    to,
    subject,
    html,
  });
};
