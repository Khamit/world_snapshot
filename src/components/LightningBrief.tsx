// components/LightningBrief.tsx
import { useEffect, useState } from 'react';
import NewsModal from './NewsModal';

interface BriefItem {
  id: string;
  title: string;
  description: string;
  url: string;
  date: string;
  category: string;
}

interface LightningBriefData {
  items: BriefItem[];
  lastUpdated: string;
  source: string;
}

export default function LightningBrief() {
  const [brief, setBrief] = useState<LightningBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const fetchBrief = async () => {
    try {
      const response = await fetch('/api/lightning-brief');
      if (response.ok) {
        const data: LightningBriefData = await response.json();
        setBrief(data);
        setLastFetchTime(new Date(data.lastUpdated));
      }
    } catch (err) {
      console.error('Failed to load lightning brief:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/fetch-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchBrief();
          alert('Lightning brief refreshed successfully!');
        }
      } else {
        alert('Failed to refresh lightning brief');
      }
    } catch (error) {
      console.error('Error refreshing brief:', error);
      alert('Error refreshing lightning brief');
    } finally {
      setRefreshing(false);
    }
  };

  // Проверяем, можно ли обновлять (раз в 30 минут)
  const canRefresh = () => {
    if (!lastFetchTime) return true;
    const minutesSinceLastFetch = (new Date().getTime() - lastFetchTime.getTime()) / (1000 * 60);
    return minutesSinceLastFetch >= 30;
  };

  // Обновляем таймер
  useEffect(() => {
    fetchBrief();
  }, []);

  useEffect(() => {
    if (!lastFetchTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const nextAvailable = lastFetchTime.getTime() + 30 * 60 * 1000;
      const remaining = Math.max(0, Math.ceil((nextAvailable - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastFetchTime]);

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="mt-6 bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-bolt text-yellow-400"></i>
          <span className="font-semibold text-sm">lightning brief</span>
          <span className="text-xs text-gray-500 animate-pulse">loading...</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-24 bg-slate-700/50 rounded-full animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!brief || !brief.items || brief.items.length === 0) {
    return (
      <div className="mt-6 bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-bolt text-yellow-400"></i>
            <span className="font-semibold text-sm">lightning brief</span>
            <span className="text-xs text-gray-500">no data</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || !canRefresh()}
            className={`px-3 py-1 rounded-lg text-xs transition ${
              refreshing || !canRefresh()
                ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }`}
          >
            {refreshing ? (
              <><i className="fas fa-spinner fa-spin mr-1"></i> Обновление...</>
            ) : !canRefresh() ? (
              <><i className="fas fa-clock mr-1"></i> {formatTimeRemaining(timeRemaining)}</>
            ) : (
              <><i className="fas fa-sync-alt mr-1"></i> Обновить</>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-bolt text-yellow-400"></i>
            <span className="font-semibold text-sm">lightning brief</span>
            <span className="text-xs text-gray-500">
              {brief.lastUpdated ? new Date(brief.lastUpdated).toLocaleString() : 'неизвестно'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500">
              source: {brief.source || 'Global Issues'}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing || !canRefresh()}
              className={`px-3 py-1 rounded-lg text-xs transition ${
                refreshing || !canRefresh()
                  ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              }`}
            >
              {refreshing ? (
                <><i className="fas fa-spinner fa-spin mr-1"></i> Updating...</>
              ) : !canRefresh() ? (
                <><i className="fas fa-clock mr-1"></i> {formatTimeRemaining(timeRemaining)}</>
              ) : (
                <><i className="fas fa-sync-alt mr-1"></i> Update</>
              )}
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 text-xs">
          {brief.items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedEvent({
                title: item.title,
                detail: item.description,
                url: item.url,
                source: brief.source || 'Global Issues',
                publishedAt: item.date
              })}
              className="bg-slate-800 px-3 py-1 rounded-full hover:bg-slate-700 transition cursor-pointer text-left"
            >
              {item.title.length > 40 ? item.title.substring(0, 40) + '...' : item.title}
            </button>
          ))}
        </div>
      </div>
      
      {selectedEvent && (
        <NewsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}