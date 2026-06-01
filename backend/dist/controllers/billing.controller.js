"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsage = exports.handleWebhook = exports.createCheckoutSession = exports.getSubscription = exports.getPlans = void 0;
const prisma_1 = require("../lib/prisma");
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
const getPlans = async (_req, res) => {
    res.status(200).json(PLANS);
};
exports.getPlans = getPlans;
const getSubscription = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const [org, subscription] = await Promise.all([
            prisma_1.prisma.organization.findUnique({
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
            prisma_1.prisma.subscription.findFirst({
                where: { organizationId: orgId },
                orderBy: { createdAt: 'desc' }
            })
        ]);
        if (!org)
            return res.status(404).json({ error: 'Organization not found' });
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
    }
    catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSubscription = getSubscription;
const createCheckoutSession = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { plan } = req.body;
        const planData = PLANS.find((p) => p.id === plan);
        if (!planData || planData.price === 0) {
            return res.status(400).json({ error: 'Invalid plan' });
        }
        if (!process.env.STRIPE_SECRET_KEY) {
            // Mock checkout response for development
            return res.status(200).json({
                sessionId: `mock_session_${Date.now()}`,
                url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/success?plan=${plan}&mock=true`,
                plan: planData.name,
                price: planData.price,
                note: 'Set STRIPE_SECRET_KEY to enable real checkout'
            });
        }
        // Real Stripe integration
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const org = await prisma_1.prisma.organization.findUnique({ where: { id: orgId } });
        let customerId = org?.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({ metadata: { orgId } });
            customerId = customer.id;
            await prisma_1.prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } });
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
    }
    catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createCheckoutSession = createCheckoutSession;
const handleWebhook = async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        if (!process.env.STRIPE_SECRET_KEY || !sig) {
            return res.status(400).json({ error: 'Stripe not configured' });
        }
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        }
        catch {
            return res.status(400).json({ error: 'Webhook signature verification failed' });
        }
        const session = event.data.object;
        switch (event.type) {
            case 'checkout.session.completed': {
                const orgId = session.metadata?.orgId;
                const plan = session.metadata?.plan;
                if (orgId && plan) {
                    const planData = PLANS.find((p) => p.id === plan);
                    await prisma_1.prisma.subscription.upsert({
                        where: { stripeSubId: session.subscription },
                        create: {
                            organizationId: orgId,
                            stripeSubId: session.subscription,
                            plan,
                            status: 'active',
                            leadLimit: planData?.leadLimit || 100,
                            aiLimit: planData?.aiLimit || 50,
                            emailLimit: planData?.emailLimit || 500,
                            waLimit: planData?.waLimit || 100,
                            seatLimit: planData?.seatLimit || 2
                        },
                        update: { plan, status: 'active' }
                    });
                    await prisma_1.prisma.organization.update({
                        where: { id: orgId },
                        data: { subscription: plan }
                    });
                }
                break;
            }
            case 'customer.subscription.deleted': {
                await prisma_1.prisma.subscription.updateMany({
                    where: { stripeSubId: session.id },
                    data: { status: 'canceled' }
                });
                break;
            }
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.handleWebhook = handleWebhook;
const getUsage = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const logs = await prisma_1.prisma.usageLog.groupBy({
            by: ['type'],
            where: { organizationId: orgId, createdAt: { gte: monthStart } },
            _sum: { amount: true }
        });
        const usage = {};
        for (const log of logs) {
            usage[log.type] = log._sum.amount || 0;
        }
        res.status(200).json({
            period: { start: monthStart.toISOString(), end: now.toISOString() },
            usage
        });
    }
    catch (error) {
        console.error('Get usage error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getUsage = getUsage;
