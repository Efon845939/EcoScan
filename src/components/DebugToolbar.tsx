"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function DebugToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [log, setLog] = useState<string>("Henüz test yapılmadı.");

  function logMessage(msg: string) {
    console.log("[DEBUG]", msg);
    setLog(msg);
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white/90 border border-gray-300 rounded-xl shadow-lg p-3 text-xs max-w-xs">
      <div className="font-semibold text-gray-800 mb-2">Debug Toolbar</div>
      <div className="mb-2 text-gray-600">Şu anki path: <span className="font-mono">{pathname}</span></div>

      <div className="flex flex-col space-y-1 mb-2">
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          onClick={() => logMessage("Link ile /auth/login tıklandı.")}
        >
          Link ile /auth/login
        </Link>
        <button
          onClick={() => {
            logMessage("router.push ile /auth/login çağrıldı.");
            router.push("/auth/login");
          }}
          className="px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
        >
          router.push("/auth/login")
        </button>
        <button
          onClick={() => {
            logMessage("Şu anki path tekrar okundu.");
          }}
          className="px-2 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
        >
          Path'i yenile (sadece log)
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded p-2 max-h-24 overflow-auto">
        <div className="font-semibold mb-1">Log:</div>
        <pre className="whitespace-pre-wrap break-all">{log}</pre>
      </div>
    </div>
  );
}
