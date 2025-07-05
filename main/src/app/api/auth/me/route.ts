import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get the access token from cookies
    const accessToken = request.cookies.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    try {
      // Verify and decode the token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET as string) as {
        id: string;
        email: string;
        name: string;
      };
      
      // Optional: Check user in database for more security
      const userQuery = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.id]);
      
      if (userQuery.rows.length === 0) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
      
      const user = userQuery.rows[0];
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
      
    } catch (jwtError) {
      // If token is invalid or expired
      console.error('JWT verification error:', jwtError);
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
