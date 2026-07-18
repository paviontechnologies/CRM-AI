import { Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

let stripeClient: Stripe | null = null;

/** Lazily construct the Stripe client so the app boots fine without billing configured. */
const getStripe = (): Stripe | null => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    leadLimit: 100,
    aiLimit: 50,
    emailLimit: 500,
    waLimit: 100,
    seatLimit: 2,
    features: ['100 leads/month', '50 AI credits', '500 emails', 'Basic pipeline', '2 seats']
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    leadLimit: 1000,
    aiLimit: 500,
    emailLimit: 5000,
    waLimit: 1000,
    seatLimit: 5,
    features: ['1,000 leads/month', '500 AI credits', '5,000 emails', 'Advanced pipeline', '5 seats', 'CSV import']
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || 'price_growth',
    leadLimit: 5000,
    aiLimit: 2000,
    emailLimit: 25000,
    waLimit: 5000,
    seatLimit: 15,
    features: ['5,000 leads/month', '2,000 AI credits', '25,000 emails', 'WhatsApp outreach', '15 seats', 'API access', 'Webhooks']
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 399,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID || 'price_agency',
    leadLimit: -1,
    aiLimit: -1,
    emailLimit: -1,
    waLimit: -1,
    seatLimit: -1,
    features: ['Unlimited leads', 'Unlimited AI credits', 'Unlimited emails', 'Unlimited WhatsApp', 'Unlimited seats', 'White-label', 'Priority support']
  }
];

export const getPlans = async (_req: AuthRequest, res: Response) => {
  res.status(200).json(PLANS);
};

export const getSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;

    const [org, subscription] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          subscription: true,
          planCredits: true,
          usedLeadCredits: true,
          usedAiCredits: true,
          usedEmailCredits: true,
          usedWaCredits: true
        }
      }),
      prisma.subscription.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const plan = PLANS.find((p) => p.id === (subscription?.plan || 'free')) || PLANS[0];

    res.status(200).json({
      plan: subscription?.plan || 'free',
      status: subscription?.status || 'active',
      currentPeriodEnd: subscription?.currentPeriodEnd,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      limits: {
        leads: plan.leadLimit,
        ai: plan.aiLimit,
        email: plan.emailLimit,
        whatsapp: plan.waLimit,
        seats: plan.seatLimit
      },
      usage: {
        leads: org.usedLeadCredits,
        ai: org.usedAiCredits,
        email: org.usedEmailCredits,
        whatsapp: org.usedWaCredits
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { plan } = req.body;

    const planData = PLANS.find((p) => p.id === plan);
    if (!planData || planData.price === 0 || !planData.priceId) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const stripe = getStripe();
    if (!stripe) {
      // Mock checkout response for development
      return res.status(200).json({
        sessionId: `mock_session_${Date.now()}`,
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/success?plan=${plan}&mock=true`,
        plan: planData.name,
        price: planData.price,
        note: 'Set STRIPE_SECRET_KEY to enable real checkout'
      });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    let customerId = org?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { orgId } });
      customerId = customer.id;
      await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: planData.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing`,
      metadata: { orgId, plan }
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];
    const stripe = getStripe();
    if (!stripe || !sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    // Set by the express.json verify hook in index.ts — the parsed body would fail
    // signature verification because it is no longer byte-identical.
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      console.error('Stripe webhook: raw body missing');
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata?.orgId;
        const plan = session.metadata?.plan;
        const subId = typeof session.subscription === 'string' ? session.subscription : null;

        if (orgId && plan && subId) {
          const planData = PLANS.find((p) => p.id === plan);
          await prisma.subscription.upsert({
            where: { stripeSubId: subId },
            create: {
              organizationId: orgId,
              stripeSubId: subId,
              plan,
              status: 'active',
              leadLimit: planData?.leadLimit ?? 100,
              aiLimit: planData?.aiLimit ?? 50,
              emailLimit: planData?.emailLimit ?? 500,
              waLimit: planData?.waLimit ?? 100,
              seatLimit: planData?.seatLimit ?? 2
            },
            update: { plan, status: 'active' }
          });
          await prisma.organization.update({
            where: { id: orgId },
            data: { subscription: plan }
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: {
            status: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            ...(sub.items.data[0]?.current_period_end && {
              currentPeriodEnd: new Date(sub.items.data[0].current_period_end * 1000)
            })
          }
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: 'canceled' }
        });
        // Drop the org back to free so limits reapply immediately.
        const record = await prisma.subscription.findUnique({ where: { stripeSubId: sub.id } });
        if (record) {
          await prisma.organization.update({
            where: { id: record.organizationId },
            data: { subscription: 'free' }
          });
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsage = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const logs = await prisma.usageLog.groupBy({
      by: ['type'],
      where: { organizationId: orgId, createdAt: { gte: monthStart } },
      _sum: { amount: true }
    });

    const usage: Record<string, number> = {};
    for (const log of logs) {
      usage[log.type] = log._sum.amount || 0;
    }

    res.status(200).json({
      period: { start: monthStart.toISOString(), end: now.toISOString() },
      usage
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
