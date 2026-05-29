"use client";

import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";

interface StaffRow {
  id: string;
  name: string;
  role: string;
}

interface Props {
  staff: StaffRow;
  onClose: () => void;
  onSaved: (updated: { name: string; role: string }) => void;
}

export default function EditStaffModal({ staff, onClose, onSaved }: Props) {
  const [name, setName] = useState(staff.name);
  const [role, setRole] = useState(staff.role);
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, any> = { displayName: name, role };
      if (hourlyRate) body.hourlyRate = parseFloat(hourlyRate);

      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaved(true);
        onSaved({ name, role });
        setTimeout(onClose, 800);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg">Edit staff member</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Server, Barista, Stylist…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Hourly rate (optional)</label>
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 focus-within:border-blue-500 transition-colors">
              <span className="text-slate-500 text-sm mr-2">$</span>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="15.00"
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <span className="text-slate-500 text-sm ml-2">/hr</span>
            </div>
            <p className="text-slate-600 text-xs mt-1">Updates labor cost calculations for this staff member.</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !name}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {saved ? (
              <><Check className="w-4 h-4 text-green-300" /> Saved</>
            ) : saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
