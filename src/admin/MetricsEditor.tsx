// world_snapshot/src/admin/MetricsEditor.tsx
import { useState } from 'react';

// Функция для уведомления главного приложения об обновлении
const notifyMainApp = () => {
  localStorage.setItem('adminDataUpdated', 'true');
  window.dispatchEvent(new CustomEvent('admin-data-updated'));
};

export default function MetricsEditor({ token, metrics, onUpdate }: any) {
  const [editMetrics, setEditMetrics] = useState(metrics || {});

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/metrics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify(editMetrics)
      });
      
      if (response.ok) {
        alert('Metrics updated');
        notifyMainApp(); // Уведомляем главное приложение
        onUpdate(); // Обновляем админку
      }
    } catch (error) {
      alert('Failed to update');
    }
  };

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h3 className="font-semibold mb-4">Global Metrics</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Daily Deaths</label>
          <input
            type="number"
            value={editMetrics.dailyDeaths}
            onChange={(e) => setEditMetrics({ ...editMetrics, dailyDeaths: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-700 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Deaths Change (%)</label>
          <input
            type="text"
            value={editMetrics.deathsChange}
            onChange={(e) => setEditMetrics({ ...editMetrics, deathsChange: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Active Conflicts</label>
          <input
            type="number"
            value={editMetrics.activeConflicts}
            onChange={(e) => setEditMetrics({ ...editMetrics, activeConflicts: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-700 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Eco Crises</label>
          <input
            type="number"
            value={editMetrics.ecoCrises}
            onChange={(e) => setEditMetrics({ ...editMetrics, ecoCrises: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-700 rounded-lg"
          />
        </div>
        
        <button onClick={handleSave} className="w-full bg-cyan-600 py-2 rounded-lg font-semibold">
          Save Metrics
        </button>
      </div>
    </div>
  );
}