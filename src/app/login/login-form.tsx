
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function LoginForm({
  role,
}: {
  role: "student" | "teacher";
}) {
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

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              requested_role: role,
            },
          },
        });

        if (error) throw error;

        setMessage(
          role === "teacher"
            ? "Registration received. Confirm your email if requested. An administrator must approve teacher access."
            : "Registration received. Check your email to confirm your account, then sign in."
        );

        return;
      }

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

      if (profileError || !profile) {
        await supabase.auth.signOut();

        setMessage(
          profileError
            ? `Could not verify your account: ${profileError.message}`
            : "No profile was found for this account. Please contact the administrator."
        );

        return;
      }

      // Always trust the role stored in the database.
      if (profile.role === "admin") {
        router.replace("/admin");
        router.refresh();
        return;
      }

      if (profile.role === "teacher") {
        if (role !== "teacher") {
          await supabase.auth.signOut();
          setMessage(
            "This account is a teacher account. Please use the Teacher Portal."
          );
          return;
        }

        router.replace("/teacher");
        router.refresh();
        return;
      }

      if (profile.role === "student") {
        if (role !== "student") {
          await supabase.auth.signOut();
          setMessage(
            "This account is a student account. Please use the Student Portal."
          );
          return;
        }

        router.replace("/student");
        router.refresh();
        return;
      }

      await supabase.auth.signOut();
      setMessage(
        "This account does not have an approved portal role. Please contact the administrator."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <Link href="/" className="text-sm text-cyan-400">
          &larr; Back to EduSphere AI
        </Link>

        <div className="mt-10">
          <p className="text-sm font-bold tracking-widest text-cyan-400">
            EDUSPHERE AI
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            {mode === "login"
              ? role === "teacher"
                ? "Teacher sign in"
                : "Student sign in"
              : role === "teacher"
                ? "Teacher registration"
                : "Create student account"}
          </h1>

          <p className="mt-3 text-slate-400">
            {mode === "login"
              ? `Sign in to access your ${role} portal.`
              : "Create your account to get started."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {mode === "signup" && (
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium"
              >
                Full name
              </label>
              <input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              placeholder="Enter your password"
            />
          </div>

          {message && (
            <div
              role="status"
              className="rounded-xl bg-slate-800 p-3 text-sm text-slate-200"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {mode === "login" ? "New user?" : "Already have an account?"}{" "}
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
          {role === "student" ? "Are you a teacher?" : "Are you a student?"}{" "}
          <Link
            href={role === "student" ? "/login?role=teacher" : "/login"}
            className="font-semibold text-cyan-400 hover:text-cyan-300"
          >
            {role === "student" ? "Teacher portal" : "Student portal"}
          </Link>
        </p>
      </section>
    </main>
  );
}
