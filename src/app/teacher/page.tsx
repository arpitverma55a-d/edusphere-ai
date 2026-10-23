
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function TeacherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking your account...");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function checkTeacher() {
      const supabase = createClient();

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setMessage("Could not verify your account role. Please try again.");
        setLoading(false);
        return;
      }

      if (profile?.role !== "teacher" && profile?.role !== "admin") {
        setMessage("This account is not authorized for the Teacher Portal.");
        setLoading(false);
        return;
      }

      setMessage("Your teacher account is verified.");
      setLoading(false);
    }

    checkTeacher();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <p>{message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 font-bold tracking-widest text-cyan-400">
          EDUSPHERE AI
        </p>

        <h1 className="text-3xl font-bold">Teacher Portal</h1>
        <p className="mt-2 text-slate-300">
          Signed in as {email}
        </p>

        <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Account status</h2>
          <p className="mt-3 text-slate-300">{message}</p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-lg border border-slate-600 px-5 py-3 hover:bg-slate-800"
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}
