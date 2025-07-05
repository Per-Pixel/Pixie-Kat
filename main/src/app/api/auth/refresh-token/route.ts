import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

// refresh token handler
export async function POST(request: NextRequest) {
    try {
        const refreshToken = request.cookies.get("refresh_token")?.value;

        if (!refreshToken) {
            return NextResponse.json({ error: "Refresh token not found" }, { status: 401 });
        }

        // verify refresh token
        if (!process.env.JWT_SECRET) {
            console.error("JWT is missing");
            return NextResponse.json({ error: "JWT is missing" }, { status: 500 });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET) as { id: string }
        } catch (error) {
            return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
        }

        // check if user already exists
        const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        if (userQuery.rows.length === 0) {
            return NextResponse.json({ error: "User does not exist" }, { status: 400 });
        }
        
        const user = userQuery.rows[0];

        // Generate new access token
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET as string,
            { expiresIn: "1h"}
        );

        // Generate a new refresh token
        const newRefreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        //  create response and set new cookies
        const response = NextResponse.json({ 
            message: "Token refreshed", 
            access_token: accessToken 
        });

        response.cookies.set("access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: '/',
            maxAge: 60 * 60 // 1 hour 
        });

        response.cookies.set("refresh_token", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: '/',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return response;
    } catch (error) {
        console.error("Error refreshing token:", error);
        return NextResponse.json({ error: "Error refreshing token" }, { status: 500 });
    }
}