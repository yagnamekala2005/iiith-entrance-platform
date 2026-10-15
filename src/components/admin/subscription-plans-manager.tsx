"use client";

import { useState, useTransition } from "react";
import { saveSubscriptionPlan, setSubscriptionPlanActive, type SubscriptionPlanInput } from "@/lib/admin/subscription-plan-actions";

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  price_paise: number;
  duration_months: number;
  is_active: boolean;
  display_order: number;
}

const emptyForm = { name: "", priceRupees: "99", durationMonths: "2", displayOrder: "0" };

export function SubscriptionPlansManager({ initialPlans }: { initialPlans: SubscriptionPlanRow[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setError("");
  }

  function editPlan(plan: SubscriptionPlanRow) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      priceRupees: (plan.price_paise / 100).toFixed(2).replace(/\.00$/, ""),
      durationMonths: String(plan.duration_months),
      displayOrder: String(plan.display_order ?? 0),
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const payload: SubscriptionPlanInput = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name,
      priceRupees: Number(form.priceRupees),
      durationMonths: Number(form.durationMonths),
      displayOrder: Number(form.displayOrder),
      isActive: true,
    };
    startTransition(async () => {
      const result = await saveSubscriptionPlan(payload);
      if (!result.success) {
        setError(result.error || "Could not save plan.");
        return;
      }
      setMessage(editingId ? "Plan updated successfully." : "Plan created successfully.");
      setEditingId(null);
      setForm(emptyForm);
      window.location.reload();
    });
  }

  function togglePlan(plan: SubscriptionPlanRow) {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await setSubscriptionPlanActive(plan.id, !plan.is_active);
      if (!result.success) {
        setError(result.error || "Could not update plan.");
        return;
      }
      setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, is_active: !item.is_active } : item));
      setMessage(plan.is_active ? "Plan hidden from students. Existing subscriptions are unchanged." : "Plan is now available to students.");
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <a href="/admin" className="text-sm font-semibold text-blue-700 hover:underline">← Back to Admin Portal</a>
        <p className="mt-4 inline-flex rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800">Subscription Management</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Subscription Plans</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Create and update the prices and durations students can choose at checkout. Changes apply to new purchases; existing paid subscriptions keep their recorded expiry.</p>
      </div>

      <form onSubmit={submitPlan} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold text-slate-900">{editingId ? "Edit subscription plan" : "Create a subscription plan"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Plan name
            <input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 3 Months" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Price (₹)
            <input required type="number" min="1" max="100000" step="0.01" value={form.priceRupees} onChange={(e) => setForm({ ...form, priceRupees: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Duration (months)
            <input required type="number" min="1" max="24" step="1" value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Display order
            <input required type="number" min="0" step="1" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600" />
          </label>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">{pending ? "Saving…" : editingId ? "Save changes" : "Create plan"}</button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700">Cancel edit</button>}
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">Available plans ({plans.filter((plan) => plan.is_active).length} active)</h2>
        </div>
        {plans.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No plans found. Create your first plan above.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{plan.name}</h3>
                    <span className={plan.is_active ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700" : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500"}>{plan.is_active ? "Active" : "Hidden"}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">₹{(plan.price_paise / 100).toFixed(2)} · {plan.duration_months} {plan.duration_months === 1 ? "month" : "months"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => editPlan(plan)} disabled={pending} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Edit</button>
                  <button type="button" onClick={() => togglePlan(plan)} disabled={pending} className={plan.is_active ? "rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50" : "rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"}>{plan.is_active ? "Hide plan" : "Activate plan"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
