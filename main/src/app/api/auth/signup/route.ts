import { NextRequest, NextResponse } from "next/server";
import bcrypt from 'bcrypt'
import pool from '@/lib/db'
import { z as zod } from "zod";
import transporter from "@/lib/nodemailer";
import { 
    generateSecureCode, 
    pendingVerifications, 
    VERIFICATION_EXPIRY,
    ATTEMPT_COOLDOWN,
    type PendingVerification 
} from '@/lib/auth-utils';

// Schema validation with zod
const signupSchema = zod.object({
    name: zod.string().min(3, "Name must be at least 3 characters"),
    email: zod.string().email("Invalid email address"),
    password: zod.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Received signup request:', { ...body, password: '[REDACTED]' });

        // Validate input data
        const parsedBody = signupSchema.safeParse(body);
        if (!parsedBody.success) {
            return NextResponse.json({ error: parsedBody.error.format() }, { status: 400 });
        }

        const { name, email, password } = parsedBody.data;
        const normalizedEmail = email.toLowerCase();

        // Check if user already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        // Check if there's already a pending verification
        const existingVerification = pendingVerifications.get(normalizedEmail);
        if (existingVerification) {
            const timeSinceLastVerification = Date.now() - (existingVerification.expiresAt - VERIFICATION_EXPIRY);
            if (timeSinceLastVerification < ATTEMPT_COOLDOWN) {
                return NextResponse.json({ 
                    error: "Please wait before requesting another verification code",
                    code: "VERIFICATION_COOLDOWN"
                }, { status: 400 });
            }
        }

        // Generate verification code and hash password
        const verificationCode = generateSecureCode();
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store verification data
        pendingVerifications.set(normalizedEmail, {
            code: verificationCode,
            userData: {
                name,
                email: normalizedEmail,
                hashedPassword
            },
            expiresAt: Date.now() + VERIFICATION_EXPIRY,
            attempts: 0
        });

        // Send verification email
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: normalizedEmail,
                subject: "Your Verification Code",
                html: `
                    <h2>Complete Your Registration</h2>
                    <p>Your verification code is: <strong>${verificationCode}</strong></p>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                `
            });

            return NextResponse.json({
                message: "Verification code sent. Please check your email.",
                status: "VERIFICATION_PENDING"
            });

        } catch (emailError) {
            // If email fails, remove the pending verification
            pendingVerifications.delete(normalizedEmail);
            console.error('Failed to send verification email:', emailError);
            return NextResponse.json({ 
                error: "Failed to send verification code. Please try again.",
                code: "EMAIL_SEND_FAILED"
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json({ 
            error: "Failed to process signup request", 
            details: error.message || "Unknown error occurred",
            code: "SIGNUP_ERROR"
        }, { status: 500 });
    }
}