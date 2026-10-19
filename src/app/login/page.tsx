import { loginAction } from "@/app/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form action={loginAction} className="card" style={{ width: 340, textAlign: "center" }}>
        <div style={{ fontSize: 30 }}>✅</div>
        <h1>Confirm It</h1>
        <p className="sub">Sign in to your dashboard</p>
        {error && <p style={{ color: "#b91c1c", fontSize: 13 }}>Wrong password, try again.</p>}
        <input type="password" name="password" placeholder="Password" autoFocus />
        <button className="btn green" style={{ width: "100%", marginTop: 14 }}>Sign In</button>
      </form>
    </div>
  );
}
