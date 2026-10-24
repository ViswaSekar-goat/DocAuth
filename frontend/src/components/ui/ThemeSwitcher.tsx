"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-300",
                "bg-card text-card-foreground border-border hover:bg-muted font-medium",
                "shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            title="Toggle Theme (Light / Dark / Eye Protected)"
        >
            <div className="relative h-5 w-5">
                <Sun
                    className={cn(
                        "absolute inset-0 h-5 w-5 transition-all duration-500",
                        theme === "light" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
                    )}
                />
                <Moon
                    className={cn(
                        "absolute inset-0 h-5 w-5 transition-all duration-500",
                        theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
                    )}
                />
                <Eye
                    className={cn(
                        "absolute inset-0 h-5 w-5 transition-all duration-500",
                        theme === "sepia" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
                    )}
                />
            </div>
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
