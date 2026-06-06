export const leadStatuses = [
  "HOT_NOW",
  "FOLLOW_UP_TODAY",
  "FOLLOW_UP_TOMORROW",
  "NURTURE",
  "PRICE_OBJECTION",
  "WAITING_CUSTOMER",
  "DO_NOT_CONTACT_YET",
  "COLD",
  "WON",
  "LOST"
] as const;

export type LeadStatusValue = (typeof leadStatuses)[number];

export type AnalyzerMessage = {
  text: string;
  isFromMe: boolean;
  timestamp: Date;
  senderName?: string | null;
};

export type LeadAnalysisResult = {
  leadStatus: LeadStatusValue;
  overallScore: number;
  scores: {
    interestScore: number;
    buyingIntentScore: number;
    urgencyScore: number;
    budgetFitScore: number;
    productMatchScore: number;
    sentimentScore: number;
    replyPriorityScore: number;
    spamRiskScore: number;
  };
  detected: {
    products: string[];
    prices: string[];
    locations: string[];
    quantities: string[];
    timeSignals: string[];
    objections: string[];
    buyingSignals: string[];
    negativeSignals: string[];
    optOutSignals: string[];
    decisionMakers: string[];
  };
  decisionStage: string;
  recommendation: {
    nextBestAction: string;
    followUpTiming: string;
    reason: string;
    doNotContactReason: string | null;
    suggestedReply: string;
  };
  summary: {
    shortSummary: string;
    customerNeed: string;
    salesOpportunity: string;
    risk: string;
  };
};
