import { Link, NavLink, useLocation } from "react-router-dom";
import { Mic, Waves, Activity, Package, Key, LayoutGrid } from "lucide-react";

const NAV = [
    { to: "/", label: "Estudio", icon: LayoutGrid, end: true },
    { to: "/cleaner", label: "Limpiador", icon: Waves },
    { to: "/api-panel", label: "API", icon: Key },
];

export default function Layout({ children }) {
    const loc = useLocation();
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f7]">
            <header
                className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur"
                data-testid="app-header"
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link
                        to="/"
                        className="flex items-center gap-3"
                        data-testid="logo-link"
                    >
                        <span className="flex h-9 w-9 items-center justify-center border border-white/20 bg-[#141414]">
                            <Mic size={16} className="text-[#FF3B30]" />
                        </span>
                        <div className="flex flex-col leading-none">
                            <span className="font-display text-lg font-bold tracking-tight">
                                VOCAL<span className="text-[#FF3B30]">/</span>BIOMETRIC
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                                Studio · v0.1
                            </span>
                        </div>
                    </Link>

                    <nav className="flex items-center gap-1" data-testid="main-nav">
                        {NAV.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                                            isActive
                                                ? "bg-white text-black"
                                                : "text-[#A1A1A6] hover:bg-white/5 hover:text-white"
                                        }`
                                    }
                                    data-testid={`nav-${item.label.toLowerCase()}`}
                                >
                                    <Icon size={14} />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </nav>

                    <div className="hidden items-center gap-3 md:flex" data-testid="status-indicator">
                        <span className="flex items-center gap-2 border border-white/10 bg-[#141414] px-3 py-2">
                            <span className="h-2 w-2 animate-flicker bg-[#34C759]"></span>
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#A1A1A6]">
                                Online
                            </span>
                        </span>
                    </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FF3B30]/40 to-transparent"></div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

            <footer className="mt-16 border-t border-white/10 py-6">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-[10px] uppercase tracking-[0.3em] text-[#86868B]">
                    <span>SIGNAL · CLONACIÓN VOCAL PARA CANTO</span>
                    <span>{loc.pathname}</span>
                </div>
            </footer>
        </div>
    );
}
