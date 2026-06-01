'use client';
import { useEffect, useState } from 'react';
import { Check, Zap, CreditCard, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  leadCredits: number;
  aiCredits: number;
  emailCredits: number;
  whatsappCredits?: number;
  features?: string[];
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd?: string;
}

interface Usage {
  leadCredits: { used: number; limit: number };
  aiCredits: { used: number; limit: number };
  emailCredits: { used: number; limit: number };
  whatsappCredits?: { used: number; limit: number };
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    leadCredits: 100,
    aiCredits: 50,
    emailCredits: 500,
    features: ['100 leads', '50 AI credits', '500 emails', 'Basic CRM pipeline', 'Community support'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    leadCredits: 1000,
    aiCredits: 500,
    emailCredits: 5000,
    features: ['1,000 leads', '500 AI credits', '5,000 emails', 'Full CRM pipeline', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    leadCredits: 5000,
    aiCredits: 2000,
    emailCredits: 20000,
    features: ['5,000 leads', '2,000 AI credits', '20,000 emails', 'Campaign automation', 'Priority support', 'Analytics'],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 399,
    leadCredits: 999999,
    aiCredits: 999999,
    emailCredits: 999999,
    features: ['Unlimited leads', 'Unlimited AI', 'Unlimited emails', 'White-label', 'Dedicated support', 'Custom integrations'],
  },
];

function UsageMeter({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isHigh = pct >= 80;
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className={`text-xs font-bold ${isHigh ? 'text-red-600' : 'text-gray-500'}`}>
          {used.toLocaleString()} / {limit >= 999999 ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${isHigh ? 'bg-red-500' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{pct}% used</span>
        {isHigh && (
          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Near limit
          </span>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/billing/plans').catch(() => ({ data: FALLBACK_PLANS })),
      api.get('/billing/subscription').catch(() => ({ data: { plan: 'free', status: 'active' } })),
      api.get('/billing/usage').catch(() => ({ data: null })),
    ]).then(([plansRes, subRes, usageRes]) => {
      if (plansRes.data && Array.isArray(plansRes.data)) setPlans(plansRes.data);
      setSubscription(subRes.data);
      setUsage(usageRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/billing/checkout', { planId });
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      } else if (res.data?.checkoutUrl) {
        window.open(res.data.checkoutUrl, '_blank');
      } else {
        setSuccess(`Checkout initiated for ${planId} plan. Check your email for payment link.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout. Please contact support.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const currentPlan = subscription?.plan?.toLowerCase() || 'free';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Plan Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white flex items-center justify-between">
        <div>
          <p className="text-blue-100 text-sm font-medium">Current Plan</p>
          <p className="text-2xl font-black mt-0.5 capitalize">{currentPlan}</p>
          {subscription?.status && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full mt-2 ${
              subscription.status === 'active' ? 'bg-green-400/20 text-green-100' : 'bg-yellow-400/20 text-yellow-100'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
              {subscription.status}
            </span>
          )}
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
          <CreditCard className="w-6 h-6" />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}

      {/* Usage Meters */}
      {usage && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Usage This Month</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <UsageMeter
              label="Lead Credits"
              used={usage.leadCredits?.used || 0}
              limit={usage.leadCredits?.limit || 100}
              color="bg-blue-500"
            />
            <UsageMeter
              label="AI Credits"
              used={usage.aiCredits?.used || 0}
              limit={usage.aiCredits?.limit || 50}
              color="bg-indigo-500"
            />
            <UsageMeter
              label="Email Credits"
              used={usage.emailCredits?.used || 0}
              limit={usage.emailCredits?.limit || 500}
              color="bg-emerald-500"
            />
            {usage.whatsappCredits && (
              <UsageMeter
                label="WhatsApp Credits"
                used={usage.whatsappCredits.used || 0}
                limit={usage.whatsappCredits.limit || 100}
                color="bg-green-500"
              />
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id || currentPlan === plan.name?.toLowerCase();
            const isPopular = plan.name?.toLowerCase() === 'growth';
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-5 transition-all ${
                  isCurrentPlan
                    ? 'border-blue-500 shadow-lg shadow-blue-100'
                    : isPopular
                    ? 'border-indigo-200 shadow-md'
                    : 'border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Current Plan
                  </div>
                )}
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-500">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-gray-900">${plan.price}</span>
                    <span className="text-sm text-gray-400">/month</span>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {plan.features ? (
                    plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        {plan.leadCredits >= 999999 ? 'Unlimited' : plan.leadCredits.toLocaleString()} leads
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        {plan.aiCredits >= 999999 ? 'Unlimited' : plan.aiCredits.toLocaleString()} AI credits
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        {plan.emailCredits >= 999999 ? 'Unlimited' : plan.emailCredits.toLocaleString()} emails
                      </div>
                    </>
                  )}
                </div>

                {isCurrentPlan ? (
                  <div className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold text-center">
                    Active Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={checkoutLoading === plan.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {checkoutLoading === plan.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Billing FAQ</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-800">Can I change plans anytime?</p>
            <p className="mt-1">Yes, you can upgrade or downgrade your plan at any time. Changes take effect on the next billing cycle.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">What happens when I reach my credit limit?</p>
            <p className="mt-1">You'll be notified when you reach 80% usage. You can upgrade your plan or purchase additional credits.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Do unused credits roll over?</p>
            <p className="mt-1">Credits reset monthly. Unused credits do not roll over to the next billing period.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
