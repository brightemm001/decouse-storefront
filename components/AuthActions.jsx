"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, KeyRound } from "lucide-react";

function ActionShell({ title, intro, children }) {
  return <div className="auth-action-page page-wrap"><Link className="back-link" href="/login"><ArrowLeft size={14}/> Back to login</Link><section className="auth-action-card"><span className="auth-action-icon"><KeyRound size={20}/></span><p className="eyebrow">Account security</p><h1>{title}</h1><p>{intro}</p>{children}</section></div>;
}

export function VerifyEmailPage() {
  const [state, setState] = useState({ busy: true, error: "", ok: false });
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) { setState({ busy: false, error: "Verification link is missing.", ok: false }); return; }
    fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setState({ busy: false, error: "", ok: true }); })
      .catch((error) => setState({ busy: false, error: error.message || "Could not verify this email.", ok: false }));
  }, []);
  return <ActionShell title={state.busy ? "Checking your link…" : state.ok ? "Email verified." : "Email not verified."} intro={state.busy ? "Please wait while we confirm this link." : state.ok ? "Your account is ready. Sign in to continue." : state.error}>{state.ok && <Check size={18}/>}<Link className="button button-dark" href="/login">Go to login <ArrowRight size={15}/></Link></ActionShell>;
}

export function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(""); setNotice(""); setPreviewUrl(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not request a reset link.");
      setNotice(data.message || "If an account exists, a reset link will be sent."); setPreviewUrl(data.previewUrl || "");
    } catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }
  return <ActionShell title="Reset your password." intro="Enter your account email. The response does not reveal whether an account exists."><form className="auth-form" onSubmit={submit}><label className="form-field"><span>Email address</span><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)}/></label>{notice && <p className="auth-success" role="status">{notice}</p>}{error && <p className="auth-error" role="alert">{error}</p>}{previewUrl && <p className="auth-verification-link"><Link href={previewUrl}>Open local reset link <ArrowRight size={14}/></Link></p>}<button className="button button-dark button-full" disabled={busy}>{busy ? "Sending…" : "Request reset link"}</button></form></ActionShell>;
}

export function PasswordResetConfirmPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/password-reset/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reset this password.");
      setNotice("Password updated. Sign in with your new password.");
    } catch (caught) { setError(caught.message || "Could not reset this password."); }
    finally { setBusy(false); }
  }
  return <ActionShell title="Choose a new password." intro="Use at least 12 characters. Reset links expire after 30 minutes."><form className="auth-form" onSubmit={submit}><label className="form-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)}/></label>{notice && <p className="auth-success" role="status">{notice}</p>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-dark button-full" disabled={busy || !token || Boolean(notice)}>{busy ? "Saving…" : "Update password"}</button>{notice && <Link className="text-link" href="/login">Go to login <ArrowRight size={14}/></Link>}</form></ActionShell>;
}
