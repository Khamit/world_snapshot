// world_snapshot/src/admin/AdminPanel.tsx
import { useEffect, useState } from 'react';
import { CountryData, getAllCountries } from '../data/countries';
import BriefEditor from './BriefEditor';
import CountryEditor from './CountryEditor';
import EventsEditor from './EventsEditor';
import MetricsEditor from './MetricsEditor';

interface NewsEvent {
  id: string;
  category: string;
  title: string;
  detail?: string;
  intensity?: number;
  source?: string;
  publishedAt?: string;
  createdAt?: string;
  url?: string;
}

interface GlobalMetrics {
  dailyDeaths: number;
  hourlyDeaths: number;
  minuteDeaths: number;
  secondDeaths: number;
  deathsChange: string;
  activeConflicts: number;
  ecoCrises: number;
  politicalInstabilityDelta: string;
  scientificBreakthroughs: number;
  healthCrises: number;
  economicStress: number;
}

const ADMIN_TOKEN_KEY = 'admin_token';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'countries' | 'events' | 'metrics' | 'brief'>('countries');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setCountries(getAllCountries());
  }, []);

  // Проверяем сохраненный токен при загрузке
  useEffect(() => {
    const savedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (savedToken) {
      verifyToken(savedToken);
    }
  }, []);

  const notifyDataUpdate = () => {
    // For cross-tab communication
    localStorage.setItem('adminDataUpdated', 'true');
    // For same-tab communication
    window.dispatchEvent(new CustomEvent('admin-data-updated'));
  };

  const fetchEvents = async (authToken: string) => {
    try {
      const response = await fetch('/api/snapshot', {
        headers: { 'x-admin-token': authToken }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allEvents: NewsEvent[] = [...(data.globalEvents || []), ...(data.adminEvents || [])];
        setEvents(allEvents);
        setMetrics(data.globalMetrics);
      }
    } catch (error) {
      console.error('Failed to fetch events/metrics:', error);
    }
  };

  const handleAddEvent = async (eventData: Omit<NewsEvent, 'id' | 'createdAt' | 'source'>) => {
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-admin-token': token 
        },
        body: JSON.stringify(eventData)
      });
      
      if (response.ok) {
        // Notify main app to refresh data
        notifyDataUpdate();
        // Refresh admin panel data
        await fetchEvents(token);
      }
      return response.ok;
    } catch (error) {
      console.error('Error adding event:', error);
      return false;
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<NewsEvent>) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'x-admin-token': token 
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        notifyDataUpdate();
        await fetchEvents(token);
      }
      return response.ok;
    } catch (error) {
      console.error('Error updating event:', error);
      return false;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      
      if (response.ok) {
        notifyDataUpdate();
        await fetchEvents(token);
      }
      return response.ok;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  };

  // Проверка токена на сервере
  const verifyToken = async (authToken: string) => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/snapshot', {
        headers: { 'x-admin-token': authToken }
      });
      
      if (response.ok) {
        // Токен правильный
        setToken(authToken);
        setIsAuthenticated(true);
        const data = await response.json();
        const allEvents: NewsEvent[] = [...(data.globalEvents || []), ...(data.adminEvents || [])];
        setEvents(allEvents);
        setMetrics(data.globalMetrics);
      } else {
        // Токен неверный - удаляем из localStorage
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken('');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setIsAuthenticated(false);
    } finally {
      setIsVerifying(false);
    }
  };

  // ФУНКЦИЯ ЛОГИНА
  const handleLogin = async () => {
    if (!token.trim()) {
      alert('Please enter a token');
      return;
    }
    
    setIsVerifying(true);
    try {
      const response = await fetch('/api/snapshot', {
        headers: { 'x-admin-token': token }
      });
      
      if (response.ok) {
        // Токен правильный
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
        setIsAuthenticated(true);
        const data = await response.json();
        const allEvents: NewsEvent[] = [...(data.globalEvents || []), ...(data.adminEvents || [])];
        setEvents(allEvents);
        setMetrics(data.globalMetrics);
      } else {
        // Токен неверный
        alert('Invalid admin token');
        setToken('');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Failed to connect to server');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthenticated(false);
    setToken('');
  };

  const handleUpdateCountries = (newCountries: CountryData[]) => {
    setCountries(newCountries);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-96">
          <h2 className="text-2xl font-bold mb-4 text-white">Admin Login</h2>
          <input
            type="password"
            placeholder="Enter admin token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white mb-4"
            disabled={isVerifying}
          />
          <button
            onClick={handleLogin}
            disabled={isVerifying}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Verifying...' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-700">
          {(['countries', 'events', 'metrics', 'brief'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg transition ${
                activeTab === tab
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'countries' && 'Countries & Tension Levels'}
              {tab === 'events' && 'News Events'}
              {tab === 'metrics' && 'Global Metrics'}
              {tab === 'brief' && 'Lightning Brief'}
            </button>
          ))}
        </div>

        {activeTab === 'countries' && (
          <CountryEditor
            countries={countries}
            token={token}  // Добавляем передачу token
            onUpdate={handleUpdateCountries}
          />
        )}
        {activeTab === 'events' && (
          <EventsEditor
            events={events}
            token={token}
            onUpdate={() => fetchEvents(token)}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        )}
        {activeTab === 'metrics' && (
          <MetricsEditor
            metrics={metrics}
            token={token}
            onUpdate={() => fetchEvents(token)}
          />
        )}
        {activeTab === 'brief' && (
          <BriefEditor
            token={token}
            onUpdate={() => fetchEvents(token)}
          />
        )}
      </div>
    </div>
  );
}