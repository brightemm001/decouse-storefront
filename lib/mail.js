import "server-only";

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendLink(email, subject, url) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== "production") return { delivered: false, previewUrl: url };
    throw new Error("Email delivery is not configured.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject, text: `${subject}\n\n${url}\n\nIf you did not request this, ignore this email.` }),
  });
  if (!response.ok) throw new Error("Email delivery failed.");
  return { delivered: true };
}
