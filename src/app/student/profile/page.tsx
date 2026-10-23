
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type StudentProfile = {
  id: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  department: string | null;
  year_of_study: number | null;
};

export default function StudentProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, phone, department, year_of_study")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (error || !data) {
        setIsError(true);
        setMessage(
          error?.message ??
            "Your profile was not found. Please contact the administrator."
        );
        setLoading(false);
        return;
      }

      if (data.role !== "student") {
        router.replace(
          data.role === "admin"
            ? "/admin"
            : data.role === "teacher"
              ? "/teacher"
              : "/login"
        );
        return;
      }

      const student = data as StudentProfile;
      setProfile(student);
      setFullName(student.full_name ?? "");
      setPhone(student.phone ?? "");
      setDepartment(student.department ?? "");
      setYearOfStudy(
        student.year_of_study == null
          ? ""
          : String(student.year_of_study)
      );
      setLoading(false);
    }

    void loadProfile();
  }, [router]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage("");
    setIsError(false);

    const supabase = createClient();
    const parsedYear =
      yearOfStudy === "" ? null : Number(yearOfStudy);

    if (
      parsedYear !== null &&
      (!Number.isInteger(parsedYear) ||
        parsedYear < 1 ||
        parsedYear > 6)
    ) {
      setMessage("Year of study must be between 1 and 6.");
      setIsError(true);
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        department: department.trim() || null,
        year_of_study: parsedYear,
      })
      .eq("id", profile.id)
      .select("id, full_name, role, phone, department, year_of_study")
      .maybeSingle();

    if (error) {
      setMessage(`Could not save your profile: ${error.message}`);
      setIsError(true);
    } else if (!data) {
      setMessage(
        "No profile was updated. Check your Supabase profile update policy."
      );
      setIsError(true);
    } else {
      const student = data as StudentProfile;
      setProfile(student);
      setFullName(student.full_name ?? "");
      setPhone(student.phone ?? "");
      setDepartment(student.department ?? "");
      setYearOfStudy(
        student.year_of_study == null
          ? ""
          : String(student.year_of_study)
      );
      setMessage("Your profile was saved successfully.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading your profile...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/student"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          &larr; Back to Student Portal
        </Link>

        <header className="mb-8 mt-8">
          <p className="text-sm font-bold tracking-widest text-cyan-400">
            EDUSPHERE AI
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            My Student Profile
          </h1>
          <p className="mt-2 text-slate-400">
            Keep your personal and academic details up to date.
          </p>
        </header>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8"
        >
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-medium">
              Full name
            </label>
            <input
              id="fullName"
              required
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Enter your phone number"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="department"
              className="mb-2 block text-sm font-medium"
            >
              Department or branch
            </label>
            <input
              id="department"
              maxLength={100}
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="e.g. Computer Science"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="yearOfStudy"
              className="mb-2 block text-sm font-medium"
            >
              Year of study
            </label>
            <select
              id="yearOfStudy"
              value={yearOfStudy}
              onChange={(event) => setYearOfStudy(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            >
              <option value="">Select year (optional)</option>
              {[1, 2, 3, 4, 5, 6].map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </div>

          {message && (
            <div
              role="status"
              className={`rounded-xl p-3 text-sm ${
                isError
                  ? "bg-red-950 text-red-200"
                  : "bg-emerald-950 text-emerald-200"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !profile}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Your profile is linked to your authenticated account.
        </p>
      </div>
    </main>
  );
}
