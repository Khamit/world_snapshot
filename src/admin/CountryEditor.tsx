import { useState } from 'react';
import { CountryData } from '../data/countries';

const statusOptions = [
  { value: 'war', label: 'War', icon: 'fas fa-skull-crossbones', color: '#b91c1c' },
  { value: 'high_tension', label: 'High Tension', icon: 'fas fa-exclamation-triangle', color: '#ea580c' },
  { value: 'protests', label: 'Protests', icon: 'fas fa-fist-raised', color: '#eab308' },
  { value: 'stable', label: 'Stable', icon: 'fas fa-check-circle', color: '#16a34a' },
  { value: 'eco_crisis', label: 'Eco Crisis', icon: 'fas fa-leaf', color: '#0891b2' },
];

interface Props {
  countries: CountryData[];
  onUpdate: (updatedCountries: CountryData[]) => void;
}

export default function CountryEditor({ countries, onUpdate }: Props) {
  const [editingCountry, setEditingCountry] = useState<CountryData | null>(null);

  const handleSave = (updated: CountryData) => {
    const newCountries = countries.map(c =>
      c.id === updated.id ? updated : c
    );
    onUpdate(newCountries);
    setEditingCountry(null);
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4">
        {countries.map((country) => (
          <div key={country.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            {editingCountry?.id === country.id ? (
              <EditForm
                country={editingCountry}
                onSave={handleSave}
                onCancel={() => setEditingCountry(null)}
              />
            ) : (
              <ViewMode
                country={country}
                onEdit={() => setEditingCountry(country)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewMode({ country, onEdit }: { country: CountryData; onEdit: () => void }) {
  const status = statusOptions.find(s => s.value === country.status);
  const statusIcon = status?.icon || 'fas fa-info-circle';
  const statusLabel = status?.label || country.status;
  
  return (
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: country.color }}></span>
          <h3 className="text-xl font-bold">{country.name}</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-700">
            <i className={`${statusIcon} mr-1`}></i>
            {statusLabel}
          </span>
        </div>
        
        <p className="text-sm text-gray-300 mt-2">
          <i className="fas fa-info-circle text-cyan-400 mr-1 text-xs"></i>
          {country.summary}
        </p>
        
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <i className="fas fa-gun text-red-300 mt-0.5"></i>
            <span className="text-gray-300">{country.military}</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-landmark text-purple-300 mt-0.5"></i>
            <span className="text-gray-300">{country.politics}</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-tree text-green-300 mt-0.5"></i>
            <span className="text-gray-300">{country.eco}</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-microscope text-cyan-300 mt-0.5"></i>
            <span className="text-gray-300">{country.science}</span>
          </div>
        </div>
        
        <div className="border-t border-slate-700 mt-3 pt-2 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            <i className="fas fa-skull mr-1"></i>mortality (per/day)
          </span>
          <span className="font-mono font-bold text-red-400">{country.deaths_estimate}</span>
        </div>
      </div>
      
      <button onClick={onEdit} className="ml-4 px-3 py-1 bg-cyan-600 rounded-lg text-sm whitespace-nowrap">
        <i className="fas fa-edit mr-1"></i>
        Edit
      </button>
    </div>
  );
}

function EditForm({ country, onSave, onCancel }: { country: CountryData; onSave: (c: CountryData) => void; onCancel: () => void }) {
  const [edited, setEdited] = useState(country);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          <i className="fas fa-globe mr-1"></i>Country Name
        </label>
        <input
          type="text"
          value={edited.name}
          onChange={(e) => setEdited({ ...edited, name: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
      </div>
      
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          <i className="fas fa-chart-line mr-1"></i>Status
        </label>
        <select
          value={edited.status}
          onChange={(e) => {
            const status = statusOptions.find(s => s.value === e.target.value);
            setEdited({
              ...edited,
              status: e.target.value as CountryData['status'],
              color: status?.color || '#ffffff'
            });
          }}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          <i className="fas fa-align-left mr-1"></i>Summary
        </label>
        <textarea
          value={edited.summary}
          onChange={(e) => setEdited({ ...edited, summary: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            <i className="fas fa-gun mr-1"></i>Military
          </label>
          <input
            value={edited.military}
            onChange={(e) => setEdited({ ...edited, military: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            <i className="fas fa-landmark mr-1"></i>Politics
          </label>
          <input
            value={edited.politics}
            onChange={(e) => setEdited({ ...edited, politics: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            <i className="fas fa-tree mr-1"></i>Ecology
          </label>
          <input
            value={edited.eco}
            onChange={(e) => setEdited({ ...edited, eco: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            <i className="fas fa-microscope mr-1"></i>Science
          </label>
          <input
            value={edited.science}
            onChange={(e) => setEdited({ ...edited, science: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          <i className="fas fa-skull mr-1"></i>Deaths Estimate (per/day)
        </label>
        <input
          value={edited.deaths_estimate}
          onChange={(e) => setEdited({ ...edited, deaths_estimate: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
        />
      </div>
      
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(edited)} className="flex-1 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition">
          <i className="fas fa-save mr-1"></i>
          Save
        </button>
        <button onClick={onCancel} className="flex-1 px-4 py-2 bg-slate-600 rounded-lg hover:bg-slate-700 transition">
          <i className="fas fa-times mr-1"></i>
          Cancel
        </button>
      </div>
    </div>
  );
}