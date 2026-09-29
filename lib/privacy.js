export const PRIVACY_CONSENT_KEY = "decouse:privacy-consent";

export function getPrivacyConsent() {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(PRIVACY_CONSENT_KEY) || "null");
    return value && value.necessary === true ? value : null;
  } catch {
    return null;
  }
}

export function hasPersonalizationConsent() {
  return getPrivacyConsent()?.personalization === true;
}

export function readPersonalList(key) {
  if (!hasPersonalizationConsent()) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function savePersonalListItem(key, item, limit = 10) {
  if (!hasPersonalizationConsent()) return;
  const current = readPersonalList(key).filter((entry) => entry !== item);
  try { window.localStorage.setItem(key, JSON.stringify([item, ...current].slice(0, limit))); } catch { /* Storage is optional. */ }
}

export function clearPersonalizationData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("decouse:searches");
    window.localStorage.removeItem("decouse:viewed");
  } catch { /* Storage is optional. */ }
  window.dispatchEvent(new CustomEvent("decouse:consent-updated"));
}

export function openPrivacySettings() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("decouse:open-consent"));
}
