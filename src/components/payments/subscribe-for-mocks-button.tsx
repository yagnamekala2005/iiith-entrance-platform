"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, registerPlugin } from "@capacitor/core";

interface SubscriptionPlan {
  id: string;
  name: string;
  price_paise: number;
  duration_months: number;
  display_order: number;
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface NativeRazorpayPlugin {
  openCheckout(options: { options: {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill?: { email?: string };
    theme: { color: string };
  } }): Promise<RazorpayPaymentResponse>;
}

const NativeRazorpay = registerPlugin<NativeRazorpayPlugin>("RazorpayNative");

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string; amount: number; currency: string; name: string; description: string;
      order_id: string; prefill?: { email?: string }; theme: { color: string };
      handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
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

export function SubscribeForMocksButton({
  compact = false,
  className = "",
  label,
}: {
  compact?: boolean;
  className?: string;
  label?: string;
}) {
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
        setBusy(false);
        return;
      }

      const verifyPayment = async (payment: RazorpayPaymentResponse) => {
        const verifyResponse = await fetch("/api/payments/verify-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment),
        });
        const verified = await verifyResponse.json();
        if (!verifyResponse.ok || !verified.verified) {
          throw new Error(verified.error || "Payment verification failed.");
        }
        setMessage("Subscription active until " + new Date(verified.expiresAt).toLocaleDateString() + ".");
        router.refresh();
        window.location.assign("/tests?subscription=active");
      };

      const checkoutOptions = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "IIITH Prep",
        description: (data.planName || plan.name) + " · all mock tests",
        order_id: data.orderId,
        prefill: { email: data.studentEmail },
        theme: { color: "#1d4ed8" },
      };

      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
        try {
          const payment = await NativeRazorpay.openCheckout({ options: checkoutOptions });
          await verifyPayment(payment);
        } catch (checkoutError) {
          // Razorpay can capture a UPI payment even if its native callback fails.
          // Check the server-verified subscription before showing a checkout error
          // or allowing the student to start another payment.
          let statusChecked = false;
          for (let attempt = 0; attempt < 4; attempt++) {
            if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
              const statusResponse = await fetch(
                "/api/payments/subscription-status?orderId=" + encodeURIComponent(data.orderId),
                { cache: "no-store" },
              );
              const status = await statusResponse.json();
              if (statusResponse.ok && status.status === "active") {
                setMessage("Payment received. Your subscription is active until " +
                  new Date(status.expiresAt).toLocaleDateString() + ".");
                router.refresh();
                window.location.assign("/tests?subscription=active");
                statusChecked = true;
                break;
              }
              if (statusResponse.ok && status.status === "pending") statusChecked = true;
            } catch {
              // Continue retrying briefly; don't start a second payment automatically.
            }
          }
          if (!statusChecked) {
            setMessage("We couldn't confirm the payment status. Don't pay again yet. Refresh your subscription status or contact support with your Razorpay payment/order ID.");
          } else {
            setMessage("Razorpay checkout did not return a payment confirmation. If money was deducted, don't pay again; wait a moment and check your subscription status.");
          }
        }
        return;
      }

      if (!(await loadCheckout()) || !window.Razorpay) {
        throw new Error("Could not load Razorpay Checkout.");
      }
      const checkout = new window.Razorpay({
        ...checkoutOptions,
        handler: async (payment) => {
          try {
            await verifyPayment(payment);
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
    <div className={`relative flex flex-col items-start ${className.includes("w-full") ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={openPlans}
        disabled={busy}
        className={
          className
            ? `flex items-center justify-center rounded-xl bg-[#2E3AE3] hover:bg-[#2029B8] font-bold text-xs text-white shadow-xs active:scale-95 disabled:opacity-60 transition-all ${className}`
            : compact
            ? "rounded-xl bg-[#2E3AE3] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#2029B8] disabled:opacity-60 transition-all"
            : "rounded-xl bg-[#2E3AE3] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#2029B8] disabled:opacity-60 transition-all"
        }
      >
        {busy ? "Loading…" : label || (compact ? "Unlock Mocks" : "View subscription plans")}
      </button>

      {/* Modal Dialog: Centered overlay ensuring pricing and plans are never clipped */}
      {showPlans && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowPlans(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🚀</span>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                    Choose a Plan
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Unlock all timed CBT entrance mock tests
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlans(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => payForPlan(plan)}
                  disabled={busy}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-slate-200/80 bg-white p-3.5 text-left hover:border-[#2E3AE3] hover:bg-[#EEF2FF]/60 active:scale-[0.99] transition-all shadow-2xs group disabled:opacity-50 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-900 group-hover:text-[#2E3AE3] transition-colors truncate">
                      {plan.name}
                    </span>
                    <span className="block text-xs text-slate-500 font-medium mt-0.5">
                      {plan.duration_months} {plan.duration_months === 1 ? "month" : "months"} · All Mocks
                    </span>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className="block text-base font-black text-[#2E3AE3] tracking-tight">
                      ₹{(plan.price_paise / 100).toFixed(0)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Total
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {message && (
              <p role="status" className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-semibold text-center">
                {message}
              </p>
            )}

            <p className="text-[10px] text-slate-400 text-center font-medium">
              🔒 Instant activation &bull; Secure checkout via Razorpay
            </p>
          </div>
        </div>
      )}

      {message && !showPlans && <p role="status" className="max-w-md text-xs text-rose-600 font-medium mt-1">{message}</p>}
    </div>
  );
}
