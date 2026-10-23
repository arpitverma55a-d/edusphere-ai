
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function StudentPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? "");
      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Checking your session...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold tracking-widest text-cyan-400">
          EDUSPHERE AI
        </p>
        <h1 className="mt-5 text-3xl font-bold">Student Portal</h1>
        <p className="mt-3 text-slate-300">
          Signed in as {email}
        </p>
        <p className="mt-6 text-slate-400">
          Your attendance, marks, and assignments dashboard will be built here.
        </p>
        <button
          onClick={signOut}
          className="mt-8 rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
