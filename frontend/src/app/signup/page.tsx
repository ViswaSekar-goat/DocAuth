"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    ArrowRight,
    Palette,
    Sun,
    Moon,
    UserPlus,
    ChevronDown
} from "lucide-react";

export default function SignupPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [theme, setTheme] = useState("light");
    const [brand, setBrand] = useState("default");
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "light";
        const savedBrand = localStorage.getItem("brand") || "default";
        setTheme(savedTheme);
        setBrand(savedBrand);
        applyTheme(savedTheme, savedBrand);
    }, []);

    const applyTheme = (newTheme: string, newBrand: string) => {
        const root = document.documentElement;
        root.classList.remove("light", "dark", "brand-purple", "brand-emerald");

        if (newTheme === "dark") root.classList.add("dark");
        if (newBrand === "purple") root.classList.add("brand-purple");
        if (newBrand === "emerald") root.classList.add("brand-emerald");
    };

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        applyTheme(newTheme, brand);
    };

    const handleBrandChange = (newBrand: string) => {
        setBrand(newBrand);
        localStorage.setItem("brand", newBrand);
        applyTheme(theme, newBrand);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("http://127.0.0.1:8000/api/v1/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fullName,
                    email,
                    password
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Account creation failed. Please try again.");
            }

            const data = await response.json();
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.access_token) {
                localStorage.setItem("token", data.access_token);
            }
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 bg-background text-foreground">
            {/* Dynamic Animated Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-float opacity-30"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px] animate-float opacity-30 [animation-delay:2s]"></div>
                <div className="absolute inset-0 animate-aurora opacity-10"></div>
            </div>

            {/* Floating Header */}
            <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 backdrop-blur-md bg-transparent">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="size-10 bg-background border border-border/40 rounded-xl flex items-center justify-center shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform overflow-hidden">
                            <img src="/logos/verentis_logo.png" alt="Verentis Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            Verentis
                        </span>
                    </Link>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowThemeMenu(!showThemeMenu)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full premium-glass hover:bg-white/10 transition-all font-medium text-sm"
                    >
                        <Palette className="size-4" />
                        Theme
                        <ChevronDown className={`size-3 transition-transform ${showThemeMenu ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                        {showThemeMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-3 w-48 p-2 rounded-2xl premium-glass z-50 border border-white/20"
                            >
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => handleThemeChange("light")} className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors ${theme === "light" ? "bg-primary text-white" : "hover:bg-white/10"}`}>
                                        <Sun className="size-4" /> Light Mode
                                    </button>
                                    <button onClick={() => handleThemeChange("dark")} className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors ${theme === "dark" ? "bg-primary text-white" : "hover:bg-white/10"}`}>
                                        <Moon className="size-4" /> Dark Mode
                                    </button>
                                    <div className="h-px bg-white/10 my-1"></div>
                                    <button onClick={() => handleBrandChange("default")} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm hover:bg-white/10 transition-colors">
                                        <div className="size-4 rounded-full bg-blue-500"></div> Default Blue
                                    </button>
                                    <button onClick={() => handleBrandChange("purple")} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm hover:bg-white/10 transition-colors">
                                        <div className="size-4 rounded-full bg-purple-500"></div> Royal Purple
                                    </button>
                                    <button onClick={() => handleBrandChange("emerald")} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm hover:bg-white/10 transition-colors">
                                        <div className="size-4 rounded-full bg-emerald-500"></div> Mint Emerald
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Signup Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-lg p-1 px-4 z-10"
            >
                <div className="premium-glass rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
                    {/* Highlight decoration */}
                    <div className="absolute -top-24 -left-24 size-48 bg-primary/20 blur-[60px] rounded-full group-hover:bg-primary/30 transition-all duration-700"></div>

                    <div className="text-center mb-10 relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4"
                        >
                            <UserPlus className="size-6" />
                        </motion.div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">Join Discovery</h1>
                        <p className="text-muted-foreground font-medium">Start your forensic intelligence journey</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-6">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold px-4 py-3 rounded-2xl flex items-center gap-2"
                                >
                                    <Shield className="size-4" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="floating-label-group mt-0">
                                <input
                                    type="text"
                                    placeholder=" "
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="w-full bg-transparent border-b-2 border-border focus:border-primary outline-none py-4 px-2 transition-all font-medium"
                                />
                                <label className="flex items-center gap-2">
                                    <User className="size-4" /> Full Name
                                </label>
                            </div>

                            <div className="floating-label-group mt-0">
                                <input
                                    type="email"
                                    placeholder=" "
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-transparent border-b-2 border-border focus:border-primary outline-none py-4 px-2 transition-all font-medium"
                                />
                                <label className="flex items-center gap-2">
                                    <Mail className="size-4" /> Corporate Email
                                </label>
                            </div>
                        </div>

                        <div className="floating-label-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder=" "
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-transparent border-b-2 border-border focus:border-primary outline-none py-4 px-2 pr-12 transition-all font-medium"
                            />
                            <label className="flex items-center gap-2">
                                <Lock className="size-4" /> Secure Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-4 text-muted-foreground hover:text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                            </button>
                        </div>

                        <div className="pt-4">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input type="checkbox" required className="mt-1 size-4 rounded-md border-2 border-border transition-all checked:bg-primary" />
                                <span className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    I agree to the <a href="#" className="text-primary font-bold hover:underline">Terms of Service</a> and <a href="#" className="text-primary font-bold hover:underline">Privacy Policy</a>.
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 group overflow-hidden relative"
                        >
                            {loading ? (
                                <div className="size-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>CREATE ACCOUNT</span>
                                    <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                            {/* Button shimmer */}
                            <div className="absolute inset-0 animate-shimmer pointer-events-none"></div>
                        </button>
                    </form>

                    <p className="mt-10 text-center text-muted-foreground font-medium text-sm">
                        Already have an identity?
                        <Link href="/login" className="text-primary font-black ml-2 hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div>

            {/* Footer Info */}
            <footer className="fixed bottom-0 w-full p-8 flex flex-col items-center gap-4 z-10 pointer-events-none">
                <div className="flex gap-4 pointer-events-auto">
                    {["Compliance", "Legal", "Operations"].map((item) => (
                        <a key={item} href="#" className="text-xs font-bold text-muted-foreground/60 hover:text-primary transition-colors uppercase tracking-widest">
                            {item}
                        </a>
                    ))}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">
                    © 2024 Verentis • SECURE CLOUD INFRASTRUCTURE
                </p>
            </footer>
        </div>
    );
}
