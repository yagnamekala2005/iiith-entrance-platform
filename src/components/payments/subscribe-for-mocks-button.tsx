"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubscriptionPlan {
  id: string;
  name: string;
  price_paise: number;
  duration_months: number;
  display_order: number;
}

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string; amount: number; currency: string; name: string; description: string;
      order_id: string; prefill?: { email?: string }; theme: { color: string };
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void | Promise<void>;
      modal?: { ondismiss?: () => void };
    }) => { open: () => void };
  }
}

async function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.dataset.razorpayCheckout = "true";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function SubscribeForMocksButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showPlans, setShowPlans] = useState(false);

  async function openPlans() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/payments/subscription-plans", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load subscription plans.");
      if (!Array.isArray(data.plans) || data.plans.length === 0) {
        throw new Error("No subscription plans are available right now. Please contact the administrator.");
      }
      setPlans(data.plans);
      setShowPlans(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load subscription plans.");
    } finally {
      setBusy(false);
    }
  }

  async function payForPlan(plan: SubscriptionPlan) {
    setBusy(true);
    setMessage("");
    try {
      if (!(await loadCheckout()) || !window.Razorpay) throw new Error("Could not load Razorpay Checkout.");
      const response = await fetch("/api/payments/create-subscription-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start subscription payment.");
      if (data.alreadySubscribed) {
        setMessage("Your subscription is already active until " + new Date(data.expiresAt).toLocaleDateString() + ".");
        router.refresh();
        return;
      }
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "IIITH Prep",
        description: (data.planName || plan.name) + " · all mock tests",
        order_id: data.orderId,
        prefill: { email: data.studentEmail },
        theme: { color: "#1d4ed8" },
        handler: async (payment) => {
          try {
            const verifyResponse = await fetch("/api/payments/verify-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payment),
            });
            const verified = await verifyResponse.json();
            if (!verifyResponse.ok || !verified.verified) throw new Error(verified.error || "Payment verification failed.");
            setMessage("Subscription active until " + new Date(verified.expiresAt).toLocaleDateString() + ".");
            router.refresh();
            window.location.assign("/tests?subscription=active");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Payment verification failed. Contact support before paying again.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start payment.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={openPlans} disabled={busy}
        className={compact
          ? "rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          : "rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"}>
        {busy ? "Loading plans…" : compact ? "Unlock all mocks · View plans" : "View subscription plans"}
      </button>
      {showPlans && (
        <div className="w-full min-w-[220px] rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Choose a plan</p>
            <button type="button" onClick={() => setShowPlans(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">Close</button>
          </div>
          <div className="space-y-2">
            {plans.map((plan) => (
              <button key={plan.id} type="button" onClick={() => payForPlan(plan)} disabled={busy}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50">
                <span>
                  <span className="block text-sm font-bold text-slate-900">{plan.name}</span>
                  <span className="block text-xs text-slate-500">{plan.duration_months} {plan.duration_months === 1 ? "month" : "months"} · all mock tests</span>
                </span>
                <span className="shrink-0 text-sm font-extrabold text-blue-800">₹{(plan.price_paise / 100).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {message && <p role="status" className="max-w-md text-xs text-slate-700">{message}</p>}
    </div>
  );
}
