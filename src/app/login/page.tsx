import { loginAction } from "@/app/actions";
import Icon from "@/components/Icon";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="auth">
      <form action={loginAction} className="card">
        <span className="logo"><Icon name="check" size={26} /></span>
        <div className="intro">
          <h1>Sign in to Confirm It</h1>
          <p className="sub">Confirm orders on WhatsApp, automatically.</p>
        </div>
        {error && (
          <div className="callout bad" style={{ padding: "10px 12px" }}>
            <Icon name="alert" /> Wrong password. Try again.
          </div>
        )}
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" name="password" autoFocus required autoComplete="current-password" />
        </div>
        <button className="btn primary lg block">Sign in</button>
      </form>
      <div className="foot"><Icon name="lock" size={14} /> Your dashboard is private to your store.</div>
    </div>
  );
}
