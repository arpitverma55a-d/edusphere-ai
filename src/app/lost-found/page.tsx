
"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

type LostFoundItem = {
  id: string;
  reported_by: string;
  title: string;
  description: string | null;
  item_type: string;
  location: string | null;
  created_at: string;
};

export default function LostFoundPage() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState("lost");
  const [location, setLocation] = useState("");

  const supabase = createClient();

  async function loadItems() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("lost_found_items")
      .select(
        "id, reported_by, title, description, item_type, location, created_at"
      )
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems((data ?? []) as LostFoundItem[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadItems();
    // Load reports when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Please enter the item name.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Please sign in before reporting an item.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("lost_found_items")
      .insert({
        reported_by: user.id,
        title: cleanTitle,
        description: description.trim() || null,
        item_type: itemType,
        location: location.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setTitle("");
    setDescription("");
    setLocation("");
    setItemType("lost");
    setNotice("Your report was submitted successfully!");

    await loadItems();
    setSubmitting(false);
  }

  const filteredItems = items.filter((item) => {
    const matchesType =
      filter === "all" ||
      item.item_type.toLowerCase() === filter;

    const searchableText =
      `${item.title} ${item.description ?? ""} ${item.location ?? ""}`.toLowerCase();

    return matchesType && searchableText.includes(search.toLowerCase().trim());
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              EduSphere AI
            </p>
            <h1 className="mt-2 text-3xl font-bold">Lost & Found Portal</h1>
            <p className="mt-2 text-slate-500">
              Help campus belongings find their way home.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-slate-200 px-4 py-2 font-medium hover:bg-slate-50"
          >
            ← Home
          </a>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Report an item</h2>
            <p className="mt-1 text-sm text-slate-500">
              Share enough details to help someone identify the item.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="item-type" className="mb-2 block text-sm font-medium">
                  Report type
                </label>
                <select
                  id="item-type"
                  value={itemType}
                  onChange={(event) => setItemType(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                >
                  <option value="lost">I lost something</option>
                  <option value="found">I found something</option>
                </select>
              </div>

              <div>
                <label htmlFor="item-title" className="mb-2 block text-sm font-medium">
                  Item name *
                </label>
                <input
                  id="item-title"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Blue water bottle"
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="item-description" className="mb-2 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="item-description"
                  rows={4}
                  maxLength={2000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Color, brand, identifying details..."
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="item-location" className="mb-2 block text-sm font-medium">
                  Campus location
                </label>
                <input
                  id="item-location"
                  maxLength={200}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="e.g. Library, second floor"
                  className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                />
              </div>

              {error && (
                <p role="alert" className="break-words rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              {notice && (
                <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit report"}
              </button>
            </form>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">Campus reports</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search recent lost and found items.
              </p>

              <label htmlFor="search-items" className="sr-only">
                Search items
              </label>
              <input
                id="search-items"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search item, description, or location..."
                className="mt-4 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All reports" },
                  { value: "lost", label: "Lost" },
                  { value: "found", label: "Found" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    aria-pressed={filter === option.value}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      filter === option.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            {loading ? (
              <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
                Loading reports...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-3xl">🔎</p>
                <h3 className="mt-3 font-semibold">No reports found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try another search or submit the first report.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                          item.item_type.toLowerCase() === "found"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.item_type}
                      </span>
                    </div>

                    {item.description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    )}

                    {item.location && (
                      <p className="mt-3 text-sm text-slate-600">
                        📍 {item.location}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-slate-400">
                      Reported {new Date(item.created_at).toLocaleString()}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="pb-4 text-center text-xs text-slate-400">
          Please coordinate through your college's official channels when
          collecting valuable or sensitive belongings.
        </footer>
      </div>
    </main>
  );
}
