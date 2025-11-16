import DebugToolbar from "@/components/DebugToolbar";
import { AppContainer } from "@/components/app-container";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <AppContainer />
      {/* Debug toolbar her sayfada sağ altta gözüksün */}
      <DebugToolbar />
    </main>
  );
}
