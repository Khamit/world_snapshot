// admin/BriefEditor.tsx
import { useEffect, useState } from 'react';
/*
world_snapshot/src/admin/BriefEditor.tsx — аналогичная проблема
Строка 5: const API_URL = import.meta.env.VITE_API_URL; 
— не будет работать на сервере
Нужно: Использовать относительный путь /api/...
*/

export default function BriefEditor({ onUpdate }: any) {
  const [brief, setBrief] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const fetchBrief = async () => {
    try {
      const response = await fetch('/api/lightning-brief');
      if (response.ok) {
        const data = await response.json();
        setBrief(data);
        setLastFetchTime(new Date(data.lastUpdated));
      }
    } catch (error) {
      console.error('Failed to fetch brief:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Уберите заголовок x-admin-token, если он не нужен для этого эндпоинта
      const response = await fetch('/api/fetch-brief', {
        method: 'POST',
        // headers: { 'x-admin-token': token }
      });
      if (response.ok) {
        alert('Lightning brief refreshed successfully');
        await fetchBrief();
        onUpdate();
      } else {
        alert('Failed to refresh brief');
      }
    } catch (error) {
      alert('Error refreshing brief');
    } finally {
      setRefreshing(false);
    }
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

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Lightning Brief Management</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !canRefresh()}
          className={`px-4 py-2 rounded-lg text-sm transition ${
            refreshing || !canRefresh()
              ? 'bg-slate-700 text-gray-500 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
          }`}
        >
          {refreshing ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i> Refreshing...</>
          ) : !canRefresh() ? (
            <><i className="fas fa-clock mr-2"></i> Wait {formatTimeRemaining(timeRemaining)}</>
          ) : (
            <><i className="fas fa-sync-alt mr-2"></i> Refresh from Global Issues</>
          )}
        </button>
      </div>
      
      {brief && (
        <div className="space-y-2">
          <div className="text-sm text-gray-400">
            <div>Source: {brief.source}</div>
            <div>Last updated: {new Date(brief.lastUpdated).toLocaleString()}</div>
            <div>Items: {brief.items?.length || 0}</div>
            {!canRefresh() && (
              <div className="text-yellow-400 text-xs mt-1">
                Next refresh available in {formatTimeRemaining(timeRemaining)}
              </div>
            )}
          </div>
          
          <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
            {brief.items?.map((item: any) => (
              <div key={item.id} className="bg-slate-700/30 rounded-lg p-3 text-sm">
                <div className="font-medium">{item.title}</div>
                {item.description && (
                  <div className="text-xs text-gray-400 mt-1">{item.description.substring(0, 100)}...</div>
                )}
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 inline-block"
                >
                  Read more →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}