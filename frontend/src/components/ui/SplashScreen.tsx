"use client";

import React, { useState, useEffect } from 'react';

export function SplashScreen() {
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setShowSplash(false), 2500);
        return () => clearTimeout(t);
    }, []);

    if (!showSplash) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#030508',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            animation: 'splashFade 0.6s ease 2s forwards',
            pointerEvents: 'all'
        }}>
            {/* Animated shield logo */}
            <div style={{
                animation: 'splashPulse 1s ease-in-out infinite alternate'
            }}>
                <svg viewBox="0 0 100 110" width="90" height="100">
                    <path d="M50 2 L98 18 L98 62 Q98 90 50 108 Q2 90 2 62 L2 18 Z"
                        fill="#0a1628" stroke="#00c2cb" strokeWidth="1.5" />
                    <path d="M50 10 L90 24 L90 62 Q90 84 50 98 Q10 84 10 62 L10 24 Z"
                        fill="none" stroke="#00c2cb" strokeWidth="0.5" opacity="0.4" />
                    <line x1="22" y1="54" x2="78" y2="54"
                        stroke="#00c2cb" strokeWidth="2.5" />
                    <rect x="26" y="48" width="48" height="12" rx="2"
                        fill="#00c2cb" opacity="0.1" />
                    <text fontFamily="monospace" fontSize="7" fill="#00c2cb"
                        fontWeight="700" x="50" y="57.5" textAnchor="middle">
                        VIN SCAN
                    </text>
                    <circle cx="50" cy="87" r="7" fill="none"
                        stroke="#00c853" strokeWidth="1.5" />
                    <path d="M46 87 L49 91 L55 83" fill="none"
                        stroke="#00c853" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {/* Brand name */}
            <div style={{
                marginTop: 24,
                fontSize: 32, fontWeight: 900,
                letterSpacing: '8px', color: '#e8ecf4',
                textTransform: 'uppercase',
                animation: 'splashSlideUp 0.6s ease 0.3s both'
            }}>
                VERENTIS
            </div>

            {/* Tagline */}
            <div style={{
                marginTop: 8, fontSize: 11,
                letterSpacing: '3px', color: '#00c2cb',
                textTransform: 'uppercase',
                animation: 'splashSlideUp 0.6s ease 0.5s both'
            }}>
                Forensic Detection Intelligence
            </div>

            {/* Loading bar */}
            <div style={{
                marginTop: 40, width: 200, height: 2,
                background: '#1e2535', borderRadius: 2, overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%', background: '#00c2cb',
                    borderRadius: 2,
                    animation: 'splashLoad 2s ease forwards'
                }} />
            </div>

            {/* Version */}
            <div style={{
                position: 'absolute', bottom: 24,
                fontSize: 9, color: '#2d3748', letterSpacing: '2px'
            }}>
                VERSION 2.0 — FORENSIC DIVISION
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes splashFade {
          from { opacity: 1; }
          to { opacity: 0; pointer-events: none; }
        }
        @keyframes splashPulse {
          from { transform: scale(0.97); filter: drop-shadow(0 0 8px #00c2cb33); }
          to { transform: scale(1.03); filter: drop-shadow(0 0 20px #00c2cb66); }
        }
        @keyframes splashSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashLoad {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}} />
        </div>
    );
}
