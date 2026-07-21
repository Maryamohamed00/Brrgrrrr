"use client";

import { useEffect, useState } from "react";
import { useCanEdit } from "@/components/admin/RoleContext";

type Settings = {
  businessName: string;
  currency: string;
  reviewDelayMinutes: number;
  defaultLowStockThreshold: number;
  deliveryFee: number;
};
type Integrations = {
  wasenderConfigured: boolean;
  databaseConfigured: boolean;
  cronSecretConfigured: boolean;
  appUrl: string | null;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [saved, setSaved] = useState(false);
  const canEdit = useCanEdit();

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setIntegrations(d.integrations);
      });
  }, []);

  async function save() {
    if (!settings) return;
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!settings || !integrations) return <p className="text-muted">Loading settings…</p>;

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="font-display text-2xl">Settings</h1>
        <p className="text-muted text-sm">Business config and integration status</p>
      </div>

      <div className="bg-card border border-line rounded-2xl p-6 space-y-4">
        <p className="font-semibold text-sm">Business</p>
        <div>
          <label className="text-xs text-muted font-medium">Business name</label>
          <input
            value={settings.businessName}
            onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
            disabled={!canEdit}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line disabled:opacity-60"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted font-medium">Currency label</label>
            <input
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              disabled={!canEdit}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Review delay (minutes)</label>
            <input
              value={settings.reviewDelayMinutes}
              onChange={(e) =>
                setSettings({ ...settings, reviewDelayMinutes: Number(e.target.value) })
              }
              disabled={!canEdit}
              type="number"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono disabled:opacity-60"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted font-medium">
            Default low-stock threshold (for new ingredients)
          </label>
          <input
            value={settings.defaultLowStockThreshold}
            onChange={(e) =>
              setSettings({ ...settings, defaultLowStockThreshold: Number(e.target.value) })
            }
            disabled={!canEdit}
            type="number"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-muted font-medium">
            Delivery fee (EGP, added automatically for Delivery orders)
          </label>
          <input
            value={settings.deliveryFee}
            onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })}
            disabled={!canEdit}
            type="number"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono disabled:opacity-60"
          />
        </div>
        {canEdit && (
          <button
            onClick={save}
            className="px-5 py-2.5 rounded-full bg-fire text-white font-medium text-sm"
          >
            Save settings
          </button>
        )}
        {saved && <span className="ml-3 text-success text-sm">Saved</span>}
      </div>

      <div className="bg-card border border-line rounded-2xl p-6 space-y-3">
        <p className="font-semibold text-sm">Integrations</p>
        <p className="text-xs text-muted -mt-1">
          API keys and database URLs are secrets — set them in your Vercel
          project's Environment Variables, not here. This just shows whether
          they're configured.
        </p>
        <IntegrationRow label="WaSenderAPI (WhatsApp)" ok={integrations.wasenderConfigured} />
        <IntegrationRow label="Neon database" ok={integrations.databaseConfigured} />
        <IntegrationRow label="Cron secret (review scheduler)" ok={integrations.cronSecretConfigured} />
        <div className="flex items-center justify-between text-sm pt-2 border-t border-line">
          <span>App URL</span>
          <span className="font-mono text-xs text-muted">{integrations.appUrl ?? "not set"}</span>
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span
        className={`px-2.5 py-1 rounded-full text-xs ${
          ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        }`}
      >
        {ok ? "Configured" : "Not configured"}
      </span>
    </div>
  );
}
