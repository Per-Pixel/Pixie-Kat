import { NextResponse, NextRequest } from "next/server";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import errorMap from "zod/locales/en.js";
import { resolve } from "path";
import { error, profile } from "console";

passport.use(
    new GoogleStrategy(
        {
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/api/auth/google/callback",
            clientID: process.env.GOOGLE_CLIENT_ID,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const { email, name } = profile._json;

                // check if user already exists
                const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

                let user;
                if (existingUser.rows.length === 0) {
                    // create new user
                    const newUser = await pool.query(
                        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
                        [name, email]
                    );
                    user = newUser.rows[0]
                } else {
                    user = existingUser.rows[0];
                }

                // Generate JWT tokens
                const jwtSecret = process.env.JWT_SECRET;
                const accessToken = jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: "1h" });
                const refreshToken = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: "7d" });

                const response = NextResponse.json({ message: "Google login successful"})

                // Set cookies
                response.cookies.set("accesss_token", accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 60 * 60, // How many days are these?
                })

                response.cookies.set("refresh_token", refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: 7 * 24 * 60 * 60 // how many days are this now?
                })

                return done(null, user)
            } catch (error) {
                console.error("Google auth error:", error)
                return done(error, null)
            }
        }
    )
);

export async function GET(request: NextRequest) {
    return new Promise((resolve, reject) => {
        passport.authenticate("google", {scope: ["profile", "email"]}, (err, user) => {
            if (err || !user) {
                resolve(
                    NextResponse.json(
                        { error: "Google login failed" },
                        { status: 400}
                    )
                );
            }
            resolve(
                NextResponse.json({ message: "Google login successful"})
            );
        });(request)
    });
}