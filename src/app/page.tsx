
import Link from "next/link";

const features = [
  {
    title: "Student Portal",
    description: "View marks, attendance, and assignments.",
    href: "/login",
  },
  {
    title: "Teacher Portal",
    description: "Manage classes, attendance, and assignments.",
    href: "/login?role=teacher",
  },
  {
    title: "AI Helpdesk",
    description: "Get help with college-related questions.",
    href: "/helpdesk",
  },
  {
    title: "Lost & Found",
    description: "Report or find missing belongings.",
    href: "/lost-found",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="font-semibold tracking-widest text-cyan-400">
          EDUSPHERE AI
        </p>

        <h1 className="mt-5 text-4xl font-bold md:text-6xl">
          Your campus, <span className="text-cyan-400">smarter.</span>
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          One cloud-based platform for student support, academic
          performance, attendance, assignments, and campus services.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-6 transition hover:border-cyan-400"
            >
              <h2 className="text-xl font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm text-slate-300">
                {feature.description}
              </p>
              <p className="mt-6 text-cyan-400">Explore →</p>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-sm text-slate-500">
          EduSphere AI · Intelligent College Management
        </p>
      </div>
    </main>
  );
}
