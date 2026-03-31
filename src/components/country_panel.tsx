// world_snapshot/src/components/country_panel.tsx
import { CountryData } from "../data/countries";

const statusLabels: Record<string, { label: string; icon: string; color: string }> = {
  war: { label: "war", icon: "fas fa-skull-crossbones", color: "text-red-400" },
  high_tension: { label: "high tension", icon: "fas fa-exclamation-triangle", color: "text-orange-400" },
  protests: { label: "protests", icon: "fas fa-fist-raised", color: "text-yellow-400" },
  stable: { label: "stable", icon: "fas fa-check-circle", color: "text-green-400" },
  eco_crisis: { label: "eco crisis", icon: "fas fa-leaf", color: "text-cyan-400" },
};

export default function CountryPanel({ country }: { country: CountryData | null }) {
  if (!country) {
    return (
      <div className="text-center py-10 text-gray-400">
        <i className="fas fa-map-marked-alt text-5xl mb-3 opacity-50"></i>
        <p className="text-sm">click on any country on the map</p>
        <p className="text-xs mt-2 text-gray-500">to see military, political,<br />environmental and scientific summary</p>
      </div>
    );
  }

  const status = statusLabels[country.status] || { label: country.status, icon: "fas fa-info-circle", color: "text-gray-400" };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold">{country.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full bg-slate-700 ${status.color}`}>
          <i className={`${status.icon} mr-1`}></i>
          {status.label}
        </span>
      </div>

      <p className="text-gray-200 leading-relaxed">
        <i className="fas fa-info-circle text-cyan-400 mr-1 text-xs"></i>
        {country.summary}
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-700/30 rounded-lg p-3">
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

      <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
        <span className="text-xs text-gray-400">
          <i className="fas fa-skull mr-1"></i>mortality (per/day)
        </span>
        <span className="font-mono font-bold text-red-400">{country.deaths_estimate}</span>
      </div>
    </div>
  );
}