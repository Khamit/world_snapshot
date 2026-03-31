// world_snapshot/src/app.tsx
import { useState } from "react";
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import AdminPanel from './admin/AdminPanel';
import Background from './components/Background';
import CountryPanel from "./components/country_panel";
import LightningBrief from './components/LightningBrief';
import SummaryCards from "./components/summary_cards";
import TypingText from './components/TypingText';
import WorldMap from "./components/world_map";
import { CountryData } from "./data/countries";

// Отдельный компонент для главной страницы
function MainApp() {
  const [selected, setSelected] = useState<CountryData | null>(null);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 relative z-10 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <TypingText 
            texts={[
              "Short data 2026",
              "Global Tension Monitor",
              "Real-time Analytics",
              "Crisis Dashboard"
            ]}
            typingSpeed={80}
            pauseDuration={3000}
          />
          <p className="text-gray-400 text-sm mt-2">
            <i className="fas fa-chart-line text-cyan-400 mr-1"></i>
            quick summary · tension · conflicts · disasters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500 rounded-full blur-md opacity-50 animate-pulse" />
            <span className="relative text-xs bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full text-gray-300 border border-cyan-500/30">
              <i className="far fa-clock mr-1 text-cyan-400"></i> 
              updated: {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <SummaryCards />

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* MAP */}
        <div className="lg:col-span-2 bg-slate-800/40 backdrop-blur-sm rounded-2xl p-3 border border-slate-700 hover:border-cyan-500/30 transition-all duration-300">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs font-semibold text-gray-300">
              <i className="fas fa-map-marker-alt text-red-400 mr-1 animate-pulse"></i>
              tension map
            </span>
            <div className="flex gap-3 text-[11px] flex-wrap">
              <span><span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1 animate-pulse"></span>war</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1"></span>high tension</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>protests</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-cyan-700 mr-1"></span>eco-crisis</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-green-600 mr-1"></span>safety</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-slate-600 mr-1"></span>no data</span>
            </div>
          </div>
          <div className="w-full h-[500px] md:h-[500px] sm:h-[400px] xs:h-[350px] relative">
            <WorldMap onSelect={setSelected} />
          </div>
        </div>

        {/* PANEL */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 hover:border-cyan-500/30 transition-all duration-300">
          <div className="flex items-center gap-2 border-b border-slate-700 pb-3 mb-4">
            <i className="fas fa-info-circle text-cyan-400 animate-pulse"></i>
            <h2 className="font-bold text-lg">regional summary</h2>
          </div>
          <CountryPanel country={selected} />
        </div>
      </div>

      {/* LIGHTNING BRIEF */}
      <div className="mt-6 relative z-10">
        <LightningBrief />
      </div>

      <div className="text-center text-gray-500 text-[10px] mt-6 relative z-10">
        <div className="flex justify-center gap-4 mb-2 text-[9px]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Minimal</span>
          </div>
        </div>
        <i className="fas fa-shield-alt text-cyan-500/50 mr-1"></i>
        World Snapshot · open source data from: GNEWS, NEWSDATA, globalissues, worldpopulationreview · 
        <a
          href="https://github.com/Khamit/world_snapshot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1"
        >
          <i className="fab fa-github"></i>
          github
        </a>
        <i className="fas fa-database text-cyan-500/50 ml-1"></i>
      </div>
    </div>
  );
}

// Главный компонент App с роутингом
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen text-gray-200 overflow-x-hidden">
        <Background />
        <nav className="sticky top-0 z-20 bg-slate-900/50 backdrop-blur-md border-b border-slate-700/50 px-6 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-bold flex items-center gap-2 group">
              <i className="fas fa-globe-americas text-cyan-300 group-hover:animate-spin transition-all"></i>
              <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent group-hover:from-cyan-200 group-hover:to-blue-300 transition-all">
                World Snapshot
              </span>
            </Link>
            <Link 
              to="/admin" 
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-all flex items-center gap-1 group"
            >
              <i className="fas fa-cog group-hover:rotate-90 transition-transform"></i>
              Admin Panel
            </Link>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}