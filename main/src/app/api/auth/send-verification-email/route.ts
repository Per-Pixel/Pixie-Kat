import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import transporter from "@/lib/nodemailer";
import { sub } from "framer-motion/client";

// generate jwt for email verification
const generateToken = (email: string) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT is missing")
    }
    return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" }); // TODO: set expiration time maybe 1 day
};

// Api route to send verification email
export async function POST( request: NextRequest) {
    try {
        const { email } = await request.json();

        // check if the user already exists
        const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userQuery.rows.length === 0) {
            return NextResponse.json({ error: "User does not exist" }, { status: 400 });
        }

        //  Generate token
        const token = generateToken (email);
        const verificationLink = `http://localhost:3000/api/auth/verify-email?token=${token}`

        // send email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify your email",
            html: `<p>Click the link below to verify your email:</p>
             <a href="${verificationLink}">${verificationLink}</a>
             <p>This link will expire in 1 hour.</p>`,
        })

        return NextResponse.json({ message: "Verification email sent successfully!" });
    } catch (error) {
        console.error("Error sending verification email:", error);
        return NextResponse.json({ error: "Error sending verification email" }, { status: 500 });
    }
}