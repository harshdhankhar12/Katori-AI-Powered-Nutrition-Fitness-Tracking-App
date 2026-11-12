import { Request, Response } from "express";
import { prisma } from '../server';
import bcrypt from 'bcrypt';
import { generateOTP } from "../utils/otp";
import redis from "../utils/redis";
import { sendMail } from "../utils/mail";

export const sendOTPForEmailVerification = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || email.trim() === "") {
            return res.status(400).json({ error: "Email is required.", success: false });
        }
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        });
        if (existingUser?.email_verified) {
            return res.status(400).json({ error: "Email is already verified.", success: false });
        }
        const otp = generateOTP(6);
        await redis.set(`email_verification_otp:${email}`, otp, 'EX', 300);
        await redis.incr(`email_verification_attempts:${email}`);
        await redis.expire(`email_verification_attempts:${email}`, 300);
        const attempts = await redis.get(`email_verification_attempts:${email}`);
        const totalSecondsLeft = await redis.ttl(`email_verification_attempts:${email}`);
        if (attempts && parseInt(attempts) > 5) {
            return res.status(429).json({
                error: `Too many OTP requests. Please try again later after ${Math.ceil((300 - totalSecondsLeft) / 60000)} minutes.`,
                success: false
            });
        }

        const mailOptions = {
            to: email,
            subject: "Your OTP for Email Verification - Katori",
            htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Katori Verification</title>
    <style>
        body { margin: 0; padding: 0; background-color: #FAF9F6; font-family: 'Inter', sans-serif; color: #264653; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #FAF9F6; padding: 40px 0; }
        .main { width: 100%; max-width: 500px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; border: 1px solid #E5E7EB; }
        .content { padding: 40px; text-align: center; }
        .logo { color: #F4A261; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-decoration: none; }
        .otp { font-size: 36px; font-weight: 800; color: #1D3557; letter-spacing: 8px; margin: 30px 0; padding: 20px; background-color: #FAF9F6; border-radius: 8px; display: inline-block; width: 80%; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main" align="center">
            <tr>
                <td class="content">
                    <div class="logo">KATORI</div>
                    <p style="font-size: 16px; margin-top: 20px;">Use this code to verify your account</p>
                    
                    <div class="otp">${otp}</div>
                    
                    <p style="font-size: 14px; color: #6B7280;">Valid for 5 minutes. Do not share this code.</p>
                </td>
            </tr>
            <tr>
                <td class="footer">
                    &copy; ${new Date().getFullYear()} Katori. <br>
                    Snap your meal. Know your next.
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`
        };

        await sendMail(mailOptions);
        res.status(200).json({ message: "OTP sent successfully.", success: true });

    } catch (error) {
        console.error("Error sending OTP for email verification:", error);
        res.status(500).json({ error: "Failed to send OTP for email verification.", success: false });
    }
}

export const verifyEmailOTP = async (req: Request, res: Response) => {
    try {
        await redis.incr(`email_verification_attempts:${req.body.email}`);
        const attempts = await redis.get(`email_verification_attempts:${req.body.email}`);
        if (attempts && parseInt(attempts) > 10) {
            return res.status(429).json({
                error: `Too many OTP verification attempts. Please try again later after ${Math.ceil((300 - (Date.now() - (await redis.ttl(`email_verification_attempts:${req.body.email}`)) * 1000)) / 60000)} minutes.`,
                success: false
            });
        }
        const { email, otp } = req.body;
        if (!email || email.trim() === "" || !otp || otp.trim() === "") {
            return res.status(400).json({ error: "Email and OTP are required.", success: false });
        }
        const storedOTP = await redis.get(`email_verification_otp:${email}`);
        if (!storedOTP) {
            return res.status(400).json({ error: "OTP has expired or is invalid.", success: false });
        }
        if (storedOTP !== otp) {
            return res.status(400).json({ error: "Invalid OTP.", success: false });
        }
        await prisma.user.update({
            where: { email },
            data: { email_verified: true, account_status: "ACTIVE" }
        });
        await redis.del(`email_verification_otp:${email}`);
        await redis.del(`email_verification_attempts:${email}`);
        res.status(200).json({ message: "Email verified successfully.", success: true });
    } catch (error) {
        console.error("Error verifying email OTP:", error);
        res.status(500).json({ error: "Failed to verify email OTP.", success: false });
    }
}