import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if(!token || !process.env.JWT_SECRET) {
            return NextResponse.json({ error: "Invalid token" }, { status: 400 });
        }

        // verify jwt token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as { email: string };

        // update user in db to verified
        await pool.query('UPDATE users SET verified = true WHERE email = $1', [decodedToken.email]);

        return NextResponse.json({ message: "Email verified successfully" });
    } catch (error) {
        console.error("Error verifying email:", error);
        return NextResponse.json({ error: "Error verifying email" }, { status: 500 });
    }
}