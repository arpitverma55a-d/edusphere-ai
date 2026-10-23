"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";

type Announcement = {
id: string;
title: string;
body: string;
category: string;
priority: string;
audience: string;
course_id: string | null;
author_id: string;
published: boolean;
created_at: string;
expires_at: string | null;
};

type Course = {
id: string;
title: string;
};

type Profile = {
id: string;
role: string;
full_name: string | null;
};

type ReadRecord = {
announcement_id: string;
};

const categories = ["general", "academic", "event", "urgent", "assignment"];
const priorities = ["low", "normal", "high", "urgent"];

export default function AnnouncementsPage() {
const [supabase] = useState(() => createClient());
const [profile, setProfile] = useState<Profile | null>(null);
const [announcements, setAnnouncements] = useState<Announcement[]>([]);
const [courses, setCourses] = useState<Course[]>([]);
const [readIds, setReadIds] = useState<string[]>([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [message, setMessage] = useState("");
const [showForm, setShowForm] = useState(false);

const [title, setTitle] = useState("");
const [body, setBody] = useState("");
const [category, setCategory] = useState("general");
const [priority, setPriority] = useState("normal");
const [audience, setAudience] = useState("all");
const [courseId, setCourseId] = useState("");
const [expiresAt, setExpiresAt] = useState("");

const canPublish =
profile?.role === "admin" || profile?.role === "teacher";

const loadData = useCallback(async () => {
setLoading(true);
setMessage("");

const { data: authData, error: authError } =
  await supabase.auth.getUser();

if (authError || !authData.user) {
  window.location.href = "/login";
  return;
}

const user = authData.user;

const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("id, role, full_name")
  .eq("id", user.id)
  .single();

if (profileError || !profileData) {
  setMessage("Unable to load your profile. Please sign in again.");
  setLoading(false);
  return;
}

setProfile(profileData as Profile);

const { data: announcementData, error: announcementError } =
  await supabase
    .from("announcements")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

if (announcementError) {
  setMessage(`Could not load announcements: ${announcementError.message}`);
  setLoading(false);
  return;
}

setAnnouncements((announcementData ?? []) as Announcement[]);

const { data: readData } = await supabase
  .from("announcement_reads")
  .select("announcement_id")
  .eq("user_id", user.id);

setReadIds(
  ((readData ?? []) as ReadRecord[]).map(
    (record) => record.announcement_id
  )
);

if (profileData.role === "teacher") {
  const { data: courseData } = await supabase
    .from("courses")
    .select("id, title")
    .eq("teacher_id", user.id)
    .order("title");

  setCourses((courseData ?? []) as Course[]);
  setAudience("course");
}

setLoading(false);

}, [supabase]);

useEffect(() => {
void loadData();
}, [loadData]);

async function publishAnnouncement(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
if (!profile) return;

setSaving(true);
setMessage("");

const selectedAudience =
  profile.role === "teacher" ? "course" : audience;

if (selectedAudience === "course" && !courseId) {
  setMessage("Please select a course.");
  setSaving(false);
  return;
}

const { error } = await supabase.from("announcements").insert({
  title: title.trim(),
  body: body.trim(),
  category,
  priority,
  audience: selectedAudience,
  course_id: selectedAudience === "course" ? courseId : null,
  author_id: profile.id,
  published: true,
  expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
});

if (error) {
  setMessage(`Could not publish: ${error.message}`);
  setSaving(false);
  return;
}

setTitle("");
setBody("");
setCategory("general");
setPriority("normal");
setAudience(profile.role === "teacher" ? "course" : "all");
setCourseId("");
setExpiresAt("");
setShowForm(false);
setMessage("Announcement published successfully.");
setSaving(false);
await loadData();

}

async function markAsRead(announcementId: string) {
if (!profile || readIds.includes(announcementId)) return;

const { error } = await supabase.from("announcement_reads").insert({
  announcement_id: announcementId,
  user_id: profile.id,
});

if (error) {
  setMessage(
    error.code === "23505"
      ? "This announcement is already marked as read."
      : `Could not mark as read: ${error.message}`
  );

  if (error.code === "23505") {
    setReadIds((current) => [...current, announcementId]);
  }
  return;
}

setReadIds((current) => [...current, announcementId]);

}

async function updatePublication(
announcementId: string,
published: boolean
) {
const { error } = await supabase
.from("announcements")
.update({ published })
.eq("id", announcementId);

if (error) {
  setMessage(`Could not update announcement: ${error.message}`);
  return;
}

setMessage(published ? "Announcement published." : "Announcement unpublished.");
await loadData();

}

async function deleteAnnouncement(announcementId: string) {
if (!window.confirm("Permanently delete this announcement?")) return;

const { error } = await supabase
  .from("announcements")
  .delete()
  .eq("id", announcementId);

if (error) {
  setMessage(`Could not delete announcement: ${error.message}`);
  return;
}

setMessage("Announcement deleted.");
await loadData();

}

const visibleAnnouncements = announcements.filter((announcement) => {
if (
announcement.expires_at &&
new Date(announcement.expires_at).getTime() <= Date.now()
) {
return false;
}

return true;

});

if (loading) {
return (
<main className="min-h-screen bg-slate-50 p-8 text-slate-700">
Loading announcements...
</main>
);
}

if (!profile) {
return (
<main className="min-h-screen bg-slate-50 p-8 text-slate-700">
{message || "Profile unavailable."}
</main>
);
}

return (
<main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
<div className="mx-auto max-w-5xl">
<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
<div>
<Link
href={
profile.role === "admin"
? "/admin"
: profile.role === "teacher"
? "/teacher"
: "/student"
}
className="text-sm font-medium text-blue-700 hover"
>
← Back to portal
</Link>

        <h1 className="mt-3 text-3xl font-bold">
          Announcements & Notifications
        </h1>

        <p className="mt-2 text-slate-600">
          Welcome, {profile.full_name || "User"}. Stay up to date with
          college announcements.
        </p>
      </div>

      {canPublish && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          {showForm ? "Cancel" : "+ New Announcement"}
        </button>
      )}
    </div>

    {message && (
      <div
        role="status"
        className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
      >
        {message}
      </div>
    )}

    {showForm && canPublish && (
      <form
        onSubmit={publishAnnouncement}
        className="mb-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-xl font-bold">Create announcement</h2>

        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="e.g. Mid-semester examination schedule"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Message</label>
          <textarea
            required
            maxLength={10000}
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Write the announcement details..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {profile.role === "admin" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Audience</label>
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Everyone</option>
              <option value="students">Students only</option>
              <option value="teachers">Teachers only</option>
              <option value="course">Specific course</option>
            </select>
          </div>
        )}

        {profile.role === "teacher" && (
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            This announcement will be shared with students enrolled in one
            of your courses.
          </p>
        )}

        {(profile.role === "teacher" || audience === "course") && (
          <div>
            <label className="mb-1 block text-sm font-medium">Course</label>
            <select
              required
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="mt-1 text-sm text-amber-700">
                No courses found. Create or assign a course first.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">
            Optional expiry date
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Publishing..." : "Publish announcement"}
        </button>
      </form>
    )}

    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">Latest announcements</h2>
      <p className="text-sm text-slate-500">
        {visibleAnnouncements.length} announcement
        {visibleAnnouncements.length === 1 ? "" : "s"}
      </p>
    </div>

    {visibleAnnouncements.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-lg font-semibold">No announcements yet</p>
        <p className="mt-2 text-slate-600">
          Published announcements for your account will appear here.
        </p>
      </div>
    ) : (
      <div className="space-y-5">
        {visibleAnnouncements.map((announcement) => {
          const isRead = readIds.includes(announcement.id);
          const isAuthor = announcement.author_id === profile.id;
          const canManage =
            profile.role === "admin" ||
            (profile.role === "teacher" && isAuthor);

          return (
            <article
              key={announcement.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                isRead ? "border-slate-200" : "border-blue-300"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
                    {announcement.category}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                      announcement.priority === "urgent"
                        ? "bg-red-100 text-red-800"
                        : announcement.priority === "high"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {announcement.priority} priority
                  </span>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                    {announcement.audience === "all"
                      ? "Everyone"
                      : announcement.audience === "course"
                        ? "Course"
                        : announcement.audience}
                  </span>
                </div>

                <span
                  className={`text-xs font-semibold ${
                    isRead ? "text-slate-500" : "text-blue-700"
                  }`}
                >
                  {isRead ? "✓ Read" : "● Unread"}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold">
                {announcement.title}
              </h3>

              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
                {announcement.body}
              </p>

              <p className="mt-4 text-xs text-slate-500">
                Published{" "}
                {new Date(announcement.created_at).toLocaleString()}
                {announcement.expires_at &&
                  ` · Expires ${new Date(
                    announcement.expires_at
                  ).toLocaleString()}`}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {!isRead && (
                  <button
                    onClick={() => void markAsRead(announcement.id)}
                    className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Mark as read
                  </button>
                )}

                {canManage && (
                  <>
                    <button
                      onClick={() =>
                        void updatePublication(announcement.id, false)
                      }
                      className="rounded-lg border border-amber-600 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      Unpublish
                    </button>

                    {profile.role === "admin" && (
                      <button
                        onClick={() =>
                          void deleteAnnouncement(announcement.id)
                        }
                        className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    )}
  </div>
</main>

);
}