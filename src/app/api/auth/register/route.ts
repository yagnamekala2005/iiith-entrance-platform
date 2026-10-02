import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedPassword = String(password ?? "");
    const requestedRole = String(role ?? "student").toLowerCase();

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (normalizedPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const secretKey =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          error:
            "Server authentication is not configured. Add the Supabase secret key to the server environment.",
        },
        { status: 500 },
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      email_confirm: true,
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("already registered") ||
        errorMessage.includes("already exists") ||
        errorMessage.includes("user already")
      ) {
        return NextResponse.json(
          {
            error:
              "This email is already registered. Please sign in with that account.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "The account could not be created. Please try again." },
        { status: 500 },
      );
    }

    if (requestedRole === "admin") {
      const { error: adminInsertError } = await supabaseAdmin
        .from("admin_users")
        .upsert({ user_id: data.user.id });

      if (adminInsertError) {
        console.error("Failed to enroll user as admin:", adminInsertError);
        return NextResponse.json(
          {
            error:
              "Account was created, but failed to grant administrator privileges. Please contact support.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, role: requestedRole }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create the account. Please try again." },
      { status: 500 },
    );
  }
}
