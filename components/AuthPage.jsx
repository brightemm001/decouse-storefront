"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

export default function AuthPage({ mode = "login" }) {
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError(""); setNotice(""); setVerificationUrl(""); setBusy(true);
    try {
      const response = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, termsAccepted }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      if (isSignup) { setNotice(data.message || "Check your inbox to verify your address."); setVerificationUrl(data.previewUrl || ""); }
      else if (data.requiresOtp) { setChallengeToken(data.challengeToken); setNotice("Enter the six-digit code from your administrator authenticator."); }
      else { routeAfterLogin(); }
    } catch (caught) { setError(caught.message || "Could not sign in."); }
    finally { setBusy(false); }
  }

  async function verifyOtp(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeToken, code: otp }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The code was not accepted.");
      routeAfterLogin();
    } catch (caught) { setError(caught.message || "The code was not accepted."); }
    finally { setBusy(false); }
  }

  function routeAfterLogin() {
    const next = new URLSearchParams(window.location.search).get("next") || "/account";
    window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  }

  return <div className="auth-page"><section className="auth-visual"><Link className="brand-mark" href="/">Decouse<span>®</span></Link><div className="auth-visual-copy"><p className="eyebrow">A wardrobe that feels like you</p><h1>Good style is a little more personal.</h1><p>Keep saved pieces close, follow your orders and find an edit shaped around what you love.</p></div><img src="/images/hero-green-suit.webp" alt="Model in a tailored forest-green suit"/><span className="auth-visual-foot">THE DECOUSE EDIT · STORE PREVIEW</span></section>
    <section className="auth-form-panel"><div className="auth-form-inner"><Link className="back-link" href="/"><ArrowLeft size={14}/> Back to Decouse</Link><div className="auth-heading"><p className="eyebrow">Your personal edit</p><h2>{isSignup ? "Create your account." : "Welcome back."}</h2><p>{isSignup ? "Create an account to save your pieces and see your orders." : "Log in to view your saved pieces and order history."}</p></div>
      {challengeToken ? <form className="auth-form" onSubmit={verifyOtp}><label className="form-field"><span>Administrator one-time code</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="000000"/></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-dark button-full auth-submit" disabled={busy}>{busy ? "Verifying…" : "Verify code"} <ShieldCheck size={15}/></button></form> : <form className="auth-form" onSubmit={submit}>{isSignup && <div className="form-grid"><label className="form-field"><span>First name</span><input required autoComplete="given-name" maxLength={80} value={values.firstName} onChange={(event) => setValues({ ...values, firstName: event.target.value })} placeholder="First name"/></label><label className="form-field"><span>Last name</span><input autoComplete="family-name" maxLength={80} value={values.lastName} onChange={(event) => setValues({ ...values, lastName: event.target.value })} placeholder="Last name"/></label></div>}<label className="form-field"><span>Email address</span><input type="email" required autoComplete="email" maxLength={254} value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} placeholder="you@example.com"/></label><label className="form-field"><span>Password {isSignup ? <small>12 characters minimum</small> : <Link href="/password-reset">Forgot?</Link>}</span><span className="password-field"><input type={showPassword ? "text" : "password"} required autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 12 : undefined} maxLength={128} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} placeholder={isSignup ? "At least 12 characters" : "Your password"}/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>{isSignup && <label className="form-checkbox"><input type="checkbox" required checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)}/><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.</span></label>}{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-success" role="status">{notice}</p>}{verificationUrl && <p className="auth-verification-link"><Link href={verificationUrl}>Verify your email address <ArrowRight size={14}/></Link></p>}<button className="button button-dark button-full auth-submit" disabled={busy}>{busy ? "Please wait…" : isSignup ? "Create account" : "Log in"} <ArrowRight size={15}/></button><p className="auth-demo-note"><LockKeyhole size={13}/> Passwords are scrypt-hashed on the server. Login and signup attempts are rate-limited.</p></form>}
      <div className="auth-switch"><span>{isSignup ? "Already have an account?" : "New to Decouse?"}</span><Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Create an account"}</Link></div><div className="auth-trust"><span>✳</span><p>Order history and account details are private to your signed-in account.</p></div></div></section></div>;
}
