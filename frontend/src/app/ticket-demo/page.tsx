"use client";

import React, { useState } from "react";
import { 
  Shield, 
  Activity, 
  FileText, 
  Clipboard, 
  LogOut, 
  FolderOpen, 
  Search 
} from "lucide-react";

export default function TicketValidationDemo() {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [ticketId, setTicketId] = useState("");

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-[280px] bg-[#1A1F2E] flex flex-col shrink-0 h-full border-r border-[#2a3142]">
        {/* Logo Area */}
        <div className="p-6 border-b border-[#2a3142]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A6FA5] rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black tracking-widest text-lg leading-tight uppercase">VERENTIS</h1>
              <p className="text-[#4A6FA5] text-[10px] tracking-[0.2em] font-bold uppercase">Forensic Division</p>
            </div>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="px-6 py-4">
          <div className="bg-[#0f3b21] border border-[#166534] rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-[#4ade80] text-xs font-bold uppercase tracking-wider">System Operational</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-[#23293b] transition-all group">
            <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-[#23293b] transition-all group">
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Threat Intelligence</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#4A6FA5]/10 text-[#4A6FA5] border border-[#4A6FA5]/20 transition-all group">
            <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Document Analysis</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-[#23293b] transition-all group">
            <Clipboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Audit Logs</span>
          </a>
        </nav>

        {/* User Profile & Sign Out */}
        <div className="p-4 border-t border-[#2a3142] space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#151925] border border-[#23293b]">
            <div className="w-10 h-10 rounded-full bg-[#4A6FA5] flex items-center justify-center text-white font-bold text-sm shrink-0">
              SV
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">Sriram VV</p>
              <p className="text-slate-400 text-xs truncate">User</p>
            </div>
          </div>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors group">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-white">
        
        {/* Page Header */}
        <div className="p-8 pb-4 max-w-5xl mx-auto w-full">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
            Ticket Forensic Validation
          </h2>
          <p className="text-slate-500 font-medium">
            Validate warranty, invoice, investigation and estimation documents
          </p>
        </div>

        {/* Form Content */}
        <div className="p-8 pt-4 max-w-5xl mx-auto w-full flex-1">
          
          {/* Tab Toggle */}
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setActiveTab("single")}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-200 ${
                activeTab === "single" 
                  ? "bg-[#4A6FA5] text-white shadow-md shadow-[#4A6FA5]/20 hover:bg-[#3D5E8C]" 
                  : "bg-[#F0F4FA] text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-4 h-4" />
              SINGLE TICKET
            </button>
            <button 
              onClick={() => setActiveTab("batch")}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-200 ${
                activeTab === "batch" 
                  ? "bg-[#4A6FA5] text-white shadow-md shadow-[#4A6FA5]/20 hover:bg-[#3D5E8C]" 
                  : "bg-[#F0F4FA] text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              BATCH TICKETS
            </button>
          </div>

          <div className="space-y-6">
            
            {/* Callout Box */}
            <div className="bg-[#F8FAFC] border-l-4 border-[#4A6FA5] p-5 rounded-r-xl border border-y-slate-200 border-r-slate-200">
              <div className="flex items-start gap-3">
                <FolderOpen className="w-5 h-5 text-[#4A6FA5] shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-slate-700">
                  Click <span className="font-bold text-[#4A6FA5]">Select Local Folder</span> and choose your ticket folder. The system will automatically validate the folder name as the Ticket ID.
                </p>
              </div>
            </div>

            {/* Select Local Folder Button */}
            <button className="w-full py-4 px-6 bg-[#4A6FA5] hover:bg-[#3D5E8C] text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all shadow-md shadow-[#4A6FA5]/20">
              <FolderOpen className="w-4 h-4" />
              SELECT LOCAL FOLDER
            </button>

            {/* Ticket ID Input */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Ticket ID (Folder Name)
              </label>
              <input 
                type="text" 
                placeholder="e.g. 4123456789"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className="w-full p-4 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/50 focus:border-[#4A6FA5] transition-all"
              />
            </div>

            {/* Validate Ticket Button */}
            <button className="w-full py-4 px-6 bg-[#4A6FA5] hover:bg-[#3D5E8C] text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all shadow-md shadow-[#4A6FA5]/20 mt-8">
              <Search className="w-4 h-4" />
              VALIDATE TICKET
            </button>

          </div>

        </div>
      </main>

    </div>
  );
}
