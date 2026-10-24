import { Shield, Activity, Database, Settings } from "lucide-react";

export function Header() {
    return (
        <header className="glass-panel border-b border-border/50 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-2xl group-hover:bg-primary/30 transition-all" />
                        <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/40 shadow-[0_0_20px_rgba(34,211,238,0.15)] overflow-hidden">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary fill-none stroke-[1.5] stroke-current">
                                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
                                <path d="M12 22V12" />
                                <path d="M12 12L3 7" />
                                <path d="M12 12l9-5" />
                                <path d="M12 7l-4.5 2.5v5L12 17l4.5-2.5v-5L12 7z" className="fill-primary/20" />
                            </svg>
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent animate-shimmer" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            <span className="text-gradient-cyan">VERIDOC</span>
                            <span className="text-muted-foreground ml-2 text-sm font-normal">AI Forensic Engine</span>
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Government-Grade Document Verification System
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-success font-medium">System Online</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Activity className="w-4 h-4" />
                            <span>v2.4.1</span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-1">
                        <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                            <Database className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                            <Settings className="w-5 h-5" />
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}
