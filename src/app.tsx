// world_snapshot/src/app.tsx
import { useState } from "react";
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import AdminPanel from './admin/AdminPanel';
import CountryPanel from "./components/country_panel";
import LightningBrief from './components/LightningBrief';
import SummaryCards from "./components/summary_cards";
import WorldMap from "./components/world_map";
import { CountryData } from "./data/countries";

// Отдельный компонент для главной страницы
function MainApp() {
  const [selected, setSelected] = useState<CountryData | null>(null);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl md:text-4xl font-extrabold">
            <i className="fas fa-globe-americas text-cyan-300"></i>
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Short data 2026
            </span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            quick summary · tension · conflicts · disasters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-gray-400">
            <i className="far fa-clock mr-1"></i> updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      <SummaryCards />

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-3 gap-6 mt-6">
      {/* MAP */}
      <div className="lg:col-span-2 bg-slate-800/40 rounded-2xl p-3 border border-slate-700">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-xs font-semibold text-gray-300">
            <i className="fas fa-map-marker-alt text-red-400 mr-1"></i>
            tension map
          </span>
          <div className="flex gap-3 text-[11px] flex-wrap">
            <span><span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1"></span>war</span>
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
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-slate-700 pb-3 mb-4">
            <i className="fas fa-info-circle text-cyan-400"></i>
            <h2 className="font-bold text-lg">regional summary</h2>
          </div>
          <CountryPanel country={selected} />
        </div>
      </div>

      {/* LIGHTNING BRIEF */}
      <LightningBrief />

      <div className="text-center text-gray-500 text-[10px] mt-6">
        World Snapshot - open source data from local JSON + server API support
      </div>
    </div>
  );
}

// Главный компонент App с роутингом
export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-slate-900 text-gray-200 min-h-screen">
        <nav className="bg-slate-800/50 border-b border-slate-700 px-6 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-bold flex items-center gap-2">
              <i className="fas fa-globe-americas text-cyan-300"></i>
              <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                World Snapshot
              </span>
            </Link>
            <Link to="/admin" className="text-sm text-cyan-400 hover:text-cyan-300 transition">
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