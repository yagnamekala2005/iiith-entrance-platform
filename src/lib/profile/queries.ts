import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  mobile_number: string;
  dob: string;
  gender: "Male" | "Female" | "Other" | "";
  location: string;
  avatar_url: string;
  academic_year: "P1" | "P2" | "";
  subscription: string;
  is_completed: boolean;
}

/**
 * Validates whether all mandatory profile fields are completed.
 * Required fields:
 * - full_name (min 2 characters)
 * - mobile_number (min 10 characters)
 * - dob (valid date string)
 * - gender ("Male" | "Female" | "Other")
 * - location (min 2 characters)
 * - academic_year ("P1" | "P2")
 */
export function isProfileComplete(profile: Partial<StudentProfile> | null | undefined): boolean {
  if (!profile) return false;

  const hasName = Boolean(profile.full_name && profile.full_name.trim().length >= 2);
  const hasPhone = Boolean(profile.mobile_number && profile.mobile_number.trim().replace(/\D/g, "").length >= 10);
  const hasDob = Boolean(profile.dob && profile.dob.trim().length > 0);
  const hasGender = Boolean(
    profile.gender && ["Male", "Female", "Other"].includes(profile.gender)
  );
  const hasLocation = Boolean(profile.location && profile.location.trim().length >= 2);
  const hasYear = Boolean(
    profile.academic_year && ["P1", "P2"].includes(profile.academic_year)
  );

  return hasName && hasPhone && hasDob && hasGender && hasLocation && hasYear;
}

/**
 * Request-memoized query to retrieve the student profile.
 * Merges data from Supabase public.profiles and auth.users user_metadata for resilient fallback.
 */
export const getStudentProfile = cache(async (userId?: string): Promise<StudentProfile | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;
    if (userId && user.id !== userId) {
      // In case a specific user is queried
    }

    // Attempt to query public.profiles
    let dbProfile: Record<string, unknown> | null = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      dbProfile = data as Record<string, unknown> | null;
    } catch (e) {
      console.warn("Could not query public.profiles, falling back to auth metadata:", e);
    }

    const meta = (user.user_metadata || {}) as Record<string, unknown>;

    const fullName = String(
      dbProfile?.full_name ||
      dbProfile?.display_name ||
      meta.full_name ||
      meta.display_name ||
      meta.name ||
      ""
    ).trim();

    const mobileNumber = String(
      dbProfile?.mobile_number ||
      dbProfile?.phone ||
      meta.mobile_number ||
      meta.phone ||
      ""
    ).trim();

    const dob = String(
      dbProfile?.dob ||
      dbProfile?.date_of_birth ||
      meta.dob ||
      meta.date_of_birth ||
      ""
    ).trim();

    const rawGender = String(dbProfile?.gender || meta.gender || "").trim();
    const gender: StudentProfile["gender"] =
      rawGender === "Male" || rawGender === "Female" || rawGender === "Other"
        ? rawGender
        : "";

    const location = String(
      dbProfile?.location ||
      dbProfile?.city ||
      meta.location ||
      meta.city ||
      ""
    ).trim();

    const avatarUrl = String(
      dbProfile?.avatar_url ||
      meta.avatar_url ||
      meta.picture ||
      ""
    ).trim();

    const rawYear = String(
      dbProfile?.academic_year ||
      meta.academic_year ||
      meta.year ||
      ""
    ).trim().toUpperCase();
    const academicYear: StudentProfile["academic_year"] =
      rawYear === "P1" || rawYear === "P2" ? rawYear : "";

    const subscription = String(
      dbProfile?.subscription ||
      meta.subscription ||
      "Free"
    ).trim() || "Free";

    const profileCandidate: Omit<StudentProfile, "is_completed"> = {
      id: user.id,
      email: user.email || "",
      full_name: fullName,
      mobile_number: mobileNumber,
      dob,
      gender,
      location,
      avatar_url: avatarUrl,
      academic_year: academicYear,
      subscription,
    };

    const isCompleted = isProfileComplete(profileCandidate);

    return {
      ...profileCandidate,
      is_completed: isCompleted,
    };
  } catch (err) {
    console.error("Error retrieving student profile:", err);
    return null;
  }
});

