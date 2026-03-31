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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const canRefresh = () => {
    if (!lastFetchTime) return true;
    const minutesSinceLastFetch = (new Date().getTime() - lastFetchTime.getTime()) / (1000 * 60);
    return minutesSinceLastFetch >= 30;
  };

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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'recent';
    }
  };

  if (loading) {
    return (
      <div className="mt-6 bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-bolt text-yellow-400"></i>
          <span className="font-semibold text-sm">lightning brief</span>
          <span className="text-xs text-gray-500 animate-pulse">loading...</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-700/50 rounded-xl animate-pulse"></div>
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
              <><i className="fas fa-spinner fa-spin mr-1"></i> Updating...</>
            ) : !canRefresh() ? (
              <><i className="fas fa-clock mr-1"></i> {formatTimeRemaining(timeRemaining)}</>
            ) : (
              <><i className="fas fa-sync-alt mr-1"></i> Update</>
            )}
          </button>
        </div>
        <p className="text-center text-gray-500 py-8 text-sm">No lightning brief data available. Click Update to fetch latest news.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-bolt text-yellow-400 animate-pulse"></i>
            <span className="font-semibold text-sm">LIGHTNING BRIEF</span>
            <span className="text-[10px] text-gray-500">
              {brief.lastUpdated ? new Date(brief.lastUpdated).toLocaleString() : 'unknown'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500">
              <i className="fas fa-newspaper mr-1"></i>
              {brief.source || 'Global Issues'}
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
        
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {brief.items.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const shortDescription = item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description;
            
            return (
              <div 
                key={item.id}
                className="bg-slate-800/50 rounded-xl p-3 hover:bg-slate-700/50 transition-all cursor-pointer border border-slate-700 hover:border-cyan-500/30 group"
                onClick={() => {
                  setSelectedEvent({
                    title: item.title,
                    detail: item.description,
                    url: item.url,
                    source: brief.source || 'Global Issues',
                    publishedAt: item.date,
                    category: 'brief'
                  });
                }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-cyan-600/30 text-cyan-300 rounded">
                        {formatDate(item.date)}
                      </span>
                    </div>

                    <h4 className="font-medium text-sm leading-tight group-hover:text-cyan-300 transition">
                      {item.title}
                    </h4>

                    <p className={`text-xs text-gray-400 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {isExpanded ? item.description : shortDescription}
                    </p>

                    {item.description.length > 100 && (
                      <button 
                        className="text-[10px] text-cyan-400/70 hover:text-cyan-300 mt-1 inline-flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation(); // важно!
                          toggleExpand(item.id);
                        }}
                      >
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[8px]`}></i>
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-3 pt-2 border-t border-slate-700 text-center">
          <span className="text-[10px] text-gray-500">
            <i className="fas fa-info-circle mr-1"></i>
            Click on any news to expand, click external link to open full article
          </span>
        </div>
      </div>
      
      {selectedEvent && (
        <NewsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}