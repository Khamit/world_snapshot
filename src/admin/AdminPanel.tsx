// world_snapshot/src/admin/AdminPanel.tsx
import { useEffect, useState } from 'react';
import { CountryData, getAllCountries } from '../data/countries';
import BriefEditor from './BriefEditor';
import CountryEditor from './CountryEditor';
import EventsEditor from './EventsEditor';
import MetricsEditor from './MetricsEditor';

const ADMIN_TOKEN_KEY = 'admin_token';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'countries' | 'events' | 'metrics' | 'brief'>('countries');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState(null);

  // Инициализируем страны из статического файла
  useEffect(() => {
    setCountries(getAllCountries());
  }, []);

  // Проверка токена для остальных вкладок
  useEffect(() => {
    const savedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchSnapshot(savedToken);
    }
  }, []);

  const fetchSnapshot = async (authToken: string) => {
    try {
      const eventsRes = await fetch('/api/snapshot', {
        headers: { 'x-admin-token': authToken }
      });
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.globalEvents || []);
        setMetrics(data.globalMetrics);
      }
    } catch (error) {
      console.error('Failed to fetch events/metrics:', error);
    }
  };

  const handleUpdateCountries = (newCountries: CountryData[]) => {
    setCountries(newCountries);
    // Опционально: сохраняем в localStorage
    // localStorage.setItem('admin_countries', JSON.stringify(newCountries));
  };

  const handleLogin = () => {
    if (token.trim()) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      setIsAuthenticated(true);
      fetchSnapshot(token);
    } else {
      alert('Please enter a token');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthenticated(false);
    setToken('');
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
          />
          <button
            onClick={handleLogin}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Login
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
            onUpdate={handleUpdateCountries}
          />
        )}
        {activeTab === 'events' && (
          <EventsEditor
            events={events}
            token={token}
            onUpdate={() => fetchSnapshot(token)}
          />
        )}
        {activeTab === 'metrics' && (
          <MetricsEditor
            metrics={metrics}
            token={token}
            onUpdate={() => fetchSnapshot(token)}
          />
        )}
        {activeTab === 'brief' && (
          <BriefEditor
            token={token}
            onUpdate={() => fetchSnapshot(token)}
          />
        )}
      </div>
    </div>
  );
}