import { NextRequest, NextResponse } from "next/server";
import { z as zod } from "zod";
import pool from "@/lib/db";
import { 
    pendingVerifications,
    getVerification,
    hasTooManyAttempts,
    recordFailedAttempt,
    MAX_VERIFICATION_ATTEMPTS
} from '@/lib/auth-utils';

const verifyCodeSchema = zod.object({
    email: zod.string().email(),
    code: zod.string().length(8) // Updated to match new 8-char hex code
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Validate input
        const parsedBody = verifyCodeSchema.safeParse(body);
        if (!parsedBody.success) {
            return NextResponse.json({ error: parsedBody.error.format() }, { status: 400 });
        }

        const { email, code } = parsedBody.data;
        const normalizedEmail = email.toLowerCase();

        // Check for too many failed attempts
        if (hasTooManyAttempts(normalizedEmail)) {
            return NextResponse.json({ 
                error: `Too many failed attempts. Please wait or request a new code. Maximum attempts: ${MAX_VERIFICATION_ATTEMPTS}`,
                code: "TOO_MANY_ATTEMPTS"
            }, { status: 429 });
        }

        // Check if there's a pending verification (includes expiry check)
        const verification = getVerification(normalizedEmail);
        if (!verification) {
            return NextResponse.json({ 
                error: "No verification pending or code expired. Please request a new code.",
                code: "NO_VERIFICATION_PENDING"
            }, { status: 400 });
        }

        // Verify the code
        if (verification.code !== code) {
            recordFailedAttempt(normalizedEmail);
            return NextResponse.json({ 
                error: "Invalid verification code",
                code: "INVALID_CODE"
            }, { status: 400 });
        }

        // Get the client for transaction
        const client = await pool.connect();

        try {
            // Begin transaction
            await client.query('BEGIN');

            // Create the user with normalized email
            const { name, hashedPassword } = verification.userData;
            const newUser = await client.query(
                'INSERT INTO users (name, email, password, email_verified) VALUES ($1, $2, $3, true) RETURNING id, name, email',
                [name, normalizedEmail, hashedPassword]
            );

            // Commit transaction
            await client.query('COMMIT');

            // Remove the verification
            pendingVerifications.delete(normalizedEmail);

            return NextResponse.json({
                message: "Email verified and account created successfully",
                user: {
                    id: newUser.rows[0].id,
                    name: newUser.rows[0].name,
                    email: newUser.rows[0].email
                }
            }, { status: 201 });

        } catch (error) {
            // Rollback transaction on error
            await client.query('ROLLBACK');
            throw error;
        } finally {
            // Release the client
            client.release();
        }

    } catch (error: any) {
        console.error('Verification error:', error);
        return NextResponse.json({ 
            error: "Failed to verify code", 
            details: error.message || "Unknown error occurred",
            code: "VERIFICATION_ERROR"
        }, { status: 500 });
    }
}
