"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentProfile } from "@/lib/profile/queries";
import { updateStudentProfile } from "@/lib/profile/actions";

interface ProfileFormProps {
  initialProfile: StudentProfile;
}

const PRESET_AVATARS = [
  { id: "avatar-1", emoji: "👨‍🎓", label: "Scholar Male", bg: "bg-blue-100 border-blue-300" },
  { id: "avatar-2", emoji: "👩‍🎓", label: "Scholar Female", bg: "bg-purple-100 border-purple-300" },
  { id: "avatar-3", emoji: "🧑‍💻", label: "Tech Student", bg: "bg-emerald-100 border-emerald-300" },
  { id: "avatar-4", emoji: "👩‍💻", label: "Coder Female", bg: "bg-pink-100 border-pink-300" },
  { id: "avatar-5", emoji: "🧑‍🔬", label: "Scientist", bg: "bg-amber-100 border-amber-300" },
  { id: "avatar-6", emoji: "👩‍🔬", label: "Researcher", bg: "bg-cyan-100 border-cyan-300" },
  { id: "avatar-7", emoji: "🎯", label: "Target UGEE", bg: "bg-indigo-100 border-indigo-300" },
  { id: "avatar-8", emoji: "🚀", label: "SPEC Aspirant", bg: "bg-rose-100 border-rose-300" },
];

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const notice = searchParams.get("notice");

  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [mobileNumber, setMobileNumber] = useState(initialProfile.mobile_number || "");
  const [dob, setDob] = useState(initialProfile.dob || "");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">(initialProfile.gender || "");
  const [location, setLocation] = useState(initialProfile.location || "");
  const [academicYear, setAcademicYear] = useState<"P1" | "P2" | "">(initialProfile.academic_year || "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url || "👨‍🎓");
  const [customAvatarInput, setCustomAvatarInput] = useState(
    initialProfile.avatar_url && initialProfile.avatar_url.startsWith("http") ? initialProfile.avatar_url : ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCompletedNow, setIsCompletedNow] = useState(initialProfile.is_completed);

  const handleAvatarSelect = (emojiOrUrl: string) => {
    setAvatarUrl(emojiOrUrl);
    if (!emojiOrUrl.startsWith("http")) {
      setCustomAvatarInput("");
    }
  };

  const handleCustomAvatarChange = (val: string) => {
    setCustomAvatarInput(val);
    if (val.trim()) {
      setAvatarUrl(val.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    // Validate inputs
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage("Please enter your full name (minimum 2 characters).");
      setIsSubmitting(false);
      return;
    }

    const cleanMobile = mobileNumber.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      setIsSubmitting(false);
      return;
    }

    if (!dob) {
      setErrorMessage("Please enter your date of birth.");
      setIsSubmitting(false);
      return;
    }

    if (!gender) {
      setErrorMessage("Please select your gender.");
      setIsSubmitting(false);
      return;
    }

    if (!location.trim() || location.trim().length < 2) {
      setErrorMessage("Please enter your location/city.");
      setIsSubmitting(false);
      return;
    }

    if (!academicYear || !["P1", "P2"].includes(academicYear)) {
      setErrorMessage("Please select your academic year (P1 or P2).");
      setIsSubmitting(false);
      return;
    }

    const res = await updateStudentProfile({
      full_name: fullName.trim(),
      mobile_number: cleanMobile,
      dob,
      gender,
      location: location.trim(),
      academic_year: academicYear,
      avatar_url: avatarUrl || "👨‍🎓",
      subscription: "Free",
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setIsCompletedNow(res.data.is_completed);
      setSuccessMessage("🎉 Profile completed successfully! Timed CBT Mock Tests are now unlocked.");
      router.refresh();
    } else {
      setErrorMessage(res.error || "Failed to update profile. Please try again.");
    }
  };

  const isFormComplete =
    fullName.trim().length >= 2 &&
    mobileNumber.replace(/\D/g, "").length >= 10 &&
    Boolean(dob) &&
    Boolean(gender) &&
    location.trim().length >= 2 &&
    Boolean(academicYear);

  return (
    <div className="space-y-6">
      {/* Notice Banner if redirected from mock tests */}
      {notice === "profile_required" && !isCompletedNow && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-xs flex items-start gap-3.5 animate-in fade-in">
          <span className="text-2xl shrink-0">🔒</span>
          <div>
            <h4 className="text-sm font-bold text-amber-950">
              Mock Tests Locked — Profile Completion Required
            </h4>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              To write competitive mock tests, track real-time scorecards, and maintain verified examination records, please complete all profile details below (Name, Mobile, Date of Birth, Gender, Location, and Academic Year P1/P2).
            </p>
          </div>
        </div>
      )}

      {/* Header Profile Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left">
            {/* Avatar Display */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl shadow-md border-2 border-white overflow-hidden">
                {avatarUrl && avatarUrl.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={fullName || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{avatarUrl || "👨‍🎓"}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-xs">
                ✓
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {fullName || "Student Profile"}
                </h2>
                {isCompletedNow ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Profile Completed
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 flex items-center gap-1 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    Completion Required
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-500 font-medium">
                {initialProfile.email}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                <span className="rounded-md bg-blue-50 px-2.5 py-1 font-bold text-blue-800 border border-blue-200">
                  Year: {academicYear || "Not Selected"}
                </span>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 border border-emerald-200">
                  Subscription: Free Tier
                </span>
              </div>
            </div>
          </div>

          {/* Quick Mock Test Enablement Badge */}
          <div className="flex flex-col items-center sm:items-end gap-2 text-center sm:text-right shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              CBT Mock Test Access
            </span>
            {isCompletedNow ? (
              <span className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-xs">
                ENABLED & UNLOCKED 🚀
              </span>
            ) : (
              <span className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black text-white shadow-xs">
                LOCKED (FILL PROFILE) 🔒
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Alerts */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <span>{successMessage}</span>
            {returnTo ? (
              <Link
                href={returnTo}
                className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-white font-black hover:bg-emerald-800 transition-colors shadow-xs"
              >
                Proceed to Exam &rarr;
              </Link>
            ) : (
              <Link
                href="/tests"
                className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-white font-black hover:bg-blue-800 transition-colors shadow-xs"
              >
                Write Mock Tests &rarr;
              </Link>
            )}
          </div>
        )}

        {/* Section 1: Personal Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">1. Student Identification Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your legal name, contact, and personal details for verified examination records.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="mobile_number" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="mobile_number"
                type="tel"
                required
                maxLength={15}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                10-digit mobile number for CBT notifications
              </span>
            </div>

            {/* Email (Read-only / verified) */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address <span className="text-slate-400">(Linked Account)</span>
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={initialProfile.email}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600 cursor-not-allowed select-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                🔒 Verified account login address
              </span>
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <input
                id="dob"
                type="date"
                required
                max={new Date().toISOString().split("T")[0]}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Gender <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Male", "Female", "Other"] as const).map((g) => {
                  const isSelected = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-800 shadow-2xs"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Location / City <span className="text-rose-500">*</span>
              </label>
              <input
                id="location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hyderabad, Telangana"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Academic Year & Subscription */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">2. Academic Year & Access Plan</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your current pre-university class year (P1 or P2).
            </p>
          </div>

          {/* Academic Year Selection (P1 or P2) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Option P1 */}
              <div
                onClick={() => setAcademicYear("P1")}
                className={`cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all ${
                  academicYear === "P1"
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-black text-sm text-white">
                    P1
                  </span>
                  <input
                    type="radio"
                    name="academic_year"
                    checked={academicYear === "P1"}
                    onChange={() => setAcademicYear("P1")}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <h4 className="mt-3 text-base font-bold text-slate-900">Year P1 (PUC-1)</h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Pre-University 1st Year / Class 11 equivalent. Foundation concepts across Maths, Physics, Chemistry, and Logical Aptitude.
                </p>
              </div>

              {/* Option P2 */}
              <div
                onClick={() => setAcademicYear("P2")}
                className={`cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all ${
                  academicYear === "P2"
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 font-black text-sm text-white">
                    P2
                  </span>
                  <input
                    type="radio"
                    name="academic_year"
                    checked={academicYear === "P2"}
                    onChange={() => setAcademicYear("P2")}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <h4 className="mt-3 text-base font-bold text-slate-900">Year P2 (PUC-2)</h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Pre-University 2nd Year / Class 12 equivalent. Advanced curriculum tailored for IIITH UGEE (SUPR & REAP) and SPEC examinations.
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Plan */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Subscription Plan
            </label>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
                  🎁
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-emerald-950">Free Student Tier</h4>
                    <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-900">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Unlimited access to computer-based mock tests, curriculum topics, and performance analytics.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs">
                Free ₹0
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Profile Picture & Avatar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">3. Profile Picture & Avatar</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose an academic student avatar or enter a custom photo URL.
            </p>
          </div>

          {/* Preset Avatars */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Choose an Avatar Preset
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
              {PRESET_AVATARS.map((av) => {
                const isSelected = avatarUrl === av.emoji;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => handleAvatarSelect(av.emoji)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all text-2xl ${av.bg} ${
                      isSelected
                        ? "ring-2 ring-blue-600 shadow-sm scale-105"
                        : "opacity-80 hover:opacity-100 hover:scale-102"
                    }`}
                    title={av.label}
                  >
                    <span>{av.emoji}</span>
                    <span className="text-[9px] font-bold text-slate-600 mt-1 truncate max-w-full">
                      {av.label.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar URL option */}
          <div className="pt-2">
            <label htmlFor="custom_avatar" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Or Enter Custom Image URL <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="custom_avatar"
              type="url"
              value={customAvatarInput}
              onChange={(e) => handleCustomAvatarChange(e.target.value)}
              placeholder="https://example.com/my-photo.jpg"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div>
            <p className="text-xs font-bold text-slate-700">
              {isFormComplete
                ? "All required fields are completed."
                : "Please fill in all required fields (marked with *)"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Saving your profile enables instant access to all competitive CBT mock exams.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-xl bg-blue-700 px-7 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Saving Profile...</span>
                </>
              ) : (
                <span>Save Profile & Enable Tests →</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

