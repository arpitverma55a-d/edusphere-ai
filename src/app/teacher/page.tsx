
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type Course = {
  id: string;
  name: string;
  course_code: string;
};

export default function TeacherPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState("");
  const [enrollmentMessage, setEnrollmentMessage] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const loadCourses = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login?role=teacher");
      return;
    }

    setEmail(user.email ?? "");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      setMessage("Could not verify your profile. Please contact the administrator.");
      setLoading(false);
      return;
    }

    if (profile.role !== "teacher" && profile.role !== "admin") {
      router.replace("/login?role=teacher");
      return;
    }

    setAuthorized(true);

    const { data, error } = await supabase
      .from("courses")
      .select("id, name, course_code")
      .eq("teacher_id", user.id)
      .order("name");

    if (error) {
      setMessage(`Could not load courses: ${error.message}`);
    } else {
      setCourses(data ?? []);
      setSelectedCourseId((current) => {
        if (data?.some((course) => course.id === current)) return current;
        return data?.[0]?.id ?? "";
      });
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  async function createCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login?role=teacher");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        (profile.role !== "teacher" && profile.role !== "admin")
      ) {
        setMessage("Your account is not authorized to create courses.");
        return;
      }

      const name = courseName.trim();
      const code = courseCode.trim().toUpperCase();

      if (!name || !code) {
        setMessage("Please enter both a course name and course code.");
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .insert({
          name,
          course_code: code,
          teacher_id: user.id,
        })
        .select("id, name, course_code")
        .single();

      if (error) throw error;

      setCourses((current) =>
        [...current, data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedCourseId(data.id);
      setCourseName("");
      setCourseCode("");
      setMessage("Course created successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Could not create course: ${error.message}`
          : "Something went wrong while creating the course."
      );
    } finally {
      setSaving(false);
    }
  }

  async function enrollStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnrollmentMessage("");
    setEnrolling(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login?role=teacher");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        (profile.role !== "teacher" && profile.role !== "admin")
      ) {
        setEnrollmentMessage("Your account is not authorized to enroll students.");
        return;
      }

      if (!selectedCourseId) {
        setEnrollmentMessage("Please create or select a course first.");
        return;
      }

      const normalizedId = studentId.trim();

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidPattern.test(normalizedId)) {
        setEnrollmentMessage("Please enter a valid student profile UUID.");
        return;
      }

      const { error } = await supabase
        .from("course_enrollments")
        .insert({
          student_id: normalizedId,
          course_id: selectedCourseId,
        });

      if (error) {
        if (error.code === "23505") {
          setEnrollmentMessage("This student is already enrolled in that course.");
          return;
        }

        if (error.code === "23503") {
          setEnrollmentMessage("The student UUID or selected course does not exist.");
          return;
        }

        if (error.code === "42501") {
          setEnrollmentMessage(
            "Enrollment was blocked by database security. Apply the enrollment policy in Step 2 below, then try again."
          );
          return;
        }

        throw error;
      }

      const course = courses.find((item) => item.id === selectedCourseId);

      setEnrollmentMessage(
        `Student enrolled successfully${course ? ` in ${course.name}` : ""}.`
      );
      setStudentId("");
    } catch (error) {
      setEnrollmentMessage(
        error instanceof Error
          ? `Enrollment failed: ${error.message}`
          : "Enrollment failed. Please try again."
      );
    } finally {
      setEnrolling(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login?role=teacher");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading Teacher Portal...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <p>{message || "Verifying your account..."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold tracking-widest text-cyan-400">
              EDUSPHERE AI
            </p>
            <h1 className="mt-3 text-3xl font-bold">Teacher Portal</h1>
            <p className="mt-2 text-slate-400">Signed in as {email}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
            >
              Home
            </button>
            <button
              onClick={signOut}
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Sign out
            </button>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Create a course</h2>
          <p className="mt-2 text-sm text-slate-400">
            Add a course that you teach. Course codes must be unique.
          </p>

          <form
            onSubmit={createCourse}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            <div>
              <label htmlFor="courseName" className="mb-2 block text-sm">
                Course name
              </label>
              <input
                id="courseName"
                required
                maxLength={100}
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Database Management Systems"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="courseCode" className="mb-2 block text-sm">
                Course code
              </label>
              <input
                id="courseCode"
                required
                maxLength={30}
                value={courseCode}
                onChange={(e) =>
                  setCourseCode(e.target.value.toUpperCase().replace(/\s+/g, ""))
                }
                placeholder="e.g. CSE102"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 sm:col-span-2"
            >
              {saving ? "Creating course..." : "Create course"}
            </button>
          </form>

          {message && (
            <p role="status" className="mt-4 rounded-lg bg-slate-800 p-3 text-sm">
              {message}
            </p>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Enroll a student</h2>
          <p className="mt-2 text-sm text-slate-400">
            Enter the student's profile UUID and select one of your courses.
          </p>

          <form onSubmit={enrollStudent} className="mt-5 space-y-4">
            <div>
              <label htmlFor="enrollmentCourse" className="mb-2 block text-sm">
                Course
              </label>
              <select
                id="enrollmentCourse"
                required
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={courses.length === 0}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
              >
                {courses.length === 0 && <option value="">Create a course first</option>}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} — {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="studentId" className="mb-2 block text-sm">
                Student profile UUID
              </label>
              <input
                id="studentId"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Paste the student's profile UUID"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
              />
              <p className="mt-2 text-xs text-slate-400">
                Use the UUID from public.profiles. Only enroll students you are authorized to manage.
              </p>
            </div>

            <button
              type="submit"
              disabled={enrolling || courses.length === 0}
              className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              {enrolling ? "Enrolling student..." : "Enroll student"}
            </button>
          </form>

          {enrollmentMessage && (
            <p role="status" className="mt-4 rounded-lg bg-slate-800 p-3 text-sm">
              {enrollmentMessage}
            </p>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Your courses</h2>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-cyan-300">
              {courses.length} total
            </span>
          </div>

          {courses.length === 0 ? (
            <p className="mt-5 rounded-lg bg-slate-800 p-4 text-slate-300">
              No courses yet. Create your first course using the form above.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-5"
                >
                  <p className="text-sm font-semibold text-cyan-400">
                    {course.course_code}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{course.name}</h3>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
