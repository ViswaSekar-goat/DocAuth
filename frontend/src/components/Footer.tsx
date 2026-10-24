"use client";

import Link from "next/link";
import { ShieldCheck, Share2, Globe } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-white pt-32 pb-12 border-t border-slate-100">
            <div className="container mx-auto px-12">
                {/* CTA Section */}
                <div className="bg-slate-900 rounded-[40px] p-16 text-center mb-32 relative overflow-hidden">
                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-20" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20" />

                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-5xl font-black text-white mb-8 leading-tight">
                            Secure your institutional <br /> workflow today.
                        </h2>
                        <p className="text-slate-400 text-lg mb-12 font-medium">
                            Join the global standard in document forensic technology and mitigate institutional risk with Axiom.
                        </p>
                        <div className="flex items-center justify-center gap-6">
                            <Link href="/dashboard/analysis" className="px-10 py-5 bg-blue-500 text-white rounded-md font-black text-xs tracking-widest hover:bg-blue-600 transition-all uppercase">
                                Request Enterprise Trial
                            </Link>
                            <button className="px-10 py-5 bg-slate-800 text-white border border-slate-700 rounded-md font-black text-xs tracking-widest hover:bg-slate-700 transition-all uppercase">
                                Technical Specs
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-20 mb-24 border-b border-slate-100 pb-20">
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 bg-background border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                                <img src="/logos/verentis_logo.png" alt="Verentis Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-lg font-black tracking-tight text-slate-900 uppercase">Verentis</span>
                        </div>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs mb-8">
                            Building a future of immutable digital trust through laboratory-grade forensic analysis and high-fidelity neural verification systems.
                        </p>
                        <div className="flex gap-4">
                            <button className="p-2 border border-slate-100 rounded-full hover:bg-slate-50"><Share2 className="w-4 h-4 text-slate-400" /></button>
                            <button className="p-2 border border-slate-100 rounded-full hover:bg-slate-50"><Globe className="w-4 h-4 text-slate-400" /></button>
                        </div>
                    </div>

                    <div>
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8">Platform</h5>
                        <ul className="space-y-4 text-sm font-medium text-slate-500">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Forensics Core</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Axiom API</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Explainability</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Modules</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8">Solutions</h5>
                        <ul className="space-y-4 text-sm font-medium text-slate-500">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Documentation</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Case Studies</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Security Center</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Whitepapers</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8">Corporate</h5>
                        <ul className="space-y-4 text-sm font-medium text-slate-500">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">About Axiom</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Compliance</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Privacy</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <p>© 2026 Verentis. A Division of Axiom Global.</p>
                    <div className="flex gap-8">
                        <Link href="#">Status: Operational</Link>
                        <Link href="#">Service Level Agreement</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
