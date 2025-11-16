import DebugToolbar from "@/components/DebugToolbar";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Burada normal EcoScan/EcoScan Rewards dashboard içeriklerin olabilir */}
      <h1 className="p-6 text-xl font-semibold">EcoScan Rewards – Ana Sayfa</h1>

      {/* Debug toolbar her sayfada sağ altta gözüksün */}
      <DebugToolbar />
    </main>
  );
}
