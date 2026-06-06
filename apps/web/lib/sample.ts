export const sampleChats = [
  {
    id: 1,
    name: "PT Sumber Jaya",
    contact: { pushName: "Rina Procurement", phone: "62812****44", consentStatus: "UNKNOWN", doNotContact: false },
    lead: { status: "HOT_NOW", overallScore: 91, nextBestAction: "kirim invoice" },
    messages: [{ id: 1, text: "Bisa kirim invoice hari ini? Kami mau proses PO.", isFromMe: false, timestamp: new Date().toISOString() }]
  },
  {
    id: 2,
    name: "Ardi Retail",
    contact: { pushName: "Ardi", phone: "62822****11", consentStatus: "UNKNOWN", doNotContact: false },
    lead: { status: "PRICE_OBJECTION", overallScore: 68, nextBestAction: "jelaskan value dan garansi" },
    messages: [{ id: 2, text: "Harganya masih bisa kurang? Saya bandingkan dulu.", isFromMe: false, timestamp: new Date().toISOString() }]
  },
  {
    id: 3,
    name: "Dewi Homeware",
    contact: { pushName: "Dewi", phone: "62857****90", consentStatus: "OPTED_OUT", doNotContact: true },
    lead: { status: "DO_NOT_CONTACT_YET", overallScore: 12, nextBestAction: "jangan chat dulu" },
    messages: [{ id: 3, text: "Nanti saja ya, jangan hubungi dulu.", isFromMe: false, timestamp: new Date().toISOString() }]
  }
];

export const sampleLeads = sampleChats.map((chat, index) => ({
  id: index + 1,
  contact: chat.contact,
  chat,
  status: chat.lead.status,
  overallScore: chat.lead.overallScore,
  spamRiskScore: chat.lead.status === "DO_NOT_CONTACT_YET" ? 96 : index * 18,
  nextBestAction: chat.lead.nextBestAction,
  followUpAt: index === 0 ? new Date().toISOString() : null,
  summary: JSON.stringify({
    shortSummary: chat.messages[0].text,
    customerNeed: "Customer membutuhkan tindak lanjut yang relevan.",
    salesOpportunity: "Prioritaskan dengan human approval.",
    risk: chat.contact.doNotContact ? "Opt-out terdeteksi." : "Risiko rendah."
  })
}));

export const pipelineColumns = [
  "HOT_NOW",
  "FOLLOW_UP_TODAY",
  "FOLLOW_UP_TOMORROW",
  "NURTURE",
  "WAITING_CUSTOMER",
  "DO_NOT_CONTACT_YET",
  "WON",
  "LOST"
];
