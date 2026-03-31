import { useState } from 'react';

const categories = ['military', 'disasters', 'politics', 'science', 'economy', 'health', 'popular'];

interface NewsEvent {
  id: string;
  category: string;
  title: string;
  detail?: string;
  intensity?: number;
  source?: string;
  publishedAt?: string;
  createdAt?: string;
  source_type?: 'api' | 'admin';
}

export default function EventsEditor({ token, events, onUpdate }: any) {
  const [activeTab, setActiveTab] = useState<'api' | 'admin'>('api');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingEvent, setEditingEvent] = useState<NewsEvent | null>(null);
  
  // Форма для нового события
  const [newEvent, setNewEvent] = useState({ 
    category: 'politics', 
    title: '', 
    detail: '', 
    intensity: 80 
  });

  // Разделяем события по источнику
  const apiEvents = events.filter((e: NewsEvent) => e.source !== 'admin');
  const adminEvents = events.filter((e: NewsEvent) => e.source === 'admin');

  // Фильтрация по категории
  const filterByCategory = (eventsList: NewsEvent[]) => {
    if (selectedCategory === 'all') return eventsList;
    return eventsList.filter(e => e.category === selectedCategory);
  };

  const filteredApiEvents = filterByCategory(apiEvents);
  const filteredAdminEvents = filterByCategory(adminEvents);

  const handleAdd = async () => {
    if (!newEvent.title) return;
    
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify(newEvent)
      });
      
      if (response.ok) {
        alert('Event added');
        setNewEvent({ category: 'politics', title: '', detail: '', intensity: 80 });
        onUpdate();
      }
    } catch (error) {
      alert('Failed to add event');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      
      if (response.ok) {
        alert('Event deleted');
        onUpdate();
      }
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const handleEdit = async () => {
    if (!editingEvent) return;
    
    try {
      // Для админских событий обновляем через API
      const response = await fetch(`/api/admin/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({
          title: editingEvent.title,
          detail: editingEvent.detail,
          category: editingEvent.category,
          intensity: editingEvent.intensity
        })
      });
      
      if (response.ok) {
        alert('Event updated');
        setEditingEvent(null);
        onUpdate();
      } else {
        alert('Failed to update event');
      }
    } catch (error) {
      alert('Error updating event');
    }
  };

  const EventCard = ({ event, isAdmin }: { event: NewsEvent; isAdmin: boolean }) => (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3">
      {editingEvent?.id === event.id ? (
        // Режим редактирования
        <div className="space-y-2">
          <select
            value={editingEvent.category}
            onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value })}
            className="w-full px-2 py-1 text-xs bg-slate-700 rounded"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>
          <input
            type="text"
            value={editingEvent.title}
            onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
            className="w-full px-2 py-1 text-sm bg-slate-700 rounded"
          />
          <textarea
            value={editingEvent.detail || ''}
            onChange={(e) => setEditingEvent({ ...editingEvent, detail: e.target.value })}
            className="w-full px-2 py-1 text-xs bg-slate-700 rounded"
            rows={2}
          />
          {isAdmin && (
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={editingEvent.intensity || 80}
                onChange={(e) => setEditingEvent({ ...editingEvent, intensity: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-cyan-400">{editingEvent.intensity}%</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleEdit} className="flex-1 px-2 py-1 bg-green-600 rounded text-xs">
              Save
            </button>
            <button onClick={() => setEditingEvent(null)} className="flex-1 px-2 py-1 bg-slate-600 rounded text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // Режим просмотра
        <>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                  {event.category}
                </span>
                <span className="font-medium text-sm">{event.title}</span>
                {isAdmin && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-cyan-600/30 text-cyan-300 rounded">
                    admin
                  </span>
                )}
                {event.intensity !== undefined && isAdmin && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-600/30 text-red-300 rounded">
                    {event.intensity}%
                  </span>
                )}
              </div>
              {event.detail && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {event.detail}
                </p>
              )}
              <div className="text-[10px] text-gray-500 mt-1">
                {event.source === 'admin' ? (
                  <>Created: {event.createdAt && new Date(event.createdAt).toLocaleString()}</>
                ) : (
                  <>Source: {event.source || 'GNews'} | {event.publishedAt && new Date(event.publishedAt).toLocaleDateString()}</>
                )}
              </div>
            </div>
            <div className="flex gap-1 ml-2">
              {isAdmin && (
                <button 
                  onClick={() => setEditingEvent(event)} 
                  className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1"
                >
                  Edit
                </button>
              )}
              <button 
                onClick={() => handleDelete(event.id)} 
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div>
      {/* Форма добавления нового события */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
        <h3 className="font-semibold mb-3">➕ Add New Event (Admin)</h3>
        <div className="space-y-3">
          <select
            value={newEvent.category}
            onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 rounded-lg"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Title"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 rounded-lg"
          />
          <textarea
            placeholder="Description"
            value={newEvent.detail}
            onChange={(e) => setNewEvent({ ...newEvent, detail: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 rounded-lg"
            rows={2}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Intensity:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={newEvent.intensity}
              onChange={(e) => setNewEvent({ ...newEvent, intensity: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm text-cyan-400 w-12">{newEvent.intensity}%</span>
          </div>
          <button onClick={handleAdd} className="w-full bg-cyan-600 py-2 rounded-lg font-semibold hover:bg-cyan-700 transition">
            Add Event
          </button>
        </div>
      </div>

      {/* Фильтр по категориям */}
      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs transition ${
              selectedCategory === 'all' 
                ? 'bg-cyan-600 text-white' 
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            All ({apiEvents.length + adminEvents.length})
          </button>
          {categories.map(cat => {
            const count = events.filter((e: NewsEvent) => e.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs transition ${
                  selectedCategory === cat 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {cat.toUpperCase()} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-4 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === 'api' 
              ? 'bg-cyan-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📰 API News ({filteredApiEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === 'admin' 
              ? 'bg-cyan-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ✏️ Admin Events ({filteredAdminEvents.length})
        </button>
      </div>

      {/* Список событий */}
      <div className="space-y-2">
        {activeTab === 'api' && filteredApiEvents.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No API events in this category
          </div>
        )}
        {activeTab === 'admin' && filteredAdminEvents.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No admin events yet. Add one above!
          </div>
        )}
        
        {activeTab === 'api' && filteredApiEvents.map((event: NewsEvent) => (
          <EventCard key={event.id} event={event} isAdmin={false} />
        ))}
        
        {activeTab === 'admin' && filteredAdminEvents.map((event: NewsEvent) => (
          <EventCard key={event.id} event={event} isAdmin={true} />
        ))}
      </div>
    </div>
  );
}