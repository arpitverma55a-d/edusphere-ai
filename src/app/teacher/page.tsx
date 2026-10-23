
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "../lib/supabase/client";

type Course = {
  id: string;
  name: string;
  course_code: string;
};

type Student = {
  id: string;
  full_name: string | null;
};

type AttendanceStatus = "present" | "absent";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  course_id: string;
};

type CourseStudent = {
  student_id: string;
  full_name: string | null;
  course_id: string;
};

export default function TeacherPage() {
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [studentId, setStudentId] = useState("");

  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  const loadCourses = useCallback(
    async (teacherId: string) => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, course_code")
        .eq("teacher_id", teacherId)
        .order("name");

      if (error) {
        setMessage("Could not load courses: " + error.message);
        return;
      }

      const list = (data ?? []) as Course[];
      setCourses(list);

      setSelectedCourse((current) => {
        if (current && list.some((course) => course.id === current)) {
          return current;
        }
        return list[0]?.id ?? "";
      });
    },
    [supabase]
  );

  const loadStudents = useCallback(async () => {
    if (!selectedCourse) {
      setStudents([]);
      setAttendance({});
      return;
    }

    const { data: enrollments, error } = await supabase
      .from("course_enrollments")
      .select("student_id")
      .eq("course_id", selectedCourse);

    if (error) {
      setMessage("Could not load enrolled students: " + error.message);
      return;
    }

    const ids = (enrollments ?? []).map(
      (item) => item.student_id as string
    );

    if (ids.length === 0) {
      setStudents([]);
      setAttendance({});
      return;
    }

    const { data: profiles, error: profilesError } = await supabase.rpc(
      "get_my_course_students"
    );

    if (profilesError) {
      setMessage("Could not load student names: " + profilesError.message);
      return;
    }

    const courseStudents = ((profiles ?? []) as CourseStudent[]).filter(
      (student) =>
        student.course_id === selectedCourse && ids.includes(student.student_id)
    );

    setStudents(
      courseStudents.map((student) => ({
        id: student.student_id,
        full_name: student.full_name,
      }))
    );

    const { data: records, error: attendanceError } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("course_id", selectedCourse)
      .eq("class_date", attendanceDate);

    if (attendanceError) {
      setMessage("Could not load attendance: " + attendanceError.message);
      return;
    }

    const saved: Record<string, AttendanceStatus> = {};

    for (const record of records ?? []) {
      if (record.status === "present" || record.status === "absent") {
        saved[record.student_id] = record.status;
      }
    }

    setAttendance(saved);
  }, [supabase, selectedCourse, attendanceDate]);

  const loadAssignments = useCallback(async () => {
    if (!selectedCourse) {
      setAssignments([]);
      return;
    }

    const { data, error } = await supabase
      .from("assignments")
      .select("id, title, description, due_at, course_id")
      .eq("course_id", selectedCourse)
      .order("due_at", { ascending: true });

    if (error) {
      setMessage("Could not load assignments: " + error.message);
      return;
    }

    setAssignments((data ?? []) as Assignment[]);
  }, [supabase, selectedCourse]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        window.location.href = "/login?role=teacher";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (!active) return;

      if (
        profileError ||
        !profile ||
        !["teacher", "admin"].includes(profile.role)
      ) {
        setMessage("This page is only available to teacher accounts.");
        setLoading(false);
        return;
      }

      setUserId(data.user.id);
      await loadCourses(data.user.id);

      if (active) setLoading(false);
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [supabase, loadCourses]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!userId) return;

    const { error } = await supabase.from("courses").insert({
      name: courseName.trim(),
      course_code: courseCode.trim().toUpperCase(),
      teacher_id: userId,
    });

    if (error) {
      setMessage("Could not create course: " + error.message);
      return;
    }

    setCourseName("");
    setCourseCode("");
    setMessage("Course created successfully.");
    await loadCourses(userId);
  }

  async function enrollStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!selectedCourse || !studentId.trim()) {
      setMessage("Select a course and enter the student's profile UUID.");
      return;
    }

    const { error } = await supabase.from("course_enrollments").insert({
      course_id: selectedCourse,
      student_id: studentId.trim(),
    });

    if (error) {
      setMessage(
        error.code === "23505"
          ? "This student is already enrolled in this course."
          : "Could not enroll student: " + error.message
      );
      return;
    }

    setStudentId("");
    setMessage("Student enrolled successfully.");
    await loadStudents();
  }

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!userId || !selectedCourse) {
      setMessage("Please create or select a course first.");
      return;
    }

    if (!assignmentTitle.trim() || !assignmentDeadline) {
      setMessage("Enter an assignment title and deadline.");
      return;
    }

    const deadline = new Date(assignmentDeadline);

    if (Number.isNaN(deadline.getTime())) {
      setMessage("Please enter a valid deadline.");
      return;
    }

    setCreatingAssignment(true);

    const { error } = await supabase.from("assignments").insert({
      course_id: selectedCourse,
      teacher_id: userId,
      title: assignmentTitle.trim(),
      description: assignmentDescription.trim() || null,
      due_at: deadline.toISOString(),
    });

    setCreatingAssignment(false);

    if (error) {
      setMessage("Could not create assignment: " + error.message);
      return;
    }

    setAssignmentTitle("");
    setAssignmentDescription("");
    setAssignmentDeadline("");
    setMessage("Assignment created successfully.");
    await loadAssignments();
  }

  async function saveAttendance() {
    setMessage("");

    if (!selectedCourse || !attendanceDate || students.length === 0) {
      setMessage("Select a course with enrolled students first.");
      return;
    }

    if (students.some((student) => !attendance[student.id])) {
      setMessage("Mark every student Present or Absent before saving.");
      return;
    }

    setSaving(true);

    const rows = students.map((student) => ({
      student_id: student.id,
      course_id: selectedCourse,
      class_date: attendanceDate,
      status: attendance[student.id],
    }));

    const { error } = await supabase.from("attendance").upsert(rows, {
      onConflict: "student_id,course_id,class_date",
    });

    setSaving(false);

    if (error) {
      setMessage("Could not save attendance: " + error.message);
      return;
    }

    setMessage("Attendance saved successfully.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function formatDeadline(value: string | null) {
    if (!value) return "No deadline set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Invalid deadline";

    return date.toLocaleString();
  }

  if (loading) {
    return <main className="p-8">Loading teacher portal...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Teacher Portal</h1>
          <p className="mt-1 text-gray-600">
            Manage courses, enrollments, attendance, and assignments.
          </p>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border px-4 py-2"
        >
          Sign out
        </button>
      </header>

      {message && (
        <p className="rounded-lg border p-3 text-sm" role="status">
          {message}
        </p>
      )}

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">Create a course</h2>
        <form onSubmit={createCourse} className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border p-3"
            placeholder="Course name"
            value={courseName}
            onChange={(event) => setCourseName(event.target.value)}
            required
          />
          <input
            className="rounded-lg border p-3"
            placeholder="Course code (e.g. CSE101)"
            value={courseCode}
            onChange={(event) => setCourseCode(event.target.value)}
            required
          />
          <button className="rounded-lg bg-blue-600 p-3 text-white">
            Create course
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">Enroll a student</h2>
        <p className="text-sm text-gray-600">
          Enter the student's profile UUID from Supabase. The student must
          already have an account.
        </p>
        <form
          onSubmit={enrollStudent}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <select
            className="rounded-lg border p-3"
            value={selectedCourse}
            onChange={(event) => setSelectedCourse(event.target.value)}
            required
            disabled={courses.length === 0}
          >
            {courses.length === 0 && <option value="">No courses yet</option>}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name} ({course.course_code})
              </option>
            ))}
          </select>
          <input
            className="min-w-0 flex-1 rounded-lg border p-3"
            placeholder="Student profile UUID"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            required
          />
          <button
            disabled={courses.length === 0}
            className="rounded-lg bg-blue-600 p-3 text-white disabled:opacity-50"
          >
            Enroll student
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">Create an assignment</h2>
        <p className="text-sm text-gray-600">
          Assign work to a course. Enrolled students can see its details and
          deadline in their Student Portal.
        </p>

        {courses.length === 0 ? (
          <p className="text-gray-600">
            Create a course before adding an assignment.
          </p>
        ) : (
          <form onSubmit={createAssignment} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Course</span>
              <select
                className="w-full rounded-lg border p-3"
                value={selectedCourse}
                onChange={(event) => setSelectedCourse(event.target.value)}
                required
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.course_code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Assignment title</span>
              <input
                className="w-full rounded-lg border p-3"
                placeholder="e.g. Database Normalization Exercise"
                value={assignmentTitle}
                onChange={(event) => setAssignmentTitle(event.target.value)}
                required
                maxLength={200}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">
                Instructions / description
              </span>
              <textarea
                className="min-h-28 w-full rounded-lg border p-3"
                placeholder="Explain what students need to complete..."
                value={assignmentDescription}
                onChange={(event) =>
                  setAssignmentDescription(event.target.value)
                }
                rows={4}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Deadline</span>
              <input
                type="datetime-local"
                className="w-full rounded-lg border p-3"
                value={assignmentDeadline}
                onChange={(event) => setAssignmentDeadline(event.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              disabled={creatingAssignment}
              className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
            >
              {creatingAssignment ? "Creating..." : "Create assignment"}
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Assignments for selected course</h2>
          <button
            type="button"
            onClick={() => void loadAssignments()}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Refresh
          </button>
        </div>

        {!selectedCourse ? (
          <p className="text-gray-600">Create or select a course first.</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-600">
            No assignments found for this course yet.
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const isOverdue =
                assignment.due_at !== null &&
                new Date(assignment.due_at).getTime() < Date.now();

              return (
                <article
                  key={assignment.id}
                  className="space-y-2 rounded-lg border p-4"
                >
                  <h3 className="font-semibold">{assignment.title}</h3>
                  {assignment.description && (
                    <p className="whitespace-pre-wrap text-sm text-gray-700">
                      {assignment.description}
                    </p>
                  )}
                  <p className="text-sm">
                    Deadline: {formatDeadline(assignment.due_at)}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      isOverdue ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {assignment.due_at
                      ? isOverdue
                        ? "Deadline passed"
                        : "Upcoming deadline"
                      : "No deadline"}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">Mark attendance</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="block text-sm font-medium">Course</span>
            <select
              className="w-full rounded-lg border p-3"
              value={selectedCourse}
              onChange={(event) => setSelectedCourse(event.target.value)}
              disabled={courses.length === 0}
            >
              {courses.length === 0 && <option value="">No courses yet</option>}
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.course_code})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-sm font-medium">Attendance date</span>
            <input
              type="date"
              className="w-full rounded-lg border p-3"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
              required
            />
          </label>
        </div>

        {students.length === 0 ? (
          <p className="text-gray-600">
            No enrolled students found for this course.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {student.full_name || "Unnamed student"}
                    </p>
                    <p className="text-xs text-gray-500">{student.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAttendance((current) => ({
                          ...current,
                          [student.id]: "present",
                        }))
                      }
                      className={`rounded-lg border px-4 py-2 ${
                        attendance[student.id] === "present"
                          ? "bg-green-600 text-white"
                          : ""
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAttendance((current) => ({
                          ...current,
                          [student.id]: "absent",
                        }))
                      }
                      className={`rounded-lg border px-4 py-2 ${
                        attendance[student.id] === "absent"
                          ? "bg-red-600 text-white"
                          : ""
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={saveAttendance}
              className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
