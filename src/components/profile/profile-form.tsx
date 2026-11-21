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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCompletedNow, setIsCompletedNow] = useState(initialProfile.is_completed);

  const handleAvatarSelect = (emojiOrUrl: string) => {
    setAvatarUrl(emojiOrUrl);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read and compress image on client via canvas to ~300px JPEG data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 150;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setAvatarUrl(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
    <div className="space-y-4 sm:space-y-6">
      {/* Notice Banner if redirected from mock tests */}
      {notice === "profile_required" && !isCompletedNow && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-2xs flex items-center gap-3 animate-in fade-in">
          <span className="text-xl shrink-0">🔒</span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-amber-950">
              Mock Tests Locked — Profile Required
            </h4>
            <p className="text-[11px] text-amber-800 font-medium">
              Complete your profile details below to enable computer-based mock tests.
            </p>
          </div>
        </div>
      )}

      {/* Header Profile Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {/* Avatar Display with Tap to Upload */}
            <div className="relative group/av">
              <label
                htmlFor="photo-upload-main"
                className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl sm:text-4xl shadow-xs border-2 border-white overflow-hidden cursor-pointer"
                title="Tap to choose photo from Storage / Drive / Gallery"
              >
                {avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:")) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={fullName || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{avatarUrl || "👨‍🎓"}</span>
                )}
              </label>
              <label
                htmlFor="photo-upload-main"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-xs cursor-pointer hover:bg-emerald-600"
                title="Upload Photo"
              >
                📷
              </label>
              <input
                id="photo-upload-main"
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {fullName || "Student Profile"}
                </h2>
                {isCompletedNow ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Completed
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 flex items-center gap-1 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    Required
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 font-medium">
                {initialProfile.email}
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs">
                <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 font-bold text-blue-800 border border-blue-200">
                  Year: {academicYear || "Not Selected"}
                </span>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                  Free Tier
                </span>
              </div>
            </div>
          </div>

          {/* Quick Mock Test Enablement Badge */}
          <div className="flex flex-col items-center sm:items-end gap-1.5 text-center sm:text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Mock Test Access
            </span>
            {isCompletedNow ? (
              <span className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                UNLOCKED 🚀
              </span>
            ) : (
              <span className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                LOCKED 🔒
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Alerts */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <span>{successMessage}</span>
            {returnTo ? (
              <Link
                href={returnTo}
                className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-white font-bold hover:bg-emerald-800 transition-colors shadow-xs"
              >
                Proceed to Exam
              </Link>
            ) : (
              <Link
                href="/tests"
                className="rounded-lg bg-[#2E3AE3] px-3.5 py-1.5 text-white font-bold hover:bg-[#2029B8] transition-colors shadow-xs"
              >
                Mock Tests
              </Link>
            )}
          </div>
        )}

        {/* Section 1: Personal Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">1. Student Details</h3>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-1 focus:ring-[#2E3AE3] transition-all"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="mobile_number" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="mobile_number"
                type="tel"
                required
                maxLength={15}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-1 focus:ring-[#2E3AE3] transition-all"
              />
            </div>

            {/* Email (Read-only / verified) */}
            <div>
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={initialProfile.email}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs sm:text-sm text-slate-600 cursor-not-allowed select-none"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <input
                id="dob"
                type="date"
                required
                max={new Date().toISOString().split("T")[0]}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-1 focus:ring-[#2E3AE3] transition-all"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
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
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-[#2E3AE3] bg-[#EEF2FF] text-[#2E3AE3] shadow-2xs"
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
              <label htmlFor="location" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Location / City <span className="text-rose-500">*</span>
              </label>
              <input
                id="location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-1 focus:ring-[#2E3AE3] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Academic Year & Subscription */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">2. Academic Year</h3>
          </div>

          {/* Academic Year Selection (P1 or P2) */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Option P1 */}
            <div
              onClick={() => setAcademicYear("P1")}
              className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                academicYear === "P1"
                  ? "border-[#2E3AE3] bg-[#EEF2FF]/70 ring-2 ring-[#2E3AE3]/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 font-bold text-xs text-white">
                  P1
                </span>
                <input
                  type="radio"
                  name="academic_year"
                  checked={academicYear === "P1"}
                  onChange={() => setAcademicYear("P1")}
                  className="h-4 w-4 text-[#2E3AE3]"
                />
              </div>
              <h4 className="mt-2 text-sm font-bold text-slate-900">Year P1 (PUC-1)</h4>
              <p className="mt-0.5 text-xs text-slate-500">
                Class 11 / 1st Year Foundation
              </p>
            </div>

            {/* Option P2 */}
            <div
              onClick={() => setAcademicYear("P2")}
              className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                academicYear === "P2"
                  ? "border-[#2E3AE3] bg-[#EEF2FF]/70 ring-2 ring-[#2E3AE3]/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-700 font-bold text-xs text-white">
                  P2
                </span>
                <input
                  type="radio"
                  name="academic_year"
                  checked={academicYear === "P2"}
                  onChange={() => setAcademicYear("P2")}
                  className="h-4 w-4 text-[#2E3AE3]"
                />
              </div>
              <h4 className="mt-2 text-sm font-bold text-slate-900">Year P2 (PUC-2)</h4>
              <p className="mt-0.5 text-xs text-slate-500">
                Class 12 / 2nd Year Advanced Prep
              </p>
            </div>
          </div>

          {/* Subscription Plan */}
          <div className="pt-2 border-t border-slate-100">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">
                  🎁
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950">Free Student Tier</h4>
                    <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Full CBT mock tests &amp; curriculum access
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                Free
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Profile Picture & Avatar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">3. Profile Photo &amp; Avatar</h3>
          </div>

          {/* Device Storage / Google Drive Photo Picker */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Select Profile Photo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/60">
              {/* Photo Preview */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl shadow-xs border-2 border-white overflow-hidden shrink-0">
                {avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:")) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                ) : (
                  <span>{avatarUrl || "👨‍🎓"}</span>
                )}
              </div>

              {/* Action Buttons: Pick from Storage / Drive */}
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label
                    htmlFor="photo-upload-section"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#2E3AE3] hover:bg-[#EEF2FF] hover:text-[#2E3AE3] px-3.5 py-2 text-xs font-bold text-slate-700 cursor-pointer transition-all shadow-2xs active:scale-95"
                  >
                    <span>📁</span>
                    <span>Choose from Storage / Drive / Gallery</span>
                  </label>
                  <input
                    id="photo-upload-section"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                  {avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:")) && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("👨‍🎓")}
                      className="rounded-xl border border-rose-200 bg-white hover:bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition-all shadow-2xs active:scale-95"
                    >
                      Reset Photo
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Select image from Recent, Internal Storage, or Google Drive
                </p>
              </div>
            </div>

            {/* Preset Avatars */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                Or Choose an Avatar Preset
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = avatarUrl === av.emoji;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleAvatarSelect(av.emoji)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 transition-all text-xl ${av.bg} ${
                        isSelected
                          ? "ring-2 ring-[#2E3AE3] shadow-xs scale-105"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      title={av.label}
                    >
                      <span>{av.emoji}</span>
                      <span className="text-[9px] font-bold text-slate-600 mt-0.5 truncate max-w-full">
                        {av.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <p className="text-xs font-bold text-slate-700">
              {isFormComplete
                ? "All required fields are completed."
                : "Please fill in all required fields (*)"}
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full sm:w-auto rounded-xl bg-[#2E3AE3] px-6 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#2029B8] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

