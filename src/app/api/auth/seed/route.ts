import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

// POST /api/auth/seed - Ensure default users exist
export async function POST() {
  try {
    const defaultUsers = [
      {
        name: "Admin User",
        email: "admin@rcs.com",
        role: "admin",
        password: "admin123",
      },
      {
        name: "Store Manager",
        email: "store@rcs.com",
        role: "store",
        password: "store123",
      },
      {
        name: "Kitchen Manager",
        email: "kitchen@rcs.com",
        role: "kitchen",
        password: "kitchen123",
      },
    ];

    const results = [];

    for (const userData of defaultUsers) {
      const hashedPassword = await hash(userData.password, 10);

      const user = await db.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          role: userData.role,
          password: hashedPassword,
        },
        create: {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          password: hashedPassword,
        },
      });

      results.push({
        email: user.email,
        role: user.role,
      });
    }

    return NextResponse.json({
      message: "Auth users seeded successfully",
      users: results,
    });
  } catch (error) {
    console.error("Error seeding auth users:", error);
    return NextResponse.json(
      { error: "Failed to seed auth users" },
      { status: 500 }
    );
  }
}
