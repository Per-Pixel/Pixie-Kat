import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const response = NextResponse.json({ message: "Logout successful" }, { status: 200 });

        //  Clear authentication cookies
        response.cookies.set("accessToken", "", { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production",
            path: "/", 
            sameSite: "lax", 
            maxAge: 0, // expire the cookie immediately
        }); 

        response.cookies.set("refreshToken", "", {
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production" ,
            path: "/", 
            sameSite: "lax", 
            maxAge: 0, // expire the cookie immediately
        });

        return response;
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json({ error: "Logout error" }, { status: 500 });
    }
}