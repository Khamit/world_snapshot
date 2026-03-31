// components/NewsModal.tsx
import { NewsEvent } from "../types";

interface NewsModalProps {
  event: NewsEvent;
  onClose: () => void;
}

// Функция для получения цвета и иконки тональности
const getSentimentDisplay = (score: number) => {
  if (score <= -60) return { 
    label: 'Catastrophic', 
    color: 'text-red-600', 
    bgColor: 'bg-red-950/50',
    barColor: '#dc2626',
    icon: 'fas fa-skull',
    description: 'Extremely negative - major crisis or catastrophe'
  };
  if (score <= -30) return { 
    label: 'Critical', 
    color: 'text-red-500', 
    bgColor: 'bg-red-900/30',
    barColor: '#ef4444',
    icon: 'fas fa-exclamation-triangle',
    description: 'Strongly negative - serious concerns'
  };
  if (score <= -10) return { 
    label: 'Negative', 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-900/30',
    barColor: '#f97316',
    icon: 'fas fa-frown',
    description: 'Moderately negative - concerning developments'
  };
  if (score <= 10) return { 
    label: 'Neutral', 
    color: 'text-gray-400', 
    bgColor: 'bg-gray-800/50',
    barColor: '#6b7280',
    icon: 'fas fa-meh',
    description: 'Balanced or mixed sentiment'
  };
  if (score <= 30) return { 
    label: 'Positive', 
    color: 'text-green-500', 
    bgColor: 'bg-green-900/30',
    barColor: '#22c55e',
    icon: 'fas fa-smile',
    description: 'Moderately positive - encouraging news'
  };
  if (score <= 60) return { 
    label: 'Optimistic', 
    color: 'text-green-400', 
    bgColor: 'bg-green-900/30',
    barColor: '#4ade80',
    icon: 'fas fa-grin',
    description: 'Strongly positive - significant progress'
  };
  return { 
    label: 'Excellent', 
    color: 'text-green-300', 
    bgColor: 'bg-green-900/30',
    barColor: '#86efac',
    icon: 'fas fa-star',
    description: 'Exceptionally positive - major breakthrough'
  };
};

// Функция для определения уровня интенсивности с пояснениями
const getIntensityLevel = (intensity: number) => {
  if (intensity >= 80) return { 
    label: 'CRITICAL', 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/20',
    description: 'Immediate threat or active crisis - requires urgent attention'
  };
  if (intensity >= 60) return { 
    label: 'HIGH', 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/20',
    description: 'Significant impact - major developments unfolding'
  };
  if (intensity >= 40) return { 
    label: 'MODERATE', 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-500/20',
    description: 'Notable events - watch closely'
  };
  if (intensity >= 20) return { 
    label: 'LOW', 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/20',
    description: 'Minor developments - routine monitoring'
  };
  return { 
    label: 'MINIMAL', 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/20',
    description: 'Background noise - low impact'
  };
};

// Функция для получения рассчитанного sentiment из intensity если его нет
const getEffectiveSentiment = (event: NewsEvent): number | undefined => {
  if (event.sentimentScore !== undefined) {
    return event.sentimentScore;
  }
  if (event.intensity !== undefined) {
    return Math.round((50 - event.intensity) * 1.2);
  }
  return undefined;
};

export default function NewsModal({ event, onClose }: NewsModalProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'date unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'incorrect date';
    }
  };

  const effectiveSentiment = getEffectiveSentiment(event);
  const sentimentDisplay = effectiveSentiment !== undefined 
    ? getSentimentDisplay(effectiveSentiment) 
    : null;
  
  const intensityLevel = event.intensity !== undefined ? getIntensityLevel(event.intensity) : null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">{event.title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Теги с метриками */}
            <div className="flex gap-2 text-sm flex-wrap">
              <span className="px-2 py-1 bg-slate-700 rounded">
                <i className="fas fa-tag mr-1 text-xs"></i>
                {event.category}
              </span>
              
              {event.intensity !== undefined && intensityLevel && (
                <div className="group relative">
                  <span className={`px-2 py-1 rounded ${intensityLevel.bgColor} cursor-help`}>
                    <i className="fas fa-waveform mr-1 text-xs"></i>
                    <span className={intensityLevel.color}>
                      intensity: {event.intensity}% ({intensityLevel.label})
                    </span>
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 w-64 p-2 bg-slate-900 border border-slate-600 rounded-lg text-[10px] text-gray-300">
                    <i className="fas fa-info-circle mr-1 text-cyan-400"></i>
                    {intensityLevel.description}
                  </div>
                </div>
              )}
              
              {effectiveSentiment !== undefined && sentimentDisplay && (
                <div className="group relative">
                  <span className={`px-2 py-1 rounded ${sentimentDisplay.bgColor} cursor-help`}>
                    <i className={`${sentimentDisplay.icon} mr-1 text-xs ${sentimentDisplay.color}`}></i>
                    <span className={sentimentDisplay.color}>
                      sentiment: {effectiveSentiment > 0 ? '+' : ''}{effectiveSentiment}
                      {event.sentimentScore === undefined && <span className="text-[9px] ml-1">(est.)</span>}
                    </span>
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 w-64 p-2 bg-slate-900 border border-slate-600 rounded-lg text-[10px] text-gray-300">
                    <i className="fas fa-info-circle mr-1 text-cyan-400"></i>
                    {sentimentDisplay.description}
                  </div>
                </div>
              )}
            </div>
            
            {/* Блок интенсивности с пояснением */}
            {event.intensity !== undefined && (
              <div className="mt-2 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-400 flex items-center gap-1">
                    <i className="fas fa-waveform"></i>
                    Event Intensity Scale
                    <div className="group relative inline-block">
                      <i className="fas fa-question-circle text-gray-500 text-[10px] cursor-help"></i>
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 w-64 p-2 bg-slate-900 border border-slate-600 rounded-lg text-[10px] text-gray-300">
                        <strong className="text-cyan-400">Intensity Scale:</strong><br/>
                        • 80-100%: Critical - Immediate threat<br/>
                        • 60-79%: High - Significant impact<br/>
                        • 40-59%: Moderate - Notable events<br/>
                        • 20-39%: Low - Minor developments<br/>
                        • 0-19%: Minimal - Background noise
                      </div>
                    </div>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Level:</span>
                    <span className={`font-bold ${intensityLevel?.color}`}>
                      {intensityLevel?.label}
                    </span>
                    <span className="text-gray-400">({event.intensity}%)</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${event.intensity}%`,
                      backgroundColor: event.intensity >= 80 ? '#dc2626' : 
                                     event.intensity >= 60 ? '#ef4444' : 
                                     event.intensity >= 40 ? '#f97316' : 
                                     event.intensity >= 20 ? '#eab308' : '#22c55e'
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Minimal</span>
                  <span>Moderate</span>
                  <span>Critical</span>
                </div>
                <div className="mt-2 text-[10px] text-gray-400 border-t border-slate-600 pt-2">
                  <i className="fas fa-chart-line mr-1"></i>
                  {intensityLevel?.description}
                </div>
              </div>
            )}
            
            {/* Блок тональности с пояснением */}
            {effectiveSentiment !== undefined && sentimentDisplay && (
              <div className={`p-3 ${sentimentDisplay.bgColor} rounded-lg border ${sentimentDisplay.color.replace('text', 'border')}/20`}>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-400 flex items-center gap-1">
                    <i className={`${sentimentDisplay.icon}`}></i>
                    Sentiment Analysis
                    <div className="group relative inline-block">
                      <i className="fas fa-question-circle text-gray-500 text-[10px] cursor-help"></i>
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 w-64 p-2 bg-slate-900 border border-slate-600 rounded-lg text-[10px] text-gray-300">
                        <strong className="text-cyan-400">Sentiment Scale:</strong><br/>
                        • -100 to -61: Catastrophic<br/>
                        • -60 to -31: Critical<br/>
                        • -30 to -11: Negative<br/>
                        • -10 to +10: Neutral<br/>
                        • +11 to +30: Positive<br/>
                        • +31 to +60: Optimistic<br/>
                        • +61 to +100: Excellent
                      </div>
                    </div>
                    {event.sentimentScore === undefined && (
                      <span className="text-[9px] text-gray-500 ml-1">(estimated from intensity)</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Score:</span>
                    <span className={`font-bold ${sentimentDisplay.color}`}>
                      {effectiveSentiment > 0 ? '+' : ''}{effectiveSentiment}
                    </span>
                    <span className={`text-xs ${sentimentDisplay.color}`}>
                      ({sentimentDisplay.label})
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(effectiveSentiment + 100) / 2}%`,
                      backgroundColor: sentimentDisplay.barColor
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Negative</span>
                  <span>Neutral</span>
                  <span>Positive</span>
                </div>
                <div className="mt-2 text-[10px] text-gray-400 border-t border-slate-600 pt-2">
                  <i className="fas fa-chart-simple mr-1"></i>
                  {sentimentDisplay.description}
                </div>
              </div>
            )}
            
            {/* Описание новости */}
            <p className="text-gray-300 leading-relaxed">{event.detail || 'No description'}</p>
            
            {/* Ссылка на источник */}
            {event.url && (
              <a 
                href={event.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition"
              >
                <i className="fas fa-external-link-alt"></i>
                Read original source
              </a>
            )}
            
            {/* Мета-информация */}
            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-slate-700">
              {event.source && (
                <div className="flex items-center gap-1">
                  <i className="fas fa-newspaper text-[10px]"></i>
                  <span>Source: {event.source}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <i className="far fa-calendar-alt text-[10px]"></i>
                <span>Date: {formatDate(event.publishedAt || event.createdAt)}</span>
              </div>
              {event.source === 'admin' && event.createdAt && (
                <div className="flex items-center gap-1 text-cyan-400/70">
                  <i className="fas fa-pen-alt text-[10px]"></i>
                  <span>* created by admin</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-gray-600 text-[9px] mt-2 pt-1 border-t border-slate-700/50">
                <i className="fas fa-chart-line"></i>
                <span>Intensity: measures event severity (0-100)</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600 text-[9px]">
                <i className="fas fa-smile"></i>
                <span>Sentiment: measures emotional tone (-100 to +100)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}