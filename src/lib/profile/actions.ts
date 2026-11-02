"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProfileComplete, StudentProfile } from "./queries";

export interface ProfileActionResult {
  success: boolean;
  data?: StudentProfile;
  error?: string;
}

export interface ProfileInput {
  full_name: string;
  mobile_number: string;
  dob: string;
  gender: "Male" | "Female" | "Other" | string;
  location: string;
  avatar_url?: string;
  academic_year: "P1" | "P2" | string;
  subscription?: string;
}

export async function updateStudentProfile(input: ProfileInput): Promise<ProfileActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "You must be logged in to update your profile." };
    }

    const fullName = (input.full_name || "").trim();
    const mobileDigits = (input.mobile_number || "").trim().replace(/\D/g, "");
    const dob = (input.dob || "").trim();
    const gender = (input.gender || "").trim();
    const location = (input.location || "").trim();
    const academicYear = (input.academic_year || "").trim().toUpperCase();
    const avatarUrl = (input.avatar_url || "").trim();
    const subscription = "Free";

    // Validations
    if (!fullName || fullName.length < 2) {
      return { success: false, error: "Please enter your full name (at least 2 characters)." };
    }

    if (!mobileDigits || mobileDigits.length < 10) {
      return { success: false, error: "Please enter a valid 10-digit mobile number." };
    }

    if (!dob) {
      return { success: false, error: "Please provide your date of birth." };
    }

    if (!["Male", "Female", "Other"].includes(gender)) {
      return { success: false, error: "Please select a valid gender option." };
    }

    if (!location || location.length < 2) {
      return { success: false, error: "Please enter your location/city." };
    }

    if (!["P1", "P2"].includes(academicYear)) {
      return { success: false, error: "Please select your academic year (P1 or P2)." };
    }

    const profileData: Partial<StudentProfile> = {
      id: user.id,
      email: user.email || "",
      full_name: fullName,
      mobile_number: mobileDigits,
      dob,
      gender: gender as StudentProfile["gender"],
      location,
      avatar_url: avatarUrl,
      academic_year: academicYear as StudentProfile["academic_year"],
      subscription,
    };

    const isCompleted = isProfileComplete(profileData);

    // 1. Update Supabase Auth user metadata (survives without SQL migrations)
    const { error: updateAuthErr } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        display_name: fullName,
        mobile_number: mobileDigits,
        phone: mobileDigits,
        dob,
        gender,
        location,
        avatar_url: avatarUrl,
        academic_year: academicYear,
        year: academicYear,
        subscription,
        is_profile_completed: isCompleted,
      },
    });

    if (updateAuthErr) {
      console.warn("Auth user metadata update warning:", updateAuthErr);
    }

    // 2. Update public.profiles in database
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      adminClient = null;
    }
    const clientToUse = adminClient || supabase;

    // Attempt upsert with all extended profile columns
    try {
      const { error: dbErr } = await clientToUse.from("profiles").upsert(
        {
          id: user.id,
          display_name: fullName,
          full_name: fullName,
          mobile_number: mobileDigits,
          dob,
          gender,
          location,
          avatar_url: avatarUrl,
          academic_year: academicYear,
          subscription,
          is_completed: isCompleted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (dbErr) {
        // Fallback: If some columns don't exist yet on the table, update the standard columns
        console.warn("Extended columns upsert failed on profiles, falling back to core columns:", dbErr.message);
        await clientToUse.from("profiles").upsert(
          {
            id: user.id,
            display_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    } catch (dbException) {
      console.warn("Database profiles upsert exception:", dbException);
    }

    // Revalidate relevant pages so cached profile data refreshes immediately
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    revalidatePath("/(student)", "layout");

    const completeProfile: StudentProfile = {
      id: user.id,
      email: user.email || "",
      full_name: fullName,
      mobile_number: mobileDigits,
      dob,
      gender: gender as StudentProfile["gender"],
      location,
      avatar_url: avatarUrl,
      academic_year: academicYear as StudentProfile["academic_year"],
      subscription,
      is_completed: isCompleted,
    };

    return {
      success: true,
      data: completeProfile,
    };
  } catch (error: unknown) {
    const errText = error instanceof Error ? error.message : "Failed to update profile";
    console.error("updateStudentProfile exception:", error);
    return { success: false, error: errText };
  }
}

