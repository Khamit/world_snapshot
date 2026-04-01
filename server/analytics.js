import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

class Analytics {
  constructor() {
    this.measurementId = process.env.GA4_MEASUREMENT_ID;
    this.apiSecret = process.env.GA4_API_SECRET;
    
    this.enabled = !!(this.measurementId && this.apiSecret);
    
    if (this.enabled) {
      console.log('✅ GA4 Measurement Protocol enabled');
      console.log(`   Measurement ID: ${this.measurementId}`);
    } else {
      console.log('⚠️ GA4 disabled — missing GA4_MEASUREMENT_ID or GA4_API_SECRET');
      console.log(`   GA4_MEASUREMENT_ID: ${this.measurementId || 'missing'}`);
      console.log(`   GA4_API_SECRET: ${this.apiSecret ? 'set' : 'missing'}`);
    }
  }

  async sendEvent(clientId, eventName, eventParams = {}, req = null) {
    if (!this.enabled) return;

    try {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (req) {
        headers['User-Agent'] = req.get('user-agent') || 'WorldSnapshot/1.0';
      }
      
      const payload = {
        client_id: clientId,
        events: [{
          name: eventName,
          params: {
            engagement_time_msec: 100,
            session_id: clientId,
            ...eventParams
          }
        }]
      };

      // Не ждём ответа
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).catch(error => {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`GA4 error (${eventName}):`, error.message);
        }
      });
      
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('GA4 send error:', error.message);
      }
    }
  }

  // Только читаем cookie, НЕ устанавливаем
  getClientId(req) {
    return req.cookies?.cid || null;
  }
  
  // Новая функция для установки cookie (использовать до отправки ответа)
  setClientIdCookie(res, cid) {
    res.cookie('cid', cid, { 
      maxAge: 2 * 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }
  
  // Генерация нового ID
  generateClientId() {
    return uuidv4();
  }
}

export default new Analytics();