// world_snapshot/src/hooks/useGlobalData.ts

import { useState, useEffect } from "react";
import { GlobalData } from "../types";
import localData from "../data/events.json";

const API_URL = import.meta.env.VITE_API_URL || "/api/snapshot";

export function useGlobalData() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useRemote, setUseRemote] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (useRemote) {
          const response = await fetch(API_URL);
          if (!response.ok) throw new Error("Failed to fetch remote data");
          const remoteData = await response.json();
          setData(remoteData as GlobalData);
        } else {
          // Исправлено: приведение через unknown
          setData(localData as unknown as GlobalData);
        }
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setData(localData as unknown as GlobalData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [useRemote]);

  return { data, loading, error, useRemote, setUseRemote };
}