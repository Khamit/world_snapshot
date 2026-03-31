import { useState } from 'react';

const categories = ['military', 'disasters', 'politics', 'science', 'popular'];

/*
const API_URL = import.meta.env.VITE_API_URL;

Нужно: Заменить на прямой вызов с токеном
*/

export default function EventsEditor({ token, events, onUpdate }: any) {
  const [newEvent, setNewEvent] = useState({ category: 'politics', title: '', detail: '', intensity: 80 });

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

  return (
    <div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
        <h3 className="font-semibold mb-3">Add New Event</h3>
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
          <input
            type="range"
            min="0"
            max="100"
            value={newEvent.intensity}
            onChange={(e) => setNewEvent({ ...newEvent, intensity: parseInt(e.target.value) })}
            className="w-full"
          />
          <button onClick={handleAdd} className="w-full bg-cyan-600 py-2 rounded-lg font-semibold">
            Add Event
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {events.map((event: any) => (
          <div key={event.id} className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">{event.category}</span>
                <span className="font-medium">{event.title}</span>
              </div>
              {event.detail && <p className="text-xs text-gray-400 mt-1">{event.detail.substring(0, 100)}</p>}
            </div>
            <button onClick={() => handleDelete(event.id)} className="ml-2 text-red-400 hover:text-red-300">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}