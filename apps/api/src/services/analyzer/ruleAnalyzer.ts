import type { AnalyzerMessage, LeadAnalysisResult, LeadStatusValue } from "./types.js";

const highSignals = [
  "ready",
  "stok",
  "stock",
  "bisa kirim",
  "ongkir",
  "invoice",
  "rekening",
  "transfer",
  "dp",
  "booking",
  "alamat",
  "kapan dikirim",
  "saya ambil",
  "deal",
  "cocok",
  "pesan satu",
  "minta nomor rekening",
  "surat penawaran",
  "po",
  "purchase order"
];

const mediumSignals = [
  "harga",
  "price",
  "berapa",
  "spek",
  "ukuran",
  "garansi",
  "merek",
  "bisa kurang",
  "diskon",
  "ada video",
  "ada foto",
  "cocok untuk",
  "tersedia dimana",
  "lokasi"
];

const lowSignals = [
  "nanti saya kabari",
  "saya pikir dulu",
  "masih survey",
  "bandingkan dulu",
  "belum butuh",
  "tanya dulu"
];

const optOutSignals = [
  "tidak jadi",
  "tidak minat",
  "jangan hubungi",
  "stop",
  "mahal sekali",
  "sudah beli",
  "nanti saja",
  "batal",
  "jangan chat dulu",
  "tidak usah",
  "unsubscribe"
];

const priceSignals = ["mahal", "mahal sekali", "bisa kurang", "diskon", "kemahalan"];
const approvalSignals = ["diskusi dulu", "tanya dulu", "dengan bos", "approval", "minta persetujuan"];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function findSignals(text: string, signals: string[]) {
  const normalized = text.toLowerCase();
  return signals.filter((signal) => normalized.includes(signal));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function countTrailingSalesMessages(messages: AnalyzerMessage[]) {
  let count = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (!messages[index]?.isFromMe) break;
    count += 1;
  }
  return count;
}

function extractMatches(text: string, regex: RegExp) {
  return unique(Array.from(text.matchAll(regex)).map((match) => match[0]));
}

export function analyzeWithRules(messages: AnalyzerMessage[], consentStatus = "UNKNOWN"): LeadAnalysisResult {
  const safeMessages = messages.filter((message) => message.text.trim()).slice(-100);
  const customerText = safeMessages
    .filter((message) => !message.isFromMe)
    .map((message) => message.text)
    .join("\n");
  const allText = safeMessages.map((message) => message.text).join("\n");
  const lastMessage = safeMessages.at(-1);

  const high = unique(findSignals(customerText, highSignals));
  const medium = unique(findSignals(customerText, mediumSignals));
  const low = unique(findSignals(customerText, lowSignals));
  const optOut = unique(findSignals(customerText, optOutSignals));
  const priceObjections = unique(findSignals(customerText, priceSignals));
  const approvalNeeded = unique(findSignals(customerText, approvalSignals));
  const trailingSalesMessages = countTrailingSalesMessages(safeMessages);

  const spamRiskScore = clamp(optOut.length * 45 + Math.max(0, trailingSalesMessages - 2) * 25);
  const buyingIntentScore = clamp(high.length * 22 + medium.length * 9 - low.length * 10);
  const interestScore = clamp(high.length * 16 + medium.length * 12 + low.length * 4);
  const urgencyScore = clamp(high.some((signal) => ["invoice", "rekening", "transfer", "alamat", "po"].includes(signal)) ? 90 : high.length * 18);
  const budgetFitScore = clamp(priceObjections.length ? 45 : medium.includes("harga") ? 65 : buyingIntentScore);
  const sentimentScore = clamp(optOut.length ? 15 : priceObjections.length ? 45 : 70 + high.length * 4);
  const replyPriorityScore = clamp((buyingIntentScore + urgencyScore) / 2 - spamRiskScore / 3);
  const productMatchScore = clamp(medium.includes("spek") || medium.includes("ukuran") || medium.includes("merek") ? 70 : high.length ? 75 : 35);

  let leadStatus: LeadStatusValue = "COLD";
  let decisionStage = "inquiry";
  let followUpTiming = "no_follow_up";
  let nextBestAction = "edukasi produk dulu";
  let reason = "Belum ada sinyal minat beli yang kuat.";
  let doNotContactReason: string | null = null;

  if (optOut.length || consentStatus === "OPTED_OUT") {
    leadStatus = "DO_NOT_CONTACT_YET";
    decisionStage = "lost";
    followUpTiming = "do_not_contact";
    nextBestAction = "jangan chat dulu";
    reason = "Customer menunjukkan sinyal opt-out atau tidak ingin dihubungi.";
    doNotContactReason = optOut.join(", ") || "Contact opted out";
  } else if (high.some((signal) => ["invoice", "rekening", "transfer", "alamat", "po", "purchase order"].includes(signal))) {
    leadStatus = "HOT_NOW";
    decisionStage = "invoice_requested";
    followUpTiming = "now";
    nextBestAction = "kirim invoice atau detail pembayaran untuk disetujui manusia";
    reason = "Customer menunjukkan niat transaksi tinggi.";
  } else if (approvalNeeded.length) {
    leadStatus = "FOLLOW_UP_TOMORROW";
    decisionStage = "approval_needed";
    followUpTiming = "tomorrow";
    nextBestAction = "follow-up besok dengan nada ringan";
    reason = "Customer perlu diskusi atau persetujuan pihak lain.";
  } else if (priceObjections.length) {
    leadStatus = "PRICE_OBJECTION";
    decisionStage = "negotiation";
    followUpTiming = "today";
    nextBestAction = "jelaskan value, garansi, atau opsi paket";
    reason = "Ada keberatan harga yang perlu ditangani.";
  } else if (lastMessage?.isFromMe) {
    leadStatus = trailingSalesMessages > 3 ? "DO_NOT_CONTACT_YET" : "WAITING_CUSTOMER";
    decisionStage = "inquiry";
    followUpTiming = trailingSalesMessages > 3 ? "cooldown" : "wait_customer_reply";
    nextBestAction = trailingSalesMessages > 3 ? "jangan chat dulu" : "tunggu customer balas";
    reason = "Pesan terakhir dari sales, jadi sistem tidak mendorong follow-up agresif.";
  } else if (buyingIntentScore >= 60) {
    leadStatus = "FOLLOW_UP_TODAY";
    decisionStage = "price_checking";
    followUpTiming = "today";
    nextBestAction = "follow-up hari ini";
    reason = "Ada sinyal minat yang cukup kuat dari customer.";
  } else if (interestScore >= 35) {
    leadStatus = "NURTURE";
    decisionStage = "awareness";
    followUpTiming = "three_days";
    nextBestAction = "edukasi produk dulu";
    reason = "Customer masih eksplorasi dan perlu informasi tambahan.";
  }

  const overallScore = clamp(
    (interestScore + buyingIntentScore + urgencyScore + budgetFitScore + productMatchScore + sentimentScore + replyPriorityScore) / 7 -
      spamRiskScore * 0.35
  );

  const prices = extractMatches(allText, /\b(?:rp\s?)?\d{2,3}(?:[.,]\d{3})+(?:,\d{2})?\b/gi);
  const quantities = extractMatches(allText, /\b\d+\s?(?:pcs|unit|buah|box|lusin)\b/gi);
  const timeSignals = extractMatches(allText, /\b(?:hari ini|besok|lusa|minggu depan|bulan ini|sekarang|nanti)\b/gi);

  return {
    leadStatus,
    overallScore,
    scores: {
      interestScore,
      buyingIntentScore,
      urgencyScore,
      budgetFitScore,
      productMatchScore,
      sentimentScore,
      replyPriorityScore,
      spamRiskScore
    },
    detected: {
      products: [],
      prices,
      locations: [],
      quantities,
      timeSignals,
      objections: unique([...priceObjections.map(() => "PRICE"), ...approvalNeeded.map(() => "APPROVAL_NEEDED")]),
      buyingSignals: unique([...high, ...medium, ...low]),
      negativeSignals: unique([...low, ...optOut]),
      optOutSignals: optOut,
      decisionMakers: approvalNeeded
    },
    decisionStage,
    recommendation: {
      nextBestAction,
      followUpTiming,
      reason,
      doNotContactReason,
      suggestedReply:
        leadStatus === "DO_NOT_CONTACT_YET"
          ? ""
          : "Baik, terima kasih. Saya bantu rangkum opsinya dulu ya, nanti Bapak/Ibu bisa cek tanpa terburu-buru."
    },
    summary: {
      shortSummary: safeMessages.length ? "Percakapan dianalisa dari pesan terbaru yang tersimpan di MySQL." : "Belum ada pesan untuk dianalisa.",
      customerNeed: high.length || medium.length ? "Customer sedang mencari informasi produk atau transaksi." : "Kebutuhan customer belum jelas.",
      salesOpportunity: leadStatus === "HOT_NOW" ? "Peluang transaksi tinggi dan perlu ditangani segera." : "Perlu follow-up yang tetap menghormati konteks.",
      risk: doNotContactReason ?? (spamRiskScore > 60 ? "Risiko spam tinggi karena terlalu banyak pesan sales." : "Risiko rendah.")
    }
  };
}
