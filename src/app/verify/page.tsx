"use client";
import { useState } from "react";

function CameraCapture({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {/* Kamera-only: capture=environment galeriyi kapatır; bazı cihazlarda yine sunabilir ama çoğunu kilitler */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="block w-full cursor-pointer text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-violet-50 file:text-violet-700
          hover:file:bg-violet-100"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <p className="mt-1 text-xs text-gray-500">
        Canlı çekim zorunlu. Galeriden yükleme desteklenmez.
      </p>
    </label>
  );
}

export default function VerifyPage() {
  const [busy, setBusy] = useState(false);

  async function upload(path: string, file: File, meta: Record<string, any>) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("meta", JSON.stringify(meta));
      const res = await fetch(path, { method: "POST", body: fd });
      const j = await res.json();
      alert(j.ok ? "Gönderildi, doğrulanıyor." : `Hata: ${j.error}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Doğrulama Merkezi</h1>

      {/* Ulaşım: foto ile doğrulama */}
      <section className="rounded-xl border p-4">
        <h2 className="mb-2 text-lg font-semibold">Ulaşım Doğrulaması (Foto)</h2>
        <CameraCapture
          label="Ulaşımınızı kanıtlayan bir foto çekin (yürüyüş/bisiklet/otobüs vb.)"
          onFile={f => upload("/api/verify/transport", f, { type: "transport_photo" })}
        />
      </section>

      {/* Yemek: fiş veya yemek yerken foto */}
      <section className="rounded-xl border p-4">
        <h2 className="mb-2 text-lg font-semibold">Yemek Doğrulaması</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <CameraCapture
            label="Yemek fişi (market/restoran) — canlı çekim"
            onFile={f => upload("/api/verify/meal-receipt", f, { type: "meal_receipt" })}
          />
          <CameraCapture
            label="Yemek yerken foto — canlı çekim"
            onFile={f => upload("/api/verify/meal-photo", f, { type: "meal_photo" })}
          />
        </div>
      </section>

      {/* İçecek: fiş veya foto */}
      <section className="rounded-xl border p-4">
        <h2 className="mb-2 text-lg font-semibold">İçecek Doğrulaması</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <CameraCapture
            label="İçecek fişi — canlı çekim"
            onFile={f => upload("/api/verify/drink-receipt", f, { type: "drink_receipt" })}
          />
          <CameraCapture
            label="İçecek foto — canlı çekim"
            onFile={f => upload("/api/verify/drink-photo", f, { type: "drink_photo" })}
          />
        </div>
      </section>

      {/* Enerji: aylık — sadece fatura */}
      <section className="rounded-xl border p-4">
        <h2 className="mb-2 text-lg font-semibold">Enerji Doğrulaması (Aylık Fatura)</h2>
        <CameraCapture
          label="Elektrik/Su faturası — canlı çekim"
          onFile={f => upload("/api/verify/utility-bill", f, { type: "utility_bill" })}
        />
        <p className="mt-2 text-xs text-amber-700">
          Not: Enerji doğrulaması aylık yapılır. Aynı ay içinde birden fazla gönderim kabul edilmez.
        </p>
      </section>

      <button disabled={busy} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white disabled:bg-gray-400">
        {busy ? "Yükleniyor..." : "Bitti"}
      </button>
    </main>
  );
}
