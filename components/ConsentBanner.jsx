"use client";

import { useEffect, useState } from "react";
import { Check, Cookie, Settings2, X } from "lucide-react";
import { clearPersonalizationData, getPrivacyConsent, PRIVACY_CONSENT_KEY } from "../lib/privacy";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [manage, setManage] = useState(false);
  const [personalization, setPersonalization] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const consent = getPrivacyConsent();
    setVisible(!consent);
    setPersonalization(consent?.personalization === true);
    const open = () => { setManage(true); setVisible(true); setSaved(false); };
    window.addEventListener("decouse:open-consent", open);
    return () => window.removeEventListener("decouse:open-consent", open);
  }, []);

  function save(allowPersonalization) {
    const consent = { necessary: true, personalization: allowPersonalization, analytics: false, updatedAt: new Date().toISOString() };
    try { window.localStorage.setItem(PRIVACY_CONSENT_KEY, JSON.stringify(consent)); } catch { /* Consent state is optional when storage is unavailable. */ }
    if (!allowPersonalization) clearPersonalizationData();
    window.dispatchEvent(new CustomEvent("decouse:consent-updated"));
    setPersonalization(allowPersonalization);
    setSaved(true);
    setVisible(false);
  }

  if (!visible) return null;
  return <section className="consent-banner" role="dialog" aria-modal="false" aria-labelledby="consent-title" aria-describedby="consent-description">
    <div className="consent-icon"><Cookie size={18}/></div>
    <div className="consent-copy"><p className="eyebrow">Privacy choices</p><h2 id="consent-title">Your choices, your call.</h2><p id="consent-description">This preview uses essential browser storage for your bag. Optional personalisation can remember searches and recently viewed pieces on this device. No analytics, advertising tracking or third-party embeds are enabled. Signed-in accounts use an essential session cookie.</p>
      {manage && <label className="consent-toggle"><input type="checkbox" checked={personalization} onChange={(event) => setPersonalization(event.target.checked)}/><span>Allow optional personalisation on this device</span></label>}
      <small>Essential shop storage is always on. <a href="/privacy">Privacy policy</a> · <a href="/cookies">Cookie policy</a></small>
      {saved && <small role="status">Your privacy choice has been saved.</small>}
    </div>
    <div className="consent-actions"><button className="button button-outline" onClick={() => save(false)}>Essential only</button>{manage ? <button className="button button-dark" onClick={() => save(personalization)}><Check size={14}/> Save choices</button> : <button className="button button-outline" onClick={() => setManage(true)}><Settings2 size={14}/> Manage</button>}<button className="button button-dark" onClick={() => save(true)}>Allow personalisation</button></div>
    <button className="consent-dismiss icon-button" aria-label="Close privacy choices" onClick={() => save(false)}><X size={17}/></button>
  </section>;
}
