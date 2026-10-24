"use client";

import { motion } from "framer-motion";
import { Fingerprint, Globe, Landmark, ArrowRight } from "lucide-react";

const modules = [
    {
        title: "Identity & Aadhaar",
        desc: "Advanced QR validation, demographic cross-referencing, and ML/AI compliance checking for Indian identity substrates.",
        icon: <Fingerprint className="w-6 h-6 text-blue-600" />,
        link: "BIO-METRIC DEEP"
    },
    {
        title: "Passport & Travel",
        desc: "MRZ extraction, NFC chip validation, and holographic analysis for 180+ sovereign travel documents across the globe.",
        icon: <Globe className="w-6 h-6 text-blue-600" />,
        link: "ICAO COMPLIANT"
    },
    {
        title: "Financial Securities",
        desc: "Verification for bank statements, property deeds, and high-value negotiable instruments with sub-pixel ink-level analysis.",
        icon: <Landmark className="w-6 h-6 text-blue-600" />,
        link: "KYB FRAMEWORK"
    }
];

export function SpecializedModules() {
    return (
        <section className="bg-white py-32">
            <div className="container mx-auto px-12">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <h2 className="text-4xl font-black text-slate-900 mb-6 uppercase tracking-tight">Specialized Modules</h2>
                    <p className="text-slate-500 font-medium">Tailored forensic logic for specific global document standards and financial instruments.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {modules.map((m, i) => (
                        <motion.div
                            key={m.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-slate-50 border border-slate-100 p-10 rounded-3xl hover:border-blue-200 transition-all group flex flex-col"
                        >
                            <div className="bg-white p-4 rounded-2xl w-fit shadow-sm border border-slate-100 mb-10 group-hover:scale-110 transition-transform">
                                {m.icon}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-4">{m.title}</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-12 flex-1">{m.desc}</p>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{m.link}</span>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
