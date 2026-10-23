
import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ role?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const role = params.role === "teacher" ? "teacher" : "student";

  return <LoginForm role={role} />;
}
