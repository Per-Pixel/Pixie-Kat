import { NextResponse, NextRequest } from "next/server";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { z as zod } from "zod";
import { hasTooManyAttempts, recordFailedAttempt } from "@/lib/auth-utils";

// schema validation with zod
const loginSchema = zod.object({
    email: zod.string().email("Invalid email address"),
    password: zod.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Received login request for:', body.email);

        // Validate input data
        const parsedBody = loginSchema.safeParse(body);
        if (!parsedBody.success) {
            return NextResponse.json({ error: parsedBody.error.format() }, { status: 400 });
        }

        const { email, password } = parsedBody.data;

        // Prevent brute-force attacks
        if (hasTooManyAttempts(email)) {
            return NextResponse.json(
                { error: "Too many failed attempts. Try again later." },
                { status: 429 }
            );
        }

        // check if the user exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length === 0) {
            return NextResponse.json({ error: "User does not exist" }, { status: 400 });
        }

        const user = existingUser.rows[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            recordFailedAttempt(email);
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        // Generate JWT tokens
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not defined');
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        // Generate short-lived access token
        const accessToken = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                name: user.name 
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }
        );

        // Generate long-lived refresh token
        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

        // Create response
        const response = NextResponse.json({
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

        // Set cookies in the response
        response.cookies.set("access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 // 1 hour in seconds
        });

        response.cookies.set("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
        });

        return response;
        
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
