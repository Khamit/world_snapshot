// world_snapshot/src/components/summary_cards.tsx
import { useEffect, useState } from 'react';
import { useGlobalData } from "../hooks/useGlobalData";
import { Category, NewsEvent } from "../types";
import IOSSwitch from './IOSSwitch';
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

const progressBarColors: Record<string, string> = {
  military: "#ef4444",
  disasters: "#f59e0b",
  politics: "#a855f7",
  science: "#3b82f6",
  economy: "#10b981",
  health: "#10b981",
  popular: "#ec4899",
};

export default function SummaryCards() {
  const { data, loading, error, useRemote, setUseRemote, lastUpdated, serverConfig } = useGlobalData();
  const [selectedEvent, setSelectedEvent] = useState<NewsEvent | null>(null);
  const [categoryModalEvents, setCategoryModalEvents] = useState<{ category: string; events: NewsEvent[] } | null>(null);
  const [sentimentModalEvents, setSentimentModalEvents] = useState<{ type: 'positive' | 'negative'; events: NewsEvent[] } | null>(null);
  const [timeToNextRefresh, setTimeToNextRefresh] = useState<string>('');

  useEffect(() => {
    if (!useRemote) {
      setTimeToNextRefresh('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      
      if (serverConfig?.nextUpdate) {
        const nextUpdate = new Date(serverConfig.nextUpdate);
        const diffMs = nextUpdate.getTime() - now.getTime();
        
        if (diffMs > 0) {
          const diffMin = Math.floor(diffMs / 60000);
          const diffSec = Math.floor((diffMs % 60000) / 1000);
          setTimeToNextRefresh(`${diffMin}:${diffSec.toString().padStart(2, '0')}`);
          return;
        }
      }
      
      const minutes = now.getMinutes();
      const nextRefreshMinutes = Math.ceil(minutes / 10) * 10;
      const nextRefresh = new Date(now);
      nextRefresh.setMinutes(nextRefreshMinutes, 0, 0);
      
      if (nextRefresh <= now) {
        nextRefresh.setMinutes(nextRefreshMinutes + 10, 0, 0);
      }
      
      const diffMs = nextRefresh.getTime() - now.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffSec = Math.floor((diffMs % 60000) / 1000);
      
      setTimeToNextRefresh(`${diffMin}:${diffSec.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [useRemote, lastUpdated, serverConfig]);

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

  const allEvents = data?.globalEvents || [];
  const totalEvents = allEvents.length;

  // Функция для получения sentimentScore
  const getSentimentScore = (event: NewsEvent) => {
    if (event.sentimentScore !== undefined) {
      return event.sentimentScore;
    }
    // Используем intensity как прокси (0-100 -> -50 до 50)
    if (event.intensity !== undefined) {
      return Math.round((50 - event.intensity) * 1.2);
    }
    return 0;
  };

  // Вычисляем события с явным sentimentScore для отладки
  const eventsWithSentiment = allEvents.filter(e => e.sentimentScore !== undefined);
  console.log('Events with sentimentScore:', eventsWithSentiment.length);
  console.log('Total events:', totalEvents);
  
  // Если нет явного sentimentScore, используем intensity
  const positiveEvents = allEvents.filter((e: NewsEvent) => getSentimentScore(e) > 10);
  const negativeEvents = allEvents.filter((e: NewsEvent) => getSentimentScore(e) < -10);
  const neutralEvents = allEvents.filter((e: NewsEvent) => getSentimentScore(e) >= -10 && getSentimentScore(e) <= 10);
  
  const positivePercentage = totalEvents > 0 ? Math.round((positiveEvents.length / totalEvents) * 100) : 0;
  const negativePercentage = totalEvents > 0 ? Math.round((negativeEvents.length / totalEvents) * 100) : 0;
  const neutralPercentage = totalEvents > 0 ? Math.round((neutralEvents.length / totalEvents) * 100) : 0;

  const avgSentiment = totalEvents > 0 
    ? Math.round(allEvents.reduce((sum, e) => sum + getSentimentScore(e), 0) / totalEvents)
    : 0;

  const getCategoryPercentage = (categoryKey: string) => {
    const count = allEvents.filter((e: NewsEvent) => e.category === categoryKey).length;
    if (totalEvents === 0) return 0;
    return Math.round((count / totalEvents) * 100);
  };

  const openCategoryModal = (categoryKey: string, events: NewsEvent[]) => {
    if (events.length === 0) return;
    setCategoryModalEvents({ category: categoryKey, events });
  };

  const openSentimentModal = (type: 'positive' | 'negative', events: NewsEvent[]) => {
    console.log(`Opening ${type} modal with ${events.length} events`);
    if (events.length === 0) {
      console.log(`No ${type} events to show`);
      return;
    }
    setSentimentModalEvents({ type, events });
  };

  return (
    <>
      <div className="space-y-3">
        {/* Source Switch */}
        <div className="flex justify-end items-center">
          <IOSSwitch
            checked={useRemote}
            onChange={setUseRemote}
            leftLabel="Local"
            rightLabel="Server"
          />
        </div>

        {/* Информация об обновлениях */}
        <div className="flex justify-between items-center text-[10px] text-gray-500">
        <div>
          {lastUpdated && (
            <span className="flex items-center gap-1">
              <i className="fas fa-satellite text-xs"></i>
              last sync: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
          <div>
            {useRemote && timeToNextRefresh && (
              <span className="flex items-center gap-1">
                <i className="fas fa-clock"></i> next update: {timeToNextRefresh}
              </span>
            )}
            {!useRemote && (
              <span>local data</span>
            )}
          </div>
        </div>

        {data?.lastUpdated && (
          <div className="text-right text-[10px] text-gray-500">
            data from: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        )}

        {/* Статистика по категориям */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const itemsAuto = data?.globalEvents?.filter((e: NewsEvent) => e.category === cat.key) || [];
            const itemsAdmin = data?.adminEvents?.filter((e: NewsEvent) => e.category === cat.key) || [];
            const items = [...itemsAdmin, ...itemsAuto];
            const percentage = getCategoryPercentage(cat.key);
            
            return (
              <div key={cat.key} className="bg-slate-800/70 border border-slate-700 rounded-2xl p-3 backdrop-blur-sm hover:border-slate-600 transition-all relative">
                <div className={`flex items-center justify-between ${cat.color}`}>
                  <div className="flex items-center gap-2">
                    <i className={`${cat.icon} text-base`}></i>
                    <span className="font-semibold text-sm">{cat.title}</span>
                  </div>
                  <div className="text-xs font-bold bg-slate-700/50 px-2 py-0.5 rounded-full">
                    {percentage}%
                  </div>
                </div>
                
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: progressBarColors[cat.key] || '#38bdf8'
                    }}
                  ></div>
                </div>
                
              <div className="flex justify-between items-center mt-2 text-[9px] group relative">
                <span className="text-gray-500">
                  <i className="fas fa-chart-line mr-1"></i>
                  {items.length} news
                </span>
                <div className="flex items-center gap-1 cursor-help">
                  <span className="text-cyan-300">
                    <i className="fas fa-waveform mr-1"></i>
                    {items.length > 0 
                      ? Math.round(items.reduce((sum, e) => sum + (e.intensity || 50), 0) / items.length)
                      : 0}%
                  </span>
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20 w-48 p-2 bg-slate-900 border border-slate-600 rounded-lg text-[9px] text-gray-300">
                    <strong className="text-cyan-400">Avg Intensity</strong><br/>
                    Measures event severity:<br/>
                    • 80-100%: Critical<br/>
                    • 60-79%: High<br/>
                    • 40-59%: Moderate<br/>
                    • 20-39%: Low<br/>
                    • 0-19%: Minimal
                  </div>
                </div>
              </div>
                
                <div className="text-xs text-gray-300 mt-2 space-y-1.5">
                  {items.slice(0, 3).map((e: NewsEvent) => (
                    <div 
                      key={e.id} 
                      className="leading-relaxed border-l-2 border-cyan-500/50 pl-2 cursor-pointer hover:bg-slate-700/30 transition"
                      onClick={() => {
                          console.log('Selected event:', e);
                          console.log('Sentiment score:', e.sentimentScore);
                          console.log('Intensity:', e.intensity);
                          setSelectedEvent(e);
                        }}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="flex-1">• {e.title.length > 50 ? e.title.substring(0, 50) + '...' : e.title}</span>
                        {e.intensity && (
                          <span className="text-[8px] text-red-400 whitespace-nowrap">
                            {e.intensity}%
                          </span>
                        )}
                      </div>
                      {e.source === 'admin' && (
                        <div className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <i className="fas fa-pen-alt text-[8px]"></i>
                          admin · {e.createdAt && new Date(e.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-gray-500 italic">no data</div>
                  )}
                  {items.length > 3 && (
                    <div 
                      className="text-[10px] text-cyan-400/70 text-center pt-1 cursor-pointer hover:text-cyan-300 transition"
                      onClick={() => openCategoryModal(cat.key, items)}
                    >
                      +{items.length - 3} more
                    </div>
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

      {/* Карточки аналитики тональности - ВЫНЕСЕНЫ ИЗ space-y-3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {/* Positive News Card */}
        <div 
          className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-2xl p-4 cursor-pointer hover:border-green-400/50 transition-all group relative z-10"
          onClick={() => openSentimentModal('positive', positiveEvents)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="fas fa-smile text-green-400 text-xl"></i>
              <span className="font-bold text-green-400">POSITIVE OUTLOOK</span>
            </div>
            <span className="text-2xl font-bold text-green-400">{positivePercentage}%</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Positive news</span>
              <span className="text-green-300 font-mono">{positiveEvents.length}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${positivePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>vs neutral: {neutralPercentage}%</span>
              <span>vs negative: {negativePercentage}%</span>
            </div>
          </div>
          
          {positiveEvents.length > 0 && (
            <div className="mt-3 text-[10px] text-green-400/70 flex items-center gap-1 group-hover:text-green-300 transition">
              <i className="fas fa-arrow-right text-[8px]"></i>
              <span>Click to view {positiveEvents.length} positive news</span>
            </div>
          )}
        </div>

        {/* Negative News Card */}
        <div 
          className="bg-gradient-to-br from-red-900/30 to-orange-900/20 border border-red-500/30 rounded-2xl p-4 cursor-pointer hover:border-red-400/50 transition-all group relative z-10"
          onClick={() => openSentimentModal('negative', negativeEvents)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="fas fa-frown text-red-400 text-xl"></i>
              <span className="font-bold text-red-400">NEGATIVE ALERTS</span>
            </div>
            <span className="text-2xl font-bold text-red-400">{negativePercentage}%</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Negative news</span>
              <span className="text-red-300 font-mono">{negativeEvents.length}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                style={{ width: `${negativePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>avg sentiment: {avgSentiment > 0 ? '+' : ''}{avgSentiment}</span>
              <span>neutral: {neutralPercentage}%</span>
            </div>
          </div>
          
          {negativeEvents.length > 0 && (
            <div className="mt-3 text-[10px] text-red-400/70 flex items-center gap-1 group-hover:text-red-300 transition">
              <i className="fas fa-arrow-right text-[8px]"></i>
              <span>Click to view {negativeEvents.length} negative news</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Общая статистика внизу */}
      <div className="text-center text-[10px] text-gray-500 pt-2 border-t border-slate-700 mt-3">
        Total news: {totalEvents} | 
        Positive: {positiveEvents.length} | 
        Negative: {negativeEvents.length} | 
        Neutral: {neutralEvents.length} | 
        Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : '—'}
      </div>
      
      {/* Модальные окна */}
      {selectedEvent && (
        <NewsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      
      {categoryModalEvents && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setCategoryModalEvents(null)}
        >
          <div 
            className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold capitalize">
                  {categoryModalEvents.category} news ({categoryModalEvents.events.length})
                </h3>
                <button 
                  onClick={() => setCategoryModalEvents(null)} 
                  className="text-gray-400 hover:text-white"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="space-y-3">
                {categoryModalEvents.events.map((event) => (
                  <div 
                    key={event.id}
                    className="bg-slate-700/30 rounded-lg p-3 cursor-pointer hover:bg-slate-700/50 transition"
                    onClick={() => {
                      setSelectedEvent(event);
                      setCategoryModalEvents(null);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-600 rounded">
                        {event.category}
                      </span>
                      {event.source === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-cyan-600/30 text-cyan-300 rounded">
                          admin
                        </span>
                      )}
                      {event.intensity !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-600/30 text-red-300 rounded">
                          {event.intensity}%
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    {event.detail && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {event.detail}
                      </p>
                    )}
                    <div className="text-[10px] text-gray-500 mt-2">
                      {event.source === 'admin' ? (
                        <>Created: {event.createdAt && new Date(event.createdAt).toLocaleString()}</>
                      ) : (
                        <>Source: {event.source || 'GNews'} | {event.publishedAt && new Date(event.publishedAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {sentimentModalEvents && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSentimentModalEvents(null)}
        >
          <div 
            className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-xl font-bold capitalize flex items-center gap-2 ${
                  sentimentModalEvents.type === 'positive' ? 'text-green-400' : 'text-red-400'
                }`}>
                  <i className={`${sentimentModalEvents.type === 'positive' ? 'fas fa-smile' : 'fas fa-frown'}`}></i>
                  {sentimentModalEvents.type === 'positive' ? 'Positive News' : 'Negative News'} 
                  ({sentimentModalEvents.events.length})
                </h3>
                <button 
                  onClick={() => setSentimentModalEvents(null)} 
                  className="text-gray-400 hover:text-white"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="space-y-3">
                {sentimentModalEvents.events.map((event) => (
                  <div 
                    key={event.id}
                    className={`bg-slate-700/30 rounded-lg p-3 cursor-pointer hover:bg-slate-700/50 transition border-l-4 ${
                      sentimentModalEvents.type === 'positive' ? 'border-green-500' : 'border-red-500'
                    }`}
                    onClick={() => {
                      setSelectedEvent(event);
                      setSentimentModalEvents(null);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-600 rounded">
                        {event.category}
                      </span>
                      {event.source === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-cyan-600/30 text-cyan-300 rounded">
                          admin
                        </span>
                      )}
                      {event.intensity !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-600/30 text-red-300 rounded">
                          {event.intensity}%
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        getSentimentScore(event) > 0 ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'
                      }`}>
                        <i className={`${getSentimentScore(event) > 0 ? 'fas fa-smile' : 'fas fa-frown'} mr-1`}></i>
                        {getSentimentScore(event) > 0 ? '+' : ''}{getSentimentScore(event)}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    {event.detail && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {event.detail}
                      </p>
                    )}
                    <div className="text-[10px] text-gray-500 mt-2">
                      {event.source === 'admin' ? (
                        <>Created: {event.createdAt && new Date(event.createdAt).toLocaleString()}</>
                      ) : (
                        <>Source: {event.source || 'GNews'} | {event.publishedAt && new Date(event.publishedAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}