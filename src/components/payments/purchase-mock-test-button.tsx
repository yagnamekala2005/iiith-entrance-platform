"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string };
  theme: { color: string };
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
}

interface PurchaseMockTestButtonProps {
  testId: string;
  testName: string;
  pricePaise: number;
}

async function loadRazorpayCheckout(): Promise<boolean> {
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
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PurchaseMockTestButton({ testId, testName, pricePaise }: PurchaseMockTestButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startPayment() {
    setBusy(true);
    setError("");
    try {
      const checkoutLoaded = await loadRazorpayCheckout();
      if (!checkoutLoaded || !window.Razorpay) {
        throw new Error("Could not load Razorpay Checkout. Check your internet connection and try again.");
      }

      const orderResponse = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.error || "Could not create payment order.");

      if (orderData.alreadyPurchased) {
        router.refresh();
        setError("You already own this test. Refreshing your access…");
        return;
      }

      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "IIITH Prep",
        description: "Mock test: " + (orderData.testName || testName),
        order_id: orderData.orderId,
        prefill: { email: orderData.studentEmail },
        theme: { color: "#1d4ed8" },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ testId, ...paymentResponse }),
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyData.verified) {
              throw new Error(verifyData.error || "Payment could not be verified. Your test remains locked until verification succeeds.");
            }
            router.refresh();
            window.location.assign("/tests");
          } catch (verificationError) {
            setError(verificationError instanceof Error ? verificationError.message : "Payment verification failed. Please contact support before paying again.");
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Could not start payment.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={startPayment}
        disabled={busy}
        className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Opening payment…" : "Purchase · ₹" + (pricePaise / 100).toFixed(2)}
      </button>
      {error && <p role="status" className="max-w-xs text-right text-xs text-rose-700">{error}</p>}
    </div>
  );
}
