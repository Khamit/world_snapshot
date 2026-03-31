// components/NewsModal.tsx
import { NewsEvent } from "../types";

interface NewsModalProps {
  event: NewsEvent;
  onClose: () => void;
}

export default function NewsModal({ event, onClose }: NewsModalProps) {
  // Функция для безопасного форматирования даты
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'date unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'incorrect date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">{event.title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2 text-sm flex-wrap">
              <span className="px-2 py-1 bg-slate-700 rounded">{event.category}</span>
              {event.intensity !== undefined && (
                <span className="px-2 py-1 bg-slate-700 rounded">
                  интенсивность: {event.intensity}%
                </span>
              )}
              {event.sentimentScore !== undefined && (
                <span className="px-2 py-1 bg-slate-700 rounded">
                  тональность: {event.sentimentScore > 0 ? '+' : ''}{event.sentimentScore}
                </span>
              )}
            </div>
            
            <p className="text-gray-300 leading-relaxed">{event.detail || 'No description'}</p>
            
            {event.url && (
              <a 
                href={event.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
              >
                <i className="fas fa-external-link-alt"></i>
                Read original
              </a>
            )}
            
            <div className="text-xs text-gray-500 space-y-1">
              {event.source && (
                <div>Source: {event.source}</div>
              )}
              <div>
                Дата: {formatDate(event.publishedAt || event.createdAt)}
              </div>
              {event.source === 'admin' && event.createdAt && (
                <div className="text-cyan-400/70">* created by admin</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}