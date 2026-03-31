import { useState } from 'react';
import { useGlobalData } from "../hooks/useGlobalData";
import { Category, NewsEvent } from "../types"; // ← импортируйте NewsEvent
import NewsModal from './NewsModal';

const categories: { key: Category; icon: string; title: string; color: string }[] = [
  { key: "military", icon: "fas fa-shield-alt", title: "MILITARY", color: "text-red-300" },
  { key: "disasters", icon: "fas fa-fire", title: "DISASTERS", color: "text-amber-300" },
  { key: "politics", icon: "fas fa-landmark", title: "POLITICS", color: "text-purple-300" },
  { key: "science", icon: "fas fa-flask", title: "SCIENCE", color: "text-blue-300" },
  { key: "economy", icon: "fas fa-chart-line", title: "ECONOMY", color: "text-green-300" },
  { key: "health", icon: "fas fa-hospital", title: "HEALTH", color: "text-emerald-300" },
  { key: "popular", icon: "fas fa-star", title: "POPULAR", color: "text-pink-300" },
];

export default function SummaryCards() {
  const { data, loading, error, useRemote, setUseRemote } = useGlobalData();
  const [selectedEvent, setSelectedEvent] = useState<NewsEvent | null>(null);  // ← тип NewsEvent
  
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {categories.map((cat) => (
          <div key={cat.key} className="bg-slate-800/70 border border-slate-700 rounded-2xl p-3 animate-pulse">
            <div className="h-12 bg-slate-700/50 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    console.error("Error loading data:", error);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end items-center gap-2 text-xs">
          <span className="text-gray-400">source:</span>
          <button
            onClick={() => setUseRemote(false)}
            className={`px-2 py-1 rounded ${!useRemote ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-gray-300'}`}
          >
            локальный
          </button>
          <button
            onClick={() => setUseRemote(true)}
            className={`px-2 py-1 rounded ${useRemote ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-gray-300'}`}
          >
            сервер
          </button>
        </div>

        {data?.lastUpdated && (
          <div className="text-right text-[10px] text-gray-500">
            обновлено: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {categories.map((cat) => {
            // Исправлено: используем NewsEvent вместо any
            const itemsAuto = data?.globalEvents?.filter((e: NewsEvent) => e.category === cat.key) || [];
            const itemsAdmin = data?.adminEvents?.filter((e: NewsEvent) => e.category === cat.key) || [];
            const items = [...itemsAdmin, ...itemsAuto];
            
            return (
              <div key={cat.key} className="bg-slate-800/70 border border-slate-700 rounded-2xl p-3 backdrop-blur-sm hover:border-slate-600 transition-all">
                <div className={`flex items-center gap-2 ${cat.color}`}>
                  <i className={`${cat.icon} text-base`}></i>
                  <span className="font-semibold text-sm">{cat.title}</span>
                </div>
                <div className="text-xs text-gray-300 mt-2 space-y-1.5">
                  {items.slice(0, 3).map((e: NewsEvent) => (
                    <div 
                      key={e.id} 
                      className="leading-relaxed border-l-2 border-cyan-500/50 pl-2 cursor-pointer hover:bg-slate-700/30 transition"
                      onClick={() => setSelectedEvent(e)}
                    >
                      • {e.title}
                      {e.source === 'admin' && (
                        <div className="text-[9px] text-gray-400 mt-0.5">
                          admin · {e.createdAt && new Date(e.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-gray-500 italic">no data</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Глобальная метрика смертности */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-3 relative overflow-hidden">
            <div className="flex items-center gap-2 text-red-400">
              <i className="fas fa-skull"></i>
              <span className="font-semibold text-sm">MORTALITY</span>
            </div>
            <div className="text-2xl font-mono font-bold text-red-400 animate-pulse mt-1">
              {data?.globalMetrics.dailyDeaths?.toLocaleString() || "—"}
              <span className="text-xs text-gray-400 ml-1">/ day</span>
            </div>
            
            <div className="grid grid-cols-2 gap-1 mt-2 text-[10px]">
              {data?.globalMetrics.hourlyDeaths && (
                <div className="text-gray-300">
                  <i className="fas fa-clock mr-1"></i> hour: <span className="text-red-300">{data.globalMetrics.hourlyDeaths.toLocaleString()}</span>
                </div>
              )}
              {data?.globalMetrics.minuteDeaths && (
                <div className="text-gray-300">
                  <i className="fas fa-hourglass-half mr-1"></i> minute: <span className="text-red-300">{data.globalMetrics.minuteDeaths}</span>
                </div>
              )}
              {data?.globalMetrics.secondDeaths && (
                <div className="text-gray-300">
                  <i className="fas fa-bolt mr-1"></i> seconds: <span className="text-red-300">{data.globalMetrics.secondDeaths}</span>
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-gray-400 mt-1">
              {data?.globalMetrics.deathsChange && `${data.globalMetrics.deathsChange}% vs вчера`}
            </div>
            
            <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] grid grid-cols-2 gap-1">
              <div><i className="fas fa-gun mr-1"></i> conflicts: {data?.globalMetrics.activeConflicts || "—"}</div>
              <div><i className="fas fa-tree mr-1"></i> eco-crises: {data?.globalMetrics.ecoCrises || "—"}</div>
            </div>
          </div>
        </div>
      </div>
      
      {selectedEvent && (
        <NewsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}