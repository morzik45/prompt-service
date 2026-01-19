import { NavLink, Route, Routes } from "react-router-dom";
import BuilderPage from "@/pages/Builder";
import PhrasesPage from "@/pages/Phrases";
import PromptsPage from "@/pages/Prompts";
import HistoryPage from "@/pages/History";
import SettingsPage from "@/pages/Settings";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Builder" },
  { to: "/phrases", label: "Фразы" },
  { to: "/prompts", label: "Промпты" },
  { to: "/history", label: "История" },
  { to: "/settings", label: "Настройки" },
];

export default function App() {
  return (
    <div className="app-shell min-h-screen">
      <header className="px-4 pt-4">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm uppercase tracking-[0.3em] text-ink/50">Prompt Manager</p>
            <h1 className="font-display text-2xl font-semibold text-ink">ComfyUI Prompt Manager</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full border border-ink/10 px-3 py-1.5 text-sm font-semibold transition",
                    isActive ? "bg-ink text-white" : "bg-white/60 text-ink/70 hover:text-ink"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="px-4 pb-8 pt-4">
        <div className="mx-auto w-full max-w-[1400px]">
          <Routes>
            <Route path="/" element={<BuilderPage />} />
            <Route path="/phrases" element={<PhrasesPage />} />
            <Route path="/prompts" element={<PromptsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
