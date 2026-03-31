// world_snapshot/src/hooks/useGlobalData.ts
import { useEffect, useState } from "react";
import localData from "../data/events.json";
import { GlobalData } from "../types";

const API_URL = import.meta.env.VITE_API_URL || '/api/public/snapshot';
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

export function useGlobalData() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useRemote, setUseRemote] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [serverConfig, setServerConfig] = useState<{
    updateSchedule: string;
    timezone: string;
    nextUpdate: string;
    updateInterval: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (useRemote) {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch remote data");
        const remoteData = await response.json();
        setData(remoteData as GlobalData);
        setLastUpdated(new Date());
      } else {
        setData(localData as unknown as GlobalData);
        setLastUpdated(new Date());
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setData(localData as unknown as GlobalData);
    } finally {
      setLoading(false);
    }
  };

  const fetchServerConfig = async () => {
    try {
      const response = await fetch('/api/server/config');
      if (response.ok) {
        const config = await response.json();
        setServerConfig(config);
      }
    } catch (err) {
      console.error('Failed to fetch server config:', err);
    }
  };

  // Function to manually trigger data refresh
  const refetch = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
    fetchServerConfig();
    
    // Auto-refresh every 10 minutes only if remote mode is enabled
    let intervalId: NodeJS.Timeout | null = null;
    
    if (useRemote) {
      intervalId = setInterval(() => {
        console.log('Auto-refreshing data...');
        fetchData();
      }, AUTO_REFRESH_INTERVAL);
    }
    
    // Set up event listener for admin updates via localStorage
    const handleAdminUpdate = (event: StorageEvent) => {
      if (event.key === 'adminDataUpdated' && event.newValue === 'true') {
        console.log('Admin updated data, refreshing...');
        fetchData();
        // Clear the flag
        localStorage.removeItem('adminDataUpdated');
      }
    };
    
    window.addEventListener('storage', handleAdminUpdate);
    
    // Also listen for custom events (for same-tab updates)
    const handleCustomUpdate = () => {
      console.log('Custom update event received, refreshing...');
      fetchData();
    };
    
    window.addEventListener('admin-data-updated', handleCustomUpdate);
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener('storage', handleAdminUpdate);
      window.removeEventListener('admin-data-updated', handleCustomUpdate);
    };
  }, [useRemote]);

  return { 
    data, 
    loading, 
    error, 
    useRemote, 
    setUseRemote, 
    refetch, 
    lastUpdated,
    serverConfig 
  };
}