type ContactLike = {
  phone?: string | null;
  pushName?: string | null;
  name?: string | null;
  waJid?: string | null;
};

export function getCustomerNumber(contact?: ContactLike | null, fallback?: string | null) {
  return contact?.phone || normalizeJid(contact?.waJid) || normalizeJid(fallback) || fallback || "Unknown";
}

export function getCustomerName(contact?: ContactLike | null, fallback?: string | null) {
  const name = contact?.pushName || contact?.name || fallback;
  return name && name !== getCustomerNumber(contact, fallback) ? name : null;
}

function normalizeJid(value?: string | null) {
  if (!value) return null;
  return value.split("@")[0]?.replace(/\D/g, "") || null;
}
