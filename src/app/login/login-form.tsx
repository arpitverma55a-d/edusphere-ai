
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function LoginForm({ role }: { role: "student" | "teacher" }) {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, requested_role: role },
          },
        });

        if (error) throw error;

        setMessage(
          role === "teacher"
            ? "Registration received. Confirm your email if requested. An administrator must approve teacher access."
            : "Registration received. Check your email to confirm your account, then sign in."
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError) {
  console.error("Profile verification error:", profileError);
  await supabase.auth.signOut();

  setMessage(
    `Profile query failed: ${profileError.message} (Code: ${profileError.code})`
  );
  return;
}

if (!profile) {
  await supabase.auth.signOut();
  setMessage(
    "No profile was found for this account. Please contact the administrator."
  );
  return;
}

        if (role === "teacher") {
          if (profile.role !== "teacher" && profile.role !== "admin") {
            await supabase.auth.signOut();
            setMessage("This account is not approved for the Teacher Portal.");
            return;
          }
          router.replace("/teacher");
        } else {
          if (profile.role !== "student") {
            await supabase.auth.signOut();
            setMessage("This account is not a student account. Please use the correct portal.");
            return;
          }
          router.replace("/student");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <Link href="/" className="text-sm text-cyan-400">
          ← Back to EduSphere AI
        </Link>

        <p className="mt-8 text-sm font-bold tracking-widest text-cyan-400">
          EDUSPHERE AI
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          {mode === "login"
            ? `${role === "teacher" ? "Teacher" : "Student"} sign in`
            : `Create ${role} account`}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          {mode === "login"
            ? `Sign in to access your ${role} portal.`
            : role === "teacher"
              ? "Teacher registration requires administrator approval."
              : "Register to get started with EduSphere AI."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {mode === "signup" && (
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm">Full name</label>
              <input
                id="fullName"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
                placeholder="Your full name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              placeholder="At least 6 characters"
            />
          </div>

          {message && (
            <p role="status" className="rounded-lg bg-slate-800 p-3 text-sm text-slate-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {mode === "login" ? "New user? " : "Already registered? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
            className="font-semibold text-cyan-400 hover:text-cyan-300"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <p className="mt-5 text-center text-sm text-slate-400">
          {role === "student" ? (
            <>Are you a teacher? <Link href="/login?role=teacher" className="font-semibold text-cyan-400">Teacher portal</Link></>
          ) : (
            <>Are you a student? <Link href="/login" className="font-semibold text-cyan-400">Student portal</Link></>
          )}
        </p>
      </section>
    </main>
  );
}
