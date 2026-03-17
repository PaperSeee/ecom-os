"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { calculateProductMetrics, formatCurrency, formatPercent } from "@/lib/financial";
import { TEAM_MEMBERS } from "@/lib/team";
import type { Product } from "@/types/domain";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ProductInput {
  name: string;
  price: number;
  productCost: number;
  shippingCost: number;
  cpaEstimated: number;
}

const initialState: ProductInput = {
  name: "",
  price: 39.9,
  productCost: 8,
  shippingCost: 4.5,
  cpaEstimated: 12,
};

export default function ProductLabPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductInput>(initialState);
  const [actorUserId, setActorUserId] = useState<string>(TEAM_MEMBERS[0].id);

  const preview = useMemo(() => calculateProductMetrics(form), [form]);

  const loadProducts = async () => {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { products: Product[] };
    setProducts(payload.products);
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const onFieldChange = (field: keyof ProductInput, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === "name" ? value : Number(value),
    }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, name: form.name.trim(), actorUserId }),
    });

    await loadProducts();
    setForm(initialState);
  };

  const removeProduct = async (id: string) => {
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    await loadProducts();
  };

  const productReadiness = Math.max(0, Math.min(100, Math.round((preview.netMarginPercent / 30) * 100)));

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Product Lab</h1>
        <p className="mt-2 text-sm text-slate-400">Simulateur de profitabilite unitaire et suivi des SKU.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-300 sm:col-span-2">
              Auteur de la modif
              <select
                value={actorUserId}
                onChange={(event) => setActorUserId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-cyan-400 focus:ring"
              >
                {TEAM_MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Produit
              <input
                required
                value={form.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-cyan-400 focus:ring"
                placeholder="Ex: Correcteur posture"
              />
            </label>
            <label className="text-sm text-slate-300">
              Prix de vente (EUR)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(event) => onFieldChange("price", event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-cyan-400 focus:ring"
              />
            </label>
            <label className="text-sm text-slate-300">
              Cout produit (EUR)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.productCost}
                onChange={(event) => onFieldChange("productCost", event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-cyan-400 focus:ring"
              />
            </label>
            <label className="text-sm text-slate-300">
              Cout livraison (EUR)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.shippingCost}
                onChange={(event) => onFieldChange("shippingCost", event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-cyan-400 focus:ring"
              />
            </label>
            <label className="text-sm text-slate-300 sm:col-span-2">
              CPA estime (EUR)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.cpaEstimated}
                onChange={(event) => onFieldChange("cpaEstimated", event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-cyan-400 focus:ring"
              />
            </label>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Ajouter au Product Lab
          </button>
        </form>

        <aside className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <h2 className="text-base font-medium text-white">Resultats instantanes</h2>
          <p className="text-sm text-slate-400">Stripe: 2.9% + 0.30 EUR | Shopify: 2%</p>
          <div className="space-y-2 text-sm">
            <p className="flex justify-between text-slate-300"><span>Profit unitaire</span><strong>{formatCurrency(preview.unitProfit)}</strong></p>
            <p className="flex justify-between text-slate-300"><span>Marge nette</span><strong>{formatPercent(preview.netMarginPercent)}</strong></p>
            <p className="flex justify-between text-slate-300">
              <span>ROAS break-even</span>
              <strong>{Number.isFinite(preview.breakEvenRoas) ? preview.breakEvenRoas.toFixed(2) : "N/A"}</strong>
            </p>
          </div>
          <ProgressBar value={productReadiness} label="Readiness produit" />
        </aside>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Profit unitaire</th>
                <th className="px-4 py-3">Marge nette</th>
                <th className="px-4 py-3">ROAS BE</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Aucun produit. Ajoutez un SKU pour lancer les calculs.
                  </td>
                </tr>
              ) : (
                products.map((product: Product) => {
                  const metrics = calculateProductMetrics(product);

                  return (
                    <tr key={product.id} className="border-t border-white/5 text-slate-200">
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                      <td className={`px-4 py-3 ${metrics.unitProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatCurrency(metrics.unitProfit)}
                      </td>
                      <td className="px-4 py-3">{formatPercent(metrics.netMarginPercent)}</td>
                      <td className="px-4 py-3">
                        {Number.isFinite(metrics.breakEvenRoas) ? metrics.breakEvenRoas.toFixed(2) : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
