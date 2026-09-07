import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { getEnv } from '../lib/context';

// The key lives in the per-request env, not process.env, so both the client and
// the "is it configured" check are resolved at call time rather than at import.
const apiKey = (): string => getEnv().ANTHROPIC_API_KEY || '';

export const hasApiKey = (): boolean => apiKey().length > 10;

const client = (): Anthropic => new Anthropic({ apiKey: apiKey() });

// Shared system prompt cached at API level for efficiency
const SYSTEM_PROMPT = `You are an expert B2B sales intelligence AI. You analyze company data and generate actionable sales insights. Always respond with valid JSON only — no markdown, no explanation text, just the raw JSON object.`;

async function askClaude(userPrompt: string): Promise<any> {
  const msg = await client().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  // Strip markdown code fences if present
  const clean = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  return JSON.parse(clean);
}

// ─── Lead Intent Scoring ────────────────────────────────────────────────────

export const scoreLeadIntent = async (
  companyData: {
    companyName: string;
    industry?: string | null;
    city?: string | null;
    website?: string | null;
    source?: string | null;
    techStack?: string | null;
    employeeSize?: string | null;
  },
  /** Org-specific ICP instructions from Organization.aiQualificationPrompt. */
  qualificationPrompt?: string | null
) => {
  if (!hasApiKey()) {
    const score = Math.floor(Math.random() * 40) + 60;
    return {
      intentScore: score,
      icpScore: Math.floor(Math.random() * 30) + 65,
      urgency: Math.floor(Math.random() * 40) + 55,
      budgetScore: Math.floor(Math.random() * 35) + 60,
      reasons: [
        `${companyData.companyName} matches your ICP profile strongly.`,
        `Growth signals detected in ${companyData.city || 'the target region'}.`,
        `${companyData.industry || 'Industry'} shows high software adoption rate.`,
      ],
      recommendation:
        score > 80
          ? 'Send personalized demo invite immediately.'
          : 'Add to nurture sequence, follow up in 3 days.',
    };
  }

  const icpSection = qualificationPrompt?.trim()
    ? `\nApply these organisation-specific qualification criteria when scoring:\n${qualificationPrompt.trim()}\n`
    : '';

  const prompt = `Analyze this company for B2B SaaS sales potential and return a JSON scoring object.
${icpSection}
Company Data:
${JSON.stringify(companyData, null, 2)}

Return exactly this JSON structure:
{
  "intentScore": <number 1-100, overall buying intent>,
  "icpScore": <number 1-100, ideal customer profile match>,
  "urgency": <number 1-100, how urgently they need a solution>,
  "budgetScore": <number 1-100, estimated budget availability>,
  "reasons": [<3 specific reasons based on their industry and city>],
  "recommendation": <one concrete next sales action>
}`;

  try {
    return await askClaude(prompt);
  } catch (err) {
    console.error('Claude scoring error:', err);
    throw new Error('AI scoring failed');
  }
};

// ─── AI Lead Scoring WITH Behavioral Data ────────────────────────────────────
// This enriches scoring by pulling in Activity, Message, Deal, Task data for
// a holistic view of lead engagement — not just static company attributes.

export interface BehavioralContext {
  totalActivities: number;
  emailsSent: number;
  emailOpens: number;
  replies: number;
  activeDeals: number;
  openDealValue: number;
  wonDeals: number;
  openTasks: number;
  overdueTasks: number;
  daysSinceLastActivity: number | null;
  daysSinceCreated: number;
}

/**
 * Collect the engagement signals we hold for a lead. Activity/Message are scoped
 * through the lead relation (they carry no organizationId of their own), so the
 * org check happens on the Lead row and the nested `lead: { organizationId }`
 * filter — never trust leadId alone.
 */
export const collectLeadBehavior = async (
  leadId: string,
  orgId: string
): Promise<BehavioralContext | null> => {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: orgId },
    select: { id: true, createdAt: true }
  });
  if (!lead) return null;

  const now = Date.now();
  const DAY_MS = 86_400_000;

  const [activities, messages, deals, tasks] = await Promise.all([
    prisma.activity.findMany({
      where: { leadId, lead: { organizationId: orgId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { type: true, createdAt: true }
    }),
    prisma.message.findMany({
      where: { leadId, lead: { organizationId: orgId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { direction: true, status: true }
    }),
    prisma.deal.findMany({
      where: { leadId, organizationId: orgId },
      select: { status: true, value: true }
    }),
    prisma.task.findMany({
      where: { leadId, organizationId: orgId, status: { not: 'completed' } },
      select: { dueDate: true }
    })
  ]);

  const outbound = messages.filter((m) => m.direction === 'outbound');
  const openDeals = deals.filter((d) => d.status === 'open');

  return {
    totalActivities: activities.length,
    emailsSent: outbound.filter((m) => m.status === 'sent' || m.status === 'opened').length,
    // 'opened' is terminal in the pixel handler, so it also counts as delivered.
    emailOpens: messages.filter((m) => m.status === 'opened').length,
    replies: messages.filter((m) => m.direction === 'inbound').length,
    activeDeals: openDeals.length,
    openDealValue: openDeals.reduce((sum, d) => sum + d.value, 0),
    wonDeals: deals.filter((d) => d.status === 'won').length,
    openTasks: tasks.length,
    overdueTasks: tasks.filter((t) => t.dueDate && t.dueDate.getTime() < now).length,
    daysSinceLastActivity: activities.length
      ? Math.floor((now - activities[0].createdAt.getTime()) / DAY_MS)
      : null,
    daysSinceCreated: Math.floor((now - lead.createdAt.getTime()) / DAY_MS)
  };
};

/**
 * Turn engagement counts into a deterministic −20…+30 adjustment plus the
 * human-readable reasons behind it. Kept out of the LLM on purpose: these are
 * facts we hold, so they should score the same way every run.
 */
export const applyBehavioralSignals = (
  baseIntent: number,
  b: BehavioralContext
): { intentScore: number; reasons: string[] } => {
  let delta = 0;
  const reasons: string[] = [];

  if (b.replies > 0) {
    delta += 20;
    reasons.push(`Replied ${b.replies} time${b.replies > 1 ? 's' : ''} — direct interest confirmed.`);
  }
  if (b.emailOpens >= 3) {
    delta += 10;
    reasons.push(`Opened ${b.emailOpens} emails — consistently engaging with outreach.`);
  } else if (b.emailOpens > 0) {
    delta += 5;
    reasons.push(`Opened ${b.emailOpens} email${b.emailOpens > 1 ? 's' : ''}.`);
  } else if (b.emailsSent >= 3) {
    delta -= 10;
    reasons.push(`${b.emailsSent} emails sent with no opens — not engaging.`);
  }

  if (b.activeDeals > 0) {
    delta += 10;
    reasons.push(`${b.activeDeals} open deal${b.activeDeals > 1 ? 's' : ''} worth ${Math.round(b.openDealValue).toLocaleString()}.`);
  }
  if (b.wonDeals > 0) {
    delta += 5;
    reasons.push(`Existing customer — ${b.wonDeals} deal${b.wonDeals > 1 ? 's' : ''} already won.`);
  }
  if (b.overdueTasks > 0) {
    reasons.push(`${b.overdueTasks} overdue task${b.overdueTasks > 1 ? 's' : ''} on this lead — follow-up is slipping.`);
  }

  if (b.daysSinceLastActivity === null && b.daysSinceCreated > 14) {
    delta -= 10;
    reasons.push(`No activity in ${b.daysSinceCreated} days since the lead was created.`);
  } else if (b.daysSinceLastActivity !== null && b.daysSinceLastActivity > 30) {
    delta -= 15;
    reasons.push(`Silent for ${b.daysSinceLastActivity} days — going cold.`);
  } else if (b.daysSinceLastActivity !== null && b.daysSinceLastActivity <= 3 && b.totalActivities >= 3) {
    delta += 5;
    reasons.push('Active in the last few days — momentum is live.');
  }

  const clampedDelta = Math.max(-20, Math.min(30, delta));
  return {
    intentScore: Math.max(1, Math.min(100, Math.round(baseIntent + clampedDelta))),
    reasons
  };
};

// ─── Outreach Generation ────────────────────────────────────────────────────

export const generateOutreach = async (
  leadData: {
    companyName: string;
    industry?: string | null;
    city?: string | null;
    contactName?: string | null;
    intentScore?: number | null;
    website?: string | null;
  },
  channel: 'email' | 'linkedin' | 'sms',
  templateType?: string
) => {
  if (!hasApiKey()) {
    const name = leadData.contactName ? ` ${leadData.contactName}` : '';
    const templates: Record<string, { subject: string; body: string }> = {
      email: {
        subject: `Quick question for ${leadData.companyName}`,
        body: `Hi${name},\n\nI noticed ${leadData.companyName} is scaling fast in the ${leadData.industry || 'industry'} space${leadData.city ? ' in ' + leadData.city : ''}.\n\nWe've helped similar companies automate their lead generation and CRM workflows, cutting the sales cycle by 40%.\n\nWould a 15-minute call this week make sense?\n\nBest regards,\n[Your Name]`,
      },
      linkedin: {
        subject: '',
        body: `Hi${name}, I came across ${leadData.companyName} and was impressed by what you're building in ${leadData.industry || 'the industry'}. We help companies like yours streamline their sales pipeline with AI. Would love to connect!`,
      },
      sms: {
        subject: '',
        body: `Hi${name}, [Your Name] here from [Company]. We help ${leadData.industry || 'businesses'} like ${leadData.companyName} automate their sales. Interested in a quick 10-min call? Reply YES to schedule.`,
      },
    };
    return templates[channel] ?? templates.email;
  }

  const channelGuidance: Record<string, string> = {
    email: 'Write a cold sales email with subject line. Keep it under 120 words, conversational, no fluff.',
    linkedin: 'Write a LinkedIn connection request note. Max 2 sentences, professional.',
    sms: 'Write an SMS pitch. Max 1 sentence + call to action.',
  };

  const prompt = `Generate a personalized ${channel} outreach message for this prospect.

Lead Info:
${JSON.stringify(leadData, null, 2)}

Channel guidance: ${channelGuidance[channel]}
Template type: ${templateType || 'cold_outreach'}

Return exactly this JSON:
{
  "subject": "<email subject line, empty string for non-email channels>",
  "body": "<the message text>"
}`;

  try {
    return await askClaude(prompt);
  } catch (err) {
    console.error('Claude outreach error:', err);
    throw new Error('AI outreach generation failed');
  }
};

// ─── AI Lead Generator ──────────────────────────────────────────────────────

export interface GeneratedLead {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  city: string;
  country: string;
  employeeSize: string;
  source: string;
  notes: string;
}

export const generateLeads = async (params: {
  industry: string;
  city: string;
  country?: string;
  count?: number;
  employeeSize?: string;
  keywords?: string;
}): Promise<GeneratedLead[]> => {
  const count = Math.min(params.count || 10, 20);
  const country = params.country || 'India';

  if (!hasApiKey()) {
    // Rich mock leads based on industry
    const mockLeads = buildMockLeads(params.industry, params.city, country, count);
    return mockLeads;
  }

  const prompt = `Generate ${count} realistic B2B company leads for sales prospecting.

Target Criteria:
- Industry: ${params.industry}
- City: ${params.city}, ${country}
- Employee Size: ${params.employeeSize || 'any'}
- Keywords/Focus: ${params.keywords || 'digital transformation, software adoption'}

Generate companies that would realistically benefit from a B2B SaaS / CRM / automation solution.
Make names, emails, phones, and websites realistic and consistent with ${params.city}, ${country}.
Use realistic Indian phone formats (+91-XXXXXXXXXX) if country is India.
Generate different decision maker names (CEO, Founder, MD, Director).

Return exactly this JSON structure:
{
  "leads": [
    {
      "companyName": "<real sounding company name>",
      "contactName": "<decision maker full name>",
      "email": "<realistic email based on company name>",
      "phone": "<realistic phone number>",
      "website": "<realistic website URL>",
      "industry": "${params.industry}",
      "city": "${params.city}",
      "country": "${country}",
      "employeeSize": "<10-50 or 50-200 or 200-500>",
      "source": "ai_generated",
      "notes": "<1 sentence about their likely pain point or software need>"
    }
  ]
}`;

  try {
    const result = await askClaude(prompt);
    return result.leads || [];
  } catch (err) {
    console.error('Claude lead gen error:', err);
    // Fallback to mock on error
    return buildMockLeads(params.industry, params.city, country, count);
  }
};

// ─── Sequence Generator ─────────────────────────────────────────────────────

export const generateSequence = async (leadData: object, days: number = 7) => {
  if (!hasApiKey()) {
    return [
      { day: 1, channel: 'email', type: 'intro', subject: 'Quick question', content: 'Day 1 intro email...' },
      { day: 3, channel: 'email', type: 'case_study', subject: 'How similar companies saved 40% time', content: 'Day 3 case study follow-up...' },
      { day: 5, channel: 'linkedin', type: 'followup', subject: '', content: 'Following up on my email — worth a quick chat?' },
      { day: 7, channel: 'email', type: 'breakup', subject: 'Last attempt', content: 'I understand if the timing is off...' },
    ];
  }

  const prompt = `Generate a ${days}-day outreach sequence for this prospect.
Lead: ${JSON.stringify(leadData)}

Return JSON:
{
  "sequence": [
    { "day": 1, "channel": "email", "type": "intro", "subject": "...", "content": "..." }
  ]
}`;

  try {
    const result = await askClaude(prompt);
    return result.sequence || result.steps || [];
  } catch (err) {
    console.error('Claude sequence error:', err);
    return [];
  }
};

// ─── Mock Lead Builder (runs when no API key) ────────────────────────────────

function buildMockLeads(industry: string, city: string, country: string, count: number): GeneratedLead[] {
  const templates: Record<string, Array<Partial<GeneratedLead>>> = {
    Healthcare: [
      { companyName: 'CityHealth Clinic', contactName: 'Dr. Rajesh Sharma', employeeSize: '10-50', notes: 'Uses manual appointment book, needs digital CRM.' },
      { companyName: 'MediCare Hospital', contactName: 'Dr. Priya Nair', employeeSize: '50-200', notes: 'Old HMS system, looking to upgrade.' },
      { companyName: 'Sunrise Diagnostics', contactName: 'Amit Verma', employeeSize: '10-50', notes: 'Manual report delivery, needs patient follow-up automation.' },
      { companyName: 'Apollo Wellness Center', contactName: 'Dr. Sunita Patel', employeeSize: '10-50', notes: 'No patient follow-up system in place.' },
      { companyName: 'LifeCare Multi-Specialty', contactName: 'Dr. Vikram Singh', employeeSize: '50-200', notes: 'Paper-based billing, looking for ERP.' },
    ],
    Restaurant: [
      { companyName: 'Spice Garden Restaurant', contactName: 'Rahul Mehta', employeeSize: '10-50', notes: 'No online ordering, losing delivery revenue.' },
      { companyName: 'Biryani House', contactName: 'Salim Khan', employeeSize: '10-50', notes: 'No QR menu, manual order taking.' },
      { companyName: 'The Curry Club', contactName: 'Anjali Gupta', employeeSize: '10-50', notes: 'No loyalty program or CRM for repeat customers.' },
      { companyName: 'Dine Express', contactName: 'Suresh Reddy', employeeSize: '10-50', notes: 'Needs table management and POS system.' },
    ],
    Logistics: [
      { companyName: 'FastMove Logistics', contactName: 'Arun Kumar', employeeSize: '50-200', notes: 'Manual tracking, no real-time GPS dashboard.' },
      { companyName: 'ShipRight Services', contactName: 'Deepak Joshi', employeeSize: '10-50', notes: 'Uses spreadsheets for fleet management.' },
      { companyName: 'CargoLink India', contactName: 'Pradeep Yadav', employeeSize: '50-200', notes: 'No WMS, needs warehouse automation.' },
    ],
    Education: [
      { companyName: 'BrightFuture Academy', contactName: 'Neha Sharma', employeeSize: '10-50', notes: 'Manual fee collection and attendance system.' },
      { companyName: 'LearnSmart Institute', contactName: 'Vijay Patel', employeeSize: '10-50', notes: 'No ERP, uses Excel for student management.' },
      { companyName: 'TechSkills Training', contactName: 'Ritu Gupta', employeeSize: '10-50', notes: 'Needs online course delivery platform.' },
    ],
    Technology: [
      { companyName: 'Innovate Tech Solutions', contactName: 'Karan Malhotra', employeeSize: '10-50', notes: 'Growing fast, needs CRM to manage pipeline.' },
      { companyName: 'CloudBase Systems', contactName: 'Rohit Saxena', employeeSize: '50-200', notes: 'No formal lead management process.' },
      { companyName: 'DataEdge Analytics', contactName: 'Sneha Iyer', employeeSize: '10-50', notes: 'Uses manual spreadsheets for client tracking.' },
    ],
  };

  const base = templates[industry] || templates['Technology'];
  const leads: GeneratedLead[] = [];

  for (let i = 0; i < count; i++) {
    const t = base[i % base.length];
    const slug = (t.companyName || 'company').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const firstName = (t.contactName || 'Contact').split(' ').pop()!.toLowerCase();
    leads.push({
      companyName: t.companyName || `${industry} Company ${i + 1}`,
      contactName: t.contactName || `Contact ${i + 1}`,
      email: `${firstName}@${slug}.com`,
      phone: `+91-${Math.floor(7000000000 + Math.random() * 2999999999)}`,
      website: `https://www.${slug}.com`,
      industry,
      city,
      country,
      employeeSize: t.employeeSize || '10-50',
      source: 'ai_generated',
      notes: t.notes || `Potential ${industry.toLowerCase()} client in ${city}.`,
    });
  }

  return leads;
}
