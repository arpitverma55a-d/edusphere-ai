
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type AttendanceRecord = {
  id: string;
  status: string;
  class_date: string;
  course_id: string;
};

type MarkRecord = {
  id: string;
  subject: string;
  score: number;
  max_score: number;
};

type AssignmentRecord = {
  id: string;
  title: string;
  description: string;
  due_at: string | null;
  course_id: string | null;
};

type CourseRecord = {
  id: string;
  name: string;
};

export default function StudentPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);

  const loadDashboard = useCallback(async () => {
    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    setEmail(authData.user.email ?? "");
    setErrorMessage("");

    const userId = authData.user.id;

    const [attendanceResult, marksResult, assignmentsResult, coursesResult] =
      await Promise.all([
        supabase
          .from("attendance")
          .select("id, status, class_date, course_id")
          .eq("student_id", userId)
          .order("class_date", { ascending: false }),

        supabase
          .from("marks")
          .select("id, subject, score, max_score")
          .eq("student_id", userId),

        // The existing schema has no student submission table yet.
        // This lists course assignments; it does not claim submission status.
        supabase
          .from("assignments")
          .select("id, title, description, due_at, course_id")
          .order("due_at", { ascending: true }),

        supabase.from("courses").select("id, name"),
      ]);

    const firstError =
      attendanceResult.error ??
      marksResult.error ??
      assignmentsResult.error ??
      coursesResult.error;

    if (firstError) {
      setErrorMessage(
        "Some dashboard data could not be loaded. Check your Supabase tables and Row Level Security (RLS) policies, then refresh."
      );
    }

    setAttendance(
      (attendanceResult.data ?? []) as AttendanceRecord[]
    );
    setMarks((marksResult.data ?? []) as MarkRecord[]);
    setAssignments(
      (assignmentsResult.data ?? []) as AssignmentRecord[]
    );
    setCourses((coursesResult.data ?? []) as CourseRecord[]);
  }, [router]);

  useEffect(() => {
    async function initialize() {
      try {
        await loadDashboard();
      } catch {
        setErrorMessage("Unable to load the dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadDashboard]);

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch {
      setErrorMessage("Unable to refresh dashboard data.");
    } finally {
      setRefreshing(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const attended = attendance.filter(
    (record) => record.status === "present" || record.status === "late"
  ).length;

  const totalClasses = attendance.length;

  const attendancePercentage =
    totalClasses > 0
      ? Math.round((attended / totalClasses) * 100)
      : null;

  const classesNeeded =
    attendancePercentage !== null && attendancePercentage < 75
      ? Math.ceil(3 * totalClasses - 4 * attended)
      : 0;

  const totalScore = marks.reduce(
    (sum, mark) => sum + Number(mark.score || 0),
    0
  );

  const totalPossible = marks.reduce(
    (sum, mark) => sum + Number(mark.max_score || 0),
    0
  );

  const averagePercentage =
    totalPossible > 0
      ? Math.round((totalScore / totalPossible) * 100)
      : null;

  const upcomingAssignments = assignments
    .filter(
      (assignment) =>
        assignment.due_at &&
        new Date(assignment.due_at).getTime() >= Date.now()
    )
    .sort(
      (a, b) =>
        new Date(a.due_at!).getTime() -
        new Date(b.due_at!).getTime()
    );

  function courseName(courseId: string | null) {
    if (!courseId) return "General";
    return courses.find((course) => course.id === courseId)?.name ??
      "Course";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Checking your session and loading your dashboard...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-cyan-400">
              EDUSPHERE AI
            </p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Student Dashboard
            </h1>
            <p className="mt-2 break-all text-sm text-slate-400">
              Signed in as {email}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={refreshDashboard}
              disabled={refreshing}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={signOut}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Sign out
            </button>
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200"
          >
            {errorMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Attendance</p>
            <p className="mt-3 text-3xl font-bold text-cyan-300">
              {attendancePercentage === null
                ? "—"
                : `${attendancePercentage}%`}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {attended} attended out of {totalClasses} recorded classes
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Academic average</p>
            <p className="mt-3 text-3xl font-bold text-cyan-300">
              {averagePercentage === null
                ? "—"
                : `${averagePercentage}%`}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {marks.length} mark records
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Assignments</p>
            <p className="mt-3 text-3xl font-bold text-cyan-300">
              {assignments.length}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Total assignments in the database
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Upcoming deadlines</p>
            <p className="mt-3 text-3xl font-bold text-cyan-300">
              {upcomingAssignments.length}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Assignments with future due dates
            </p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Attendance overview</h2>
            <p className="mt-2 text-sm text-slate-400">
              Based on attendance records currently saved in Supabase.
            </p>

            {totalClasses === 0 ? (
              <p className="mt-5 rounded-lg bg-slate-800/70 p-4 text-sm text-slate-300">
                No attendance records yet. Your attendance will appear here
                after your teacher records classes.
              </p>
            ) : (
              <>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{
                      width: `${attendancePercentage ?? 0}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-slate-300">
                    {attended} attended
                  </span>
                  <span className="text-slate-400">
                    {totalClasses - attended} not counted as attended
                  </span>
                </div>

                {attendancePercentage !== null &&
                  attendancePercentage < 75 && (
                    <p className="mt-4 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-200">
                      To reach 75%, you need to attend approximately{" "}
                      {classesNeeded} consecutive future classes, assuming
                      no more absences and that each future class is counted.
                    </p>
                  )}

                {attendancePercentage !== null &&
                  attendancePercentage >= 75 && (
                    <p className="mt-4 rounded-lg bg-cyan-400/10 p-4 text-sm text-cyan-200">
                      Your recorded attendance is at least 75%.
                    </p>
                  )}
              </>
            )}
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Academic performance</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your saved marks, grouped by subject.
            </p>

            {marks.length === 0 ? (
              <p className="mt-5 rounded-lg bg-slate-800/70 p-4 text-sm text-slate-300">
                No marks have been recorded for your account yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {marks.map((mark) => {
                  const percentage =
                    Number(mark.max_score) > 0
                      ? Math.round(
                          (Number(mark.score) /
                            Number(mark.max_score)) *
                            100
                        )
                      : 0;

                  return (
                    <div key={mark.id}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-medium">{mark.subject}</span>
                        <span className="text-slate-300">
                          {mark.score}/{mark.max_score} ({percentage}%)
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{
                            width: `${Math.min(100, Math.max(0, percentage))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Assignments</h2>
          <p className="mt-2 text-sm text-slate-400">
            Assignments available from the database. Submission tracking
            will be added separately.
          </p>

          {assignments.length === 0 ? (
            <p className="mt-5 rounded-lg bg-slate-800/70 p-4 text-sm text-slate-300">
              No assignments are available yet.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-800">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="py-4 first:pt-2 last:pb-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{assignment.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {courseName(assignment.course_id)}
                      </p>
                      {assignment.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                          {assignment.description}
                        </p>
                      )}
                    </div>

                    <p className="text-sm text-slate-400">
                      {assignment.due_at
                        ? `Due ${new Date(
                            assignment.due_at
                          ).toLocaleString()}`
                        : "No deadline set"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-slate-800 pt-5 text-sm text-slate-500">
          EduSphere AI · Intelligent College Management
        </footer>
      </div>
    </main>
  );
}
