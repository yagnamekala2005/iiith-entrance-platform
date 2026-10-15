"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
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

  async function subscribe() {
    setBusy(true);
    setMessage("");
    try {
      if (!(await loadCheckout()) || !window.Razorpay) throw new Error("Could not load Razorpay Checkout.");
      const response = await fetch("/api/payments/create-subscription-order", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start subscription payment.");
      if (data.alreadySubscribed) {
        setMessage("Your subscription is already active.");
        router.refresh();
        return;
      }
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "IIITH Prep",
        description: "All mock tests · 2 months",
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
      <button type="button" onClick={subscribe} disabled={busy}
        className={compact
          ? "rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          : "rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"}>
        {busy ? "Opening payment…" : compact ? "Unlock all mocks · ₹99 / 2 months" : "Subscribe · ₹99 for 2 months"}
      </button>
      {message && <p role="status" className="max-w-md text-xs text-slate-700">{message}</p>}
    </div>
  );
}
