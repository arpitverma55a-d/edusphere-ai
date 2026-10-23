
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
};

type Course = {
  id: string;
  name: string;
  course_code: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [adminName, setAdminName] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [roleChanges, setRoleChanges] = useState<Record<string, string>>({});

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data: myProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError || !myProfile || myProfile.role !== "admin") {
        router.replace("/student");
        return;
      }

      setAdminName(myProfile.full_name || "Administrator");

      const [profilesResult, coursesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role")
          .order("full_name"),
        supabase
          .from("courses")
          .select("id, name, course_code")
          .order("name"),
      ]);

      if (profilesResult.error) {
        throw new Error("Could not load users: " + profilesResult.error.message);
      }

      if (coursesResult.error) {
        throw new Error("Could not load courses: " + coursesResult.error.message);
      }

      setProfiles((profilesResult.data ?? []) as Profile[]);
      setCourses((coursesResult.data ?? []) as Course[]);
      setRoleChanges({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function updateRole(profile: Profile) {
    const newRole = roleChanges[profile.id] ?? profile.role;

    if (newRole === profile.role) return;

    const confirmed = window.confirm(
      `Change ${profile.full_name || "this user"} from ${profile.role} to ${newRole}?`
    );

    if (!confirmed) return;

    setSavingUser(profile.id);
    setError("");
    setMessage("");

    try {
      const { data, error: updateError } = await supabase.rpc(
        "admin_update_user_role",
        {
          target_user_id: profile.id,
          new_role: newRole,
        }
      );

      if (updateError) throw updateError;
      if (data !== true) throw new Error("The role update was not confirmed.");

      setMessage(
        `Role updated successfully for ${profile.full_name || "the user"}.`
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the user's role."
      );
    } finally {
      setSavingUser("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const students = profiles.filter((p) => p.role === "student");
  const teachers = profiles.filter((p) => p.role === "teacher");
  const admins = profiles.filter((p) => p.role === "admin");

  const filteredProfiles = profiles.filter((profile) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      (profile.full_name ?? "").toLowerCase().includes(term) ||
      profile.role.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-lg">Loading EduSphere Admin Dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              EduSphere AI
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-slate-400">
              Welcome, {adminName}. Manage your college platform.
            </p>
          </div>

          <div className="flex gap-3">
            <button
  onClick={() => { window.location.href = "/announcements"; }}
  className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
>
  📢 Announcements
</button>
            <button
              onClick={() => void loadDashboard()}
              className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
            >
              Refresh
            </button>
            <button
              onClick={() => void signOut()}
              className="rounded-xl bg-rose-500 px-4 py-2 font-semibold text-white hover:bg-rose-600"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">
            {message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Users", value: profiles.length, detail: "All registered profiles", color: "text-cyan-300" },
            { label: "Students", value: students.length, detail: "Student accounts", color: "text-emerald-300" },
            { label: "Teachers", value: teachers.length, detail: "Teaching accounts", color: "text-violet-300" },
            { label: "Courses", value: courses.length, detail: "Available courses", color: "text-amber-300" },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className={`mt-3 text-4xl font-bold ${item.color}`}>{item.value}</p>
              <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">User Management</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Search accounts and update their roles.
                </p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or role..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none focus:border-cyan-400 sm:w-64"
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Current role</th>
                    <th className="px-3 py-3 font-medium">Change role</th>
                    <th className="px-3 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((profile) => {
                    const selectedRole = roleChanges[profile.id] ?? profile.role;

                    return (
                      <tr key={profile.id} className="border-b border-slate-800/70">
                        <td className="px-3 py-4 font-medium">
                          {profile.full_name || "Unnamed user"}
                          <p className="mt-1 max-w-48 truncate font-mono text-xs text-slate-500">
                            {profile.id}
                          </p>
                        </td>
                        <td className="px-3 py-4 capitalize">{profile.role}</td>
                        <td className="px-3 py-4">
                          <select
                            value={selectedRole}
                            onChange={(event) =>
                              setRoleChanges((current) => ({
                                ...current,
                                [profile.id]: event.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
                            aria-label={`New role for ${profile.full_name || "user"}`}
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-3 py-4">
                          <button
                            onClick={() => void updateRole(profile)}
                            disabled={selectedRole === profile.role || savingUser !== ""}
                            className="rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {savingUser === profile.id ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProfiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                        No matching users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Platform Overview</h2>
            <p className="mt-1 text-sm text-slate-400">Current platform summary.</p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-400">Administrators</span>
                <span className="font-semibold">{admins.length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-400">Total courses</span>
                <span className="font-semibold">{courses.length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-400">Registered users</span>
                <span className="font-semibold">{profiles.length}</span>
              </div>
            </div>

            <h3 className="mt-7 font-semibold">Courses</h3>
            <div className="mt-3 space-y-3">
              {courses.slice(0, 6).map((course) => (
                <div key={course.id} className="rounded-xl bg-slate-950 p-3">
                  <p className="font-medium">{course.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{course.course_code}</p>
                </div>
              ))}
              {courses.length === 0 && (
                <p className="text-sm text-slate-500">No courses found.</p>
              )}
            </div>
          </aside>
        </section>

        <footer className="mt-8 text-center text-sm text-slate-500">
          EduSphere AI - College Management System
        </footer>
      </div>
    </main>
  );
}
