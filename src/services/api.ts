// services/api.ts
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const adminApi = {
  async updateCountry(id: string, data: any, token: string) {
    const response = await fetch(`${API_URL}/admin/countries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
    // ... остальные методы
};