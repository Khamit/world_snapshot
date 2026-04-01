// world_snapshot/server/index.js
import * as cheerio from 'cheerio';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs, { mkdirSync } from 'fs';
import helmet from 'helmet';
import cron from 'node-cron';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import analytics from './analytics.js';
import { analyzeSentiment, calculateIntensity, categorizeNews, isOutdated } from './analyzer_new.js';
let nodemailer;


try {
  const nm = await import('nodemailer');
  nodemailer = nm.default || nm;
} catch (e) {
  console.log('nodemailer not installed, email alerts disabled');
}

let cachedData = null;
let lastFetchTime = null;

dotenv.config();

// Общий лимит для всех API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов
  message: { error: 'Too many requests, please try again later.' }
});

// Более строгий лимит для тяжелых эндпоинтов
const heavyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 10, // максимум 10 запросов
  message: { error: 'Rate limit exceeded for this operation.' }
});

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secret-token-here';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = process.env.PORT || 3000;

// Настройка email транспорта
const emailTransporter = (nodemailer && process.env.SMTP_HOST) 
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

// Замените существующий logger на этот
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Все логи в файл
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Добавляем console в development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Функция для логирования с уведомлениями
function logWithAlert(level, message, error = null, sendAlert = false) {
  const logData = { message };
  if (error) {
    logData.error = error.stack || error.message || error;
  }
  
  // Преобразуем 'crit' в 'error' для winston
  const winstonLevel = level === 'crit' ? 'error' : level;
  logger.log(winstonLevel, message, logData);
  
  if (sendAlert && (level === 'error' || level === 'crit')) {
    sendCriticalAlert(message, logData.error || message, error);
  }
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://world-snapshot.onrender.com', process.env.FRONTEND_URL].filter(Boolean)
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://www.googletagmanager.com",
          "https://app.termly.io",
          "https://cdn-cookieyes.com",
          "https://www.google-analytics.com",
          "https://ssl.google-analytics.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
          "data:",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://www.google-analytics.com",
          "https://ssl.google-analytics.com",
        ],
        connectSrc: [
          "'self'",
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com",
          "https://app.termly.io",
        ],
        frameSrc: ["'self'", "https://app.termly.io"],
      },
    },
  })
);
app.use(compression());
app.use(cookieParser());

// Middleware для отслеживания всех запросов
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Получаем или создаем clientId ДО отправки ответа
  let clientId = analytics.getClientId(req);
  if (!clientId) {
    clientId = analytics.generateClientId();
    analytics.setClientIdCookie(res, clientId);
  }
  
  // Сохраняем clientId в req для использования в обработчиках
  req.clientId = clientId;

  // Сохраняем время начала для расчета длительности
  req._startTime = Date.now();
  
  // Добавляем обработчик окончания ответа (без установки cookie!)
  res.on('finish', () => {
    const duration = Date.now() - req._startTime;
    
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const country = req.headers['cf-ipcountry'] || 
                    req.headers['x-country-code'] || 
                    'unknown';
    
    // Отправляем page_view для всех GET запросов
    if (req.method === 'GET') {
      analytics.sendEvent(req.clientId, 'page_view', {
        page_title: req.path,
        page_location: fullUrl,
        page_referrer: req.get('referer') || '',
        country: country,
        response_time_ms: duration,
        status_code: res.statusCode
      }, req);
    }
    
    // Отправляем API запросы отдельно
    if (req.path.startsWith('/api/')) {
      analytics.sendEvent(req.clientId, 'api_request', {
        api_endpoint: req.path,
        method: req.method,
        status_code: res.statusCode,
        response_time_ms: duration,
        country: country
      }, req);
    }
  });

  next();
});

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY; // Добавляем NewsData API
const DATA_PATH = path.join(__dirname, '../src/data/events.json');
const DEATHS_DATA_PATH = path.join(__dirname, '../src/data/deaths_statistics.json');

console.log('=== API Status ===');
console.log('GNews API Key:', GNEWS_API_KEY ? `${GNEWS_API_KEY.substring(0, 10)}... ` : ' NOT FOUND');
console.log('NewsData API Key:', NEWSDATA_API_KEY ? `${NEWSDATA_API_KEY.substring(0, 10)}... ` : ' NOT FOUND');
console.log('==================\n');

// Маппинг названий стран для статистики смертей
const countryNameMapping = {
  'United States': 'US', 'China': 'CN', 'India': 'IN', 'Russia': 'RU',
  'Ukraine': 'UA', 'France': 'FR', 'Sudan': 'SD', 'Israel': 'IL',
  'Canada': 'CA', 'Nigeria': 'NG', 'Yemen': 'YE', 'Syria': 'SY',
  'Brazil': 'BR', 'United Kingdom': 'GB', 'Germany': 'DE', 'Japan': 'JP',
  'Indonesia': 'ID', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Italy': 'IT',
  'South Africa': 'ZA', 'Turkey': 'TR', 'Iran': 'IR', 'Spain': 'ES',
  'Poland': 'PL', 'Kenya': 'KE', 'Argentina': 'AR', 'Australia': 'AU',
  'Mexico': 'MX', 'Colombia': 'CO', 'North Korea': 'KP', 'Afghanistan': 'AF',
  'Iraq': 'IQ', 'Libya': 'LY', 'Somalia': 'SO', 'Venezuela': 'VE',
  'Peru': 'PE', 'Malaysia': 'MY', 'Nepal': 'NP', 'Sri Lanka': 'LK',
  'Kazakhstan': 'KZ', 'Cambodia': 'KH', 'Ethiopia': 'ET', 'Egypt': 'EG',
  'Thailand': 'TH', 'Vietnam': 'VN', 'Philippines': 'PH', 'Myanmar': 'MM'
};

// Функция для отправки критических уведомлений
async function sendCriticalAlert(subject, message, error = null) {
  if (!emailTransporter || !process.env.ALERT_EMAIL) return;
  
  const emailContent = `
    (!) CRITICAL ALERT - World Snapshot Server
    
    Time: ${new Date().toISOString()}
    Subject: ${subject}
    
    ${message}
    
    ${error ? `Error Details:\n${error.stack || error.message || error}` : ''}
    
    ---
    Server: ${process.env.HOSTNAME || 'localhost'}
    Node Version: ${process.version}
  `;
  
  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ALERT_EMAIL,
      subject: `[WorldSnapshot] ${subject}`,
      text: emailContent,
    });
    logger.info(`Alert email sent: ${subject}`);
  } catch (err) {
    logger.error('Failed to send alert email:', err);
  }
}

// Функция для парсинга статистики смертей
async function fetchDeathStatistics() {
  console.log(`\n[${new Date().toISOString()}] Fetching death statistics...`);
  const url = 'https://worldpopulationreview.com/countries/deaths-per-day';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WorldSnapshotBot/1.0 (https://worldsnapshot.com; contact@worldsnapshot.com)'
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Парсим глобальные данные
    let globalDailyDeaths = 174194;
    let globalHourlyDeaths = 7258;
    let globalMinuteDeaths = 121;
    let globalSecondDeaths = 2.02;

    // Ищем блок с глобальной статистикой
    $('h2:contains("Deaths Per Day")').each((i, el) => {
      const parent = $(el).parent();
      const statsText = parent.text();
      const dailyMatch = statsText.match(/Deaths Per Day[\s\S]*?([\d,]+)/);
      if (dailyMatch) globalDailyDeaths = parseInt(dailyMatch[1].replace(/,/g, ''));
      
      const hourlyMatch = statsText.match(/Deaths Per Hour[\s\S]*?([\d,]+)/);
      if (hourlyMatch) globalHourlyDeaths = parseInt(hourlyMatch[1].replace(/,/g, ''));
      
      const minuteMatch = statsText.match(/Deaths Per Minute[\s\S]*?([\d,]+)/);
      if (minuteMatch) globalMinuteDeaths = parseInt(minuteMatch[1].replace(/,/g, ''));
    });

    // 2. Парсим данные по странам из таблицы
    const countriesDeathData = {};
    const tableRows = $('table tbody tr');

    tableRows.each((index, row) => {
      const columns = $(row).find('td');
      if (columns.length >= 3) {
        const countryName = $(columns[0]).text().trim();
        const deathsPerDayStr = $(columns[1]).text().trim().replace(/,/g, '');
        const deathsPerDay = parseInt(deathsPerDayStr, 10);
        const deathsPerHour = parseInt($(columns[2]).text().trim().replace(/,/g, ''), 10);

        if (countryName && !isNaN(deathsPerDay)) {
          const countryCode = countryNameMapping[countryName];
          if (countryCode) {
            countriesDeathData[countryCode] = {
              name: countryName,
              deathsPerDay,
              deathsPerHour: deathsPerHour || Math.round(deathsPerDay / 24),
              deathsPerYear: deathsPerDay * 365
            };
          }
        }
      }
    });

    const deathStats = {
      global: {
        daily: globalDailyDeaths,
        hourly: globalHourlyDeaths,
        minute: globalMinuteDeaths,
        second: globalSecondDeaths
      },
      countries: countriesDeathData,
      lastUpdated: new Date().toISOString()
    };

    // Сохраняем статистику в отдельный файл
    fs.writeFileSync(DEATHS_DATA_PATH, JSON.stringify(deathStats, null, 2));
    console.log(`Death statistics saved: Global daily deaths = ${globalDailyDeaths.toLocaleString()}, Data for ${Object.keys(countriesDeathData).length} countries.`);
    
    return deathStats;

  } catch (error) {
    console.error('Error fetching death statistics:', error);
    return null;
  }
}

function saveDataByDate(data) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Создаем структуру папок: data/2026/03/
  const datePath = path.join(__dirname, `../src/data/${year}/${month}`);
  mkdirSync(datePath, { recursive: true });
  
  // Сохраняем текущий снапшот
  const snapshotFile = path.join(datePath, `snapshot_${year}_${month}_${day}.json`);
  fs.writeFileSync(snapshotFile, JSON.stringify(data, null, 2));
  
  // Сохраняем последний снапшот в корень для быстрого доступа
  const latestFile = path.join(__dirname, '../src/data/latest.json');
  fs.writeFileSync(latestFile, JSON.stringify(data, null, 2));
  
  // Сохраняем в events.json для обратной совместимости
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  
  console.log(`Saved to: ${snapshotFile}`);
  return snapshotFile;
}

// Добавьте после функции saveDataByDate
function cleanOldData() {
  console.log('\nStarting data cleanup...');
  
  const dataDir = path.join(__dirname, '../src/data');
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  
  let deletedCount = 0;
  let keptCount = 0;
  
  try {
    // Читаем все папки по годам
    const years = fs.readdirSync(dataDir).filter(f => {
      const fullPath = path.join(dataDir, f);
      return fs.statSync(fullPath).isDirectory() && /^\d{4}$/.test(f);
    });
    
    for (const year of years) {
      const yearPath = path.join(dataDir, year);
      const months = fs.readdirSync(yearPath).filter(f => {
        const fullPath = path.join(yearPath, f);
        return fs.statSync(fullPath).isDirectory() && /^\d{2}$/.test(f);
      });
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const files = fs.readdirSync(monthPath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
          const filePath = path.join(monthPath, file);
          const fileStat = fs.statSync(filePath);
          const fileDate = new Date(fileStat.mtime);
          
          // Оставляем только:
          // 1. Текущий месяц
          // 2. Последние 7 дней в других месяцах
          const isCurrentMonth = (year === currentYear && month === currentMonth);
          const daysOld = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
          const isRecent = daysOld <= 7;
          
          if (!isCurrentMonth && !isRecent) {
            // Удаляем старый файл
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`   Deleted: ${year}/${month}/${file} (${Math.round(daysOld)} days old)`);
          } else {
            keptCount++;
          }
        }
        
        // Удаляем пустые папки
        try {
          const remainingFiles = fs.readdirSync(monthPath);
          if (remainingFiles.length === 0) {
            fs.rmdirSync(monthPath);
            console.log(`   Removed empty folder: ${year}/${month}`);
          }
        } catch (e) {
          // Папка не пуста или ошибка
        }
      }
      
      // Удаляем пустые папки годов
      try {
        const remainingMonths = fs.readdirSync(yearPath);
        if (remainingMonths.length === 0) {
          fs.rmdirSync(yearPath);
          console.log(`   Removed empty folder: ${year}`);
        }
      } catch (e) {}
    }
    
    console.log(`Cleanup complete: ${deletedCount} files deleted, ${keptCount} files kept\n`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Добавьте после cleanOldData
function cleanOldBriefData() {
  const briefPath = path.join(__dirname, '../src/data/lightning_brief.json');
  
  try {
    if (fs.existsSync(briefPath)) {
      const data = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
      const briefDate = new Date(data.lastUpdated);
      const now = new Date();
      const daysOld = (now.getTime() - briefDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Если brief старше 7 дней, удаляем его (он обновится при следующем fetch)
      if (daysOld > 7) {
        fs.unlinkSync(briefPath);
        console.log(`   Deleted old lightning brief (${Math.round(daysOld)} days old)`);
      }
    }
  } catch (error) {
    console.error('Error cleaning brief data:', error);
  }
}

// Добавьте после cleanOldBriefData
function cleanOldAdminEvents() {
  const adminPath = path.join(__dirname, '../src/data/admin_events.json');
  
  try {
    if (fs.existsSync(adminPath)) {
      const events = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.createdAt);
        return eventDate > threeMonthsAgo;
      });
      
      if (filteredEvents.length !== events.length) {
        fs.writeFileSync(adminPath, JSON.stringify(filteredEvents, null, 2));
        console.log(`   Admin events: removed ${events.length - filteredEvents.length} old events, kept ${filteredEvents.length}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning admin events:', error);
  }
}

// Функция для парсинга globalissues.org
async function fetchLightningBrief() {
  try {
  console.log(`\n[${new Date().toISOString()}] Fetching lightning brief from globalissues.org...`);
  const url = 'https://www.globalissues.org/news/2026';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WorldSnapshotBot/1.0 (https://worldsnapshot.com; contact@worldsnapshot.com)'
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const briefItems = [];

    // Прямой отбор div.node
    $('div.node').each((index, element) => {
      const titleElement = $(element).find('h2 a');
      const link = titleElement.attr('href');
      const title = titleElement.text().trim();

      const descriptionElement = $(element).find('div.content p').first();
      let description = descriptionElement.text().trim();

      // если нет описания — берём текст из div.content
      if (!description) {
        description = $(element).find('div.content').text().trim().substring(0, 200);
      }

      const dateElement = $(element).find('span.submitted');
      let date = dateElement.text().trim();

      // если дата не найдена — оставляем пустую (потом заменим)
      if (!date) {
        date = new Date().toISOString();
      }

      if (title && link) {
        briefItems.push({
          id: `brief-${Date.now()}-${index}`,
          title: title,
          description: description.substring(0, 300) || 'Read more...',
          url: link.startsWith('http') ? link : `https://www.globalissues.org${link}`,
          date: date,
          category: 'brief'
        });
      }
    });

    console.log(`Found ${briefItems.length} div.node elements`);

    // Если всё ещё ничего не нашли — используем fallback по ссылкам
    if (briefItems.length === 0) {
      $('a').each((index, element) => {
        const title = $(element).text().trim();
        const link = $(element).attr('href');
        if (title && title.length > 30 && title.length < 200 &&
            link && !link.includes('/archive') && !link.includes('/about')) {
          briefItems.push({
            id: `brief-${Date.now()}-${index}`,
            title: title,
            description: '',
            url: link.startsWith('http') ? link : `https://www.globalissues.org${link}`,
            date: new Date().toISOString(),
            category: 'brief'
          });
        }
      });
    }

    // Убираем дубликаты по URL
    const uniqueBriefs = [];
    const urls = new Set();
    for (const item of briefItems) {
      if (!urls.has(item.url)) {
        urls.add(item.url);
        uniqueBriefs.push(item);
      }
    }

    // Берём первые 10 новостей (можно 12, но 10 достаточно)
    const topBriefs = uniqueBriefs.slice(0, 10);

    console.log(`Lightning brief: ${uniqueBriefs.length} unique, saving ${topBriefs.length}`);

    const BRIEF_PATH = path.join(__dirname, '../src/data/lightning_brief.json');
    const briefData = {
      items: topBriefs,
      lastUpdated: new Date().toISOString(),
      source: 'globalissues.org'
    };

    fs.writeFileSync(BRIEF_PATH, JSON.stringify(briefData, null, 2));
    console.log(`Lightning brief saved: ${topBriefs.length} items`);

    // Вывод первых заголовков для проверки
    topBriefs.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.title.substring(0, 60)}...`);
    });

    return briefData;

  } catch (error) {
    console.error('Error fetching lightning brief:', error);
    return null;
  }
  } catch (error) {
    logWithAlert('error', 'Failed to fetch lightning brief', error, true);
    return null;
  }
}

// API endpoint для Lightning Brief
app.get('/api/lightning-brief', async (req, res) => {
  try {
    const BRIEF_PATH = path.join(__dirname, '../src/data/lightning_brief.json');
    if (fs.existsSync(BRIEF_PATH)) {
      const data = JSON.parse(fs.readFileSync(BRIEF_PATH, 'utf8'));
      
      await analytics.sendEvent(req.clientId, 'view_lightning_brief', {
        items_count: data.items?.length || 0
      });
      
      res.json(data);
    } else {
      res.status(404).json({ error: 'No lightning brief data yet' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read lightning brief' });
  }
});

// Берем новости
async function fetchNews(force = false) {
  try{
    const now = Date.now();
    
    // Кэш на 30 минут
    if (!force && cachedData && lastFetchTime && (now - lastFetchTime) < 30 * 60 * 1000) {
      console.log('Returning cached data (last fetch < 30 min ago)');
      return cachedData;
    }
    
    console.log(`\n[${new Date().toISOString()}] Fetching news...`);
    
    const allArticles = [];
    
    // Запросы для обоих API
    const queries = [
      { q: 'war OR conflict OR military OR attack', category: 'military', max: 8 },
      { q: 'earthquake OR flood OR hurricane OR fire OR disaster', category: 'disasters', max: 8 },
      { q: 'economy OR inflation OR stock market OR recession OR trade', category: 'economy', max: 8 },
      { q: 'health OR disease OR pandemic OR hospital OR vaccine', category: 'health', max: 8 },
      { q: 'election OR protest OR government OR politics', category: 'politics', max: 8 },
      { q: 'space OR nasa OR research OR science OR technology', category: 'science', max: 8 },
      { q: 'celebrity OR entertainment OR viral OR trending', category: 'popular', max: 6 }
    ];
    
    // Пробуем сначала GNews
    let gnewsSuccess = false;
    let newsdataSuccess = false;
    
    if (GNEWS_API_KEY && GNEWS_API_KEY !== 'disabled') {
      console.log('Trying GNews API...');
      
      for (const query of queries) {
        try {
          const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query.q)}&lang=en&max=${query.max}&apikey=${GNEWS_API_KEY}`;
          console.log(`   GNews: ${query.category}...`);
          
          const response = await fetch(url);
          
          if (response.status === 403) {
            console.log(`   GNews quota exceeded for ${query.category}`);
            break;
          }
          
          if (!response.ok) {
            console.error(`   GNews error: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (data.articles && data.articles.length > 0) {
            console.log(`   Found ${data.articles.length} articles`);
            gnewsSuccess = true;
            
            data.articles.forEach(article => {
              const fullText = `${article.title} ${article.description || ''} ${article.content || ''}`;
              const detectedCategory = categorizeNews(article.title, article.description);
              
              if (detectedCategory === 'ignored') {
                console.log(`      ⏭ Skipped (sports): ${article.title.substring(0, 50)}...`);
                return;
              }
              
              const sentimentScore = analyzeSentiment(fullText);
              const intensity = calculateIntensity(sentimentScore, detectedCategory, fullText);
              
              allArticles.push({
                id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                category: detectedCategory,
                title: article.title,
                detail: article.description || article.content || 'No description',
                intensity: intensity,
                sentimentScore: sentimentScore,
                source: article.source?.name || 'GNews',
                url: article.url,
                publishedAt: article.publishedAt || new Date().toISOString(),
                country: null
              });
            });
          } else {
            console.log(`   No articles`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`   GNews error:`, error.message);
        }
      }
    }
    
    // Если GNews не дал результатов, пробуем NewsData
    if (!gnewsSuccess || allArticles.length < 10) {
      if (NEWSDATA_API_KEY && NEWSDATA_API_KEY !== 'disabled') {
        console.log('\nTrying NewsData API as fallback...');
        
        for (const query of queries) {
          const articles = await fetchFromNewsData(query.q, query.category, query.max);
          allArticles.push(...articles);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        newsdataSuccess = allArticles.length > 0;
      }
    }
    
    console.log(`\nTotal: ${allArticles.length} articles`);
    
    // Если не удалось получить новости ни из одного API, используем локальные данные
    if (allArticles.length === 0) {
      console.log('No articles from any API, loading local data...');
      return loadLocalData();
    }
    
    // Убираем дубликаты
    const uniqueArticles = [];
    const titles = new Set();
    
    for (const article of allArticles) {
      const shortTitle = article.title.substring(0, 100);
      if (!titles.has(shortTitle)) {
        titles.add(shortTitle);
        uniqueArticles.push(article);
      }
    }
    
    const topArticles = uniqueArticles.slice(0, 30);
    
    // Статистика по категориям
    const stats = {
      military: topArticles.filter(a => a.category === 'military').length,
      disasters: topArticles.filter(a => a.category === 'disasters').length,
      politics: topArticles.filter(a => a.category === 'politics').length,
      science: topArticles.filter(a => a.category === 'science').length,
      popular: topArticles.filter(a => a.category === 'popular').length,
      economy: topArticles.filter(a => a.category === 'economy').length,
      health: topArticles.filter(a => a.category === 'health').length
    };
    
    console.log('\nCategories distribution:');
    Object.entries(stats).forEach(([cat, count]) => {
      if (count > 0) console.log(`   ${cat}: ${count} articles`);
    });
    
    // Получаем статистику смертей
    const deathStats = await fetchDeathStatistics();
    const briefData = await fetchLightningBrief();

    const adminEventsPath = path.join(__dirname, '../src/data/admin_events.json');

    let adminEvents = [];
    if (fs.existsSync(adminEventsPath)) {
      adminEvents = JSON.parse(fs.readFileSync(adminEventsPath, 'utf8'));
    }

    const globalData = {
      globalEvents: topArticles.map(article => ({
        id: article.id,
        category: article.category,
        title: article.title,
        detail: article.detail,
        intensity: article.intensity,
        sentimentScore: article.sentimentScore,
        url: article.url,
        source: article.source,
        publishedAt: article.publishedAt
      })),
      globalMetrics: {
        dailyDeaths: deathStats?.global?.daily || Math.floor(Math.random() * 50000) + 120000,
        hourlyDeaths: deathStats?.global?.hourly || 7258,
        minuteDeaths: deathStats?.global?.minute || 121,
        secondDeaths: deathStats?.global?.second || 2.02,
        deathsChange: (Math.random() * 10 - 2).toFixed(1),
        activeConflicts: stats.military + 12,
        ecoCrises: stats.disasters + 5,
        politicalInstabilityDelta: (Math.random() * 20 - 5).toFixed(0),
        scientificBreakthroughs: stats.science + 3,
        healthCrises: stats.health || 0,
        economicStress: stats.economy || 0
      },
      adminEvents: adminEvents.slice(0, 20),
      lightningBrief: briefData,
      lastUpdated: new Date().toISOString()
    };
    
    const savedPath = saveDataByDate(globalData);
    console.log(`\nSaved ${topArticles.length} articles to ${DATA_PATH}\n`);
    
    cachedData = globalData;
    lastFetchTime = now;
    return globalData;
  } catch (error) {
    logWithAlert('error', 'Critical error in fetchNews', error, true);
    return loadLocalData();
  }
}

// после fetchNews, но до fetchLightningBrief
async function fetchFromNewsData(query, category, max = 10) {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=${encodeURIComponent(query)}&language=en&size=${max}`;
    console.log(`   NewsData: ${category}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`   NewsData error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.results) {
      console.log(`   Found ${data.results.length} articles`);
      
      // Обрабатываем каждую статью с проверкой на устаревшие новости
      const articles = data.results.map(article => {
        // Проверка на устаревшие новости
        if (isOutdated(article.pubDate)) {
          console.log(`   ⏭ Skipped outdated: ${article.title.substring(0, 50)}...`);
          return null;
        }
        
        const fullText = `${article.title} ${article.description || ''} ${article.content || ''}`;
        const detectedCategory = categorizeNews(article.title, article.description);
        
        if (detectedCategory === 'ignored') return null;
        
        const sentimentScore = analyzeSentiment(fullText);
        const intensity = calculateIntensity(sentimentScore, detectedCategory, fullText);
        
        return {
          id: `newsdata-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category: detectedCategory,
          title: article.title,
          detail: article.description || article.content || 'No description',
          intensity: intensity,
          sentimentScore: sentimentScore,
          source: article.source_id || 'NewsData',
          url: article.link || article.url,
          publishedAt: article.pubDate || new Date().toISOString(),
          country: null
        };
      }).filter(article => article !== null);
      
      return articles;
    }
    
    return [];
  } catch (error) {
    console.error(`   NewsData error:`, error.message);
    return [];
  }
}

// Функция для загрузки локальных данных
function loadLocalData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const localData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      console.log('Loaded existing local data');
      cachedData = localData;
      lastFetchTime = Date.now();
      return localData;
    }
  } catch (error) {
    console.error('Error loading local data:', error);
  }
  
  // Если нет данных, создаем пустую структуру
  const emptyData = {
    globalEvents: [],
    globalMetrics: {
      dailyDeaths: 174194,
      hourlyDeaths: 7258,
      minuteDeaths: 121,
      secondDeaths: 2.02,
      deathsChange: "0",
      activeConflicts: 0,
      ecoCrises: 0,
      politicalInstabilityDelta: "0",
      scientificBreakthroughs: 0,
      healthCrises: 0,
      economicStress: 0
    },
    adminEvents: [],
    lightningBrief: null,
    lastUpdated: new Date().toISOString()
  };
  
  console.log('Created empty data structure');
  return emptyData;
}

// before the /api/server/config endpoint
function getNextServerUpdateTime() {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Current hour in NY time
  const currentHour = nyTime.getHours();
  
  // Next update times: 8 AM (8) and 8 PM (20)
  let nextHour;
  if (currentHour < 8) {
    nextHour = 8;
  } else if (currentHour < 20) {
    nextHour = 20;
  } else {
    // After 8 PM, next is tomorrow 8 AM
    const tomorrow = new Date(nyTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow;
  }
  
  const nextUpdate = new Date(nyTime);
  nextUpdate.setHours(nextHour, 0, 0, 0);
  
  // If next update time is in the past (shouldn't happen with above logic)
  if (nextUpdate <= nyTime) {
    nextUpdate.setHours(nextHour + 12, 0, 0, 0);
  }
  
  return nextUpdate;
}

// hand parsing
app.post('/api/fetch-brief', heavyLimiter, async (req, res) => {
  console.log('Manual lightning brief fetch requested');
  const data = await fetchLightningBrief();
  res.json({ success: !!data, data });
});

// В POST /api/fetch можно передавать force=true
app.post('/api/fetch', heavyLimiter, async (req, res) => {
  const startTime = Date.now();
  const clientId = req.clientId;
  
  try {
    console.log('Manual fetch requested');
    const data = await fetchNews(true);
    
    // Отправляем событие об успешном обновлении
    await analytics.sendEvent(clientId, 'manual_fetch', {
      success: true,
      articles_count: data?.globalEvents?.length || 0,
      duration: Date.now() - startTime
    });
    
    res.json({ success: !!data, data });
  } catch (error) {
    await analytics.sendEvent(clientId, 'manual_fetch', {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    });
    
    throw error;
  }
});

// API endpoints
// Защищенный эндпоинт для админки
// Публичный эндпоинт (без авторизации) для фронтенда
app.get('/api/public/snapshot', (req, res) => {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'No data yet' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.get('/api/server/config', (req, res) => {
  const nextUpdateTime = getNextServerUpdateTime(); // Calculate next 8AM/8PM NY time
  res.json({
    updateSchedule: '0 12,0 * * *', // Cron pattern
    timezone: 'America/New_York',
    nextUpdate: nextUpdateTime,
    updateInterval: '12 hours'
  });
});

// Защищенный эндпоинт для админки (требует токен)
app.get('/api/snapshot', adminAuth, (req, res) => {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'No data yet. Run /api/fetch' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Новый endpoint для получения статистики смертей (публичный)
app.get('/api/deaths', async (req, res) => {
  const clientId = req.clientId;
  
  try {
    if (fs.existsSync(DEATHS_DATA_PATH)) {
      const data = JSON.parse(fs.readFileSync(DEATHS_DATA_PATH, 'utf8'));
      
      // Отправляем событие просмотра статистики смертей
      await analytics.sendEvent(clientId, 'view_deaths_statistics', {
        countries_count: Object.keys(data.countries || {}).length,
        global_daily_deaths: data.global?.daily
      });
      
      res.json(data);
    } else {
      res.status(404).json({ error: 'No death statistics yet' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read death statistics' });
  }
});

app.get('/api/status', (req, res) => {
  const dataExists = fs.existsSync(DATA_PATH);
  let lastUpdated = null;
  if (dataExists) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      lastUpdated = data.lastUpdated;
    } catch(e) {}
  }
  res.json({
    status: 'running',
    lastUpdated,
    dataExists,
    gnews: GNEWS_API_KEY ? 'configured' : 'missing'
  });
});

// Admin auth middleware
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  
  if (!token) {
    logWithAlert('warn', `Admin access denied: missing token from ${req.ip}`, null, false);
    return res.status(401).json({ error: 'Missing admin token' });
  }
  
  if (token !== ADMIN_TOKEN) {
    logWithAlert('error', `Admin access denied: invalid token from ${req.ip}`, null, true);
    return res.status(403).json({ error: 'Invalid admin token' });
  }
  
  next();
}

// Эндпоинт для получения списка стран
app.get('/api/admin/countries', adminAuth, async (req, res) => {
  try {
    // Пытаемся загрузить админские изменения
    const adminDataPath = path.join(__dirname, '../src/data/admin_countries.json');
    let adminOverrides = {};
    
    if (fs.existsSync(adminDataPath)) {
      adminOverrides = JSON.parse(fs.readFileSync(adminDataPath, 'utf8'));
    }
    
    // Загружаем базовые данные из countries.ts
    // Путь к скомпилированному JS файлу (если используете TypeScript)
    let baseCountries = {};
    
    try {
      // Пробуем загрузить из скомпилированного JS
      const countriesModule = await import('../src/data/countries.js');
      baseCountries = countriesModule.countriesData;
      
      const countriesPath = path.join(__dirname, '../dist/src/data/countries.js');
      if (fs.existsSync(countriesPath)) {
        const countriesModule = await import(countriesPath);
        baseCountries = countriesModule.countriesData;
      }
      
    } catch (err) {
      // Fallback: загружаем из JSON если есть
      const countriesJsonPath = path.join(__dirname, '../src/data/countries.json');
      if (fs.existsSync(countriesJsonPath)) {
        baseCountries = JSON.parse(fs.readFileSync(countriesJsonPath, 'utf8'));
      } else {
        throw new Error("Countries not found: baseCountries is empty or undefined");
      }
    }
    
    // Применяем админские оверрайды
    const mergedCountries = { ...baseCountries };
    Object.keys(adminOverrides).forEach(id => {
      if (mergedCountries[id]) {
        mergedCountries[id] = { ...mergedCountries[id], ...adminOverrides[id] };
      } else {
        mergedCountries[id] = adminOverrides[id];
      }
    });
    
    // Возвращаем как массив для удобства фронтенда
    const countriesArray = Object.values(mergedCountries);
    res.json(countriesArray);
    
  } catch (error) {
    console.error('Error in /api/admin/countries:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/countries/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Валидация ID
    if (!id || typeof id !== 'string' || id.length > 50) {
      return res.status(400).json({ error: 'Invalid country ID' });
    }
    
    // Проверка размера тела
    const bodySize = JSON.stringify(updates).length;
    if (bodySize > 10000) { // 10KB лимит
      return res.status(413).json({ error: 'Payload too large' });
    }
    
    // Белый список разрешенных полей
    const allowedFields = ['name', 'status', 'color', 'summary', 'military', 'politics', 'eco', 'science', 'deaths_estimate'];
    const sanitizedUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }
    const adminDataPath = path.join(__dirname, '../src/data/admin_countries.json');
    let countries = {};
    if (fs.existsSync(adminDataPath)) {
      countries = JSON.parse(fs.readFileSync(adminDataPath, 'utf8'));
    }
    countries[id] = { ...countries[id], ...updates, id };
    fs.writeFileSync(adminDataPath, JSON.stringify(countries, null, 2));
    res.json({ success: true, country: countries[id] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/events', adminAuth, (req, res) => {
  try {
    const event = {
      ...req.body,
      id: `admin-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: "admin"
    };

    const adminEventsPath = path.join(__dirname, '../src/data/admin_events.json');

    let adminEvents = [];
    if (fs.existsSync(adminEventsPath)) {
      adminEvents = JSON.parse(fs.readFileSync(adminEventsPath, 'utf8'));
    }

    adminEvents.unshift(event);
    fs.writeFileSync(adminEventsPath, JSON.stringify(adminEvents, null, 2));

    res.json({ success: true, event });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// UPDATE admin event
app.put('/api/admin/events/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const adminEventsPath = path.join(__dirname, '../src/data/admin_events.json');
    
    if (!fs.existsSync(adminEventsPath)) {
      return res.status(404).json({ error: 'No admin events found' });
    }
    
    let adminEvents = JSON.parse(fs.readFileSync(adminEventsPath, 'utf8'));
    // Убрали : any
    const eventIndex = adminEvents.findIndex((e) => e.id === id);
    
    if (eventIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Обновляем событие
    adminEvents[eventIndex] = {
      ...adminEvents[eventIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(adminEventsPath, JSON.stringify(adminEvents, null, 2));
    
    // Также обновляем в основном events.json если там есть это событие
    const mainEventsPath = path.join(__dirname, '../src/data/events.json');
    if (fs.existsSync(mainEventsPath)) {
      const mainData = JSON.parse(fs.readFileSync(mainEventsPath, 'utf8'));
      // Убрали : any и добавили проверку на существование
      const mainEventIndex = mainData.adminEvents ? mainData.adminEvents.findIndex((e) => e.id === id) : -1;
      if (mainEventIndex !== -1 && mainData.adminEvents) {
        mainData.adminEvents[mainEventIndex] = {
          ...mainData.adminEvents[mainEventIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        mainData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(mainEventsPath, JSON.stringify(mainData, null, 2));
      }
    }
    
    res.json({ success: true, event: adminEvents[eventIndex] });
    
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/events/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    
    // Удаляем из основного файла
    const mainEventsPath = path.join(__dirname, '../src/data/events.json');
    if (fs.existsSync(mainEventsPath)) {
      const mainData = JSON.parse(fs.readFileSync(mainEventsPath, 'utf8'));
      mainData.globalEvents = mainData.globalEvents.filter(e => e.id !== id);
      mainData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(mainEventsPath, JSON.stringify(mainData, null, 2));
    }
    
    // Также удаляем из админских событий
    const adminEventsPath = path.join(__dirname, '../src/data/admin_events.json');
    if (fs.existsSync(adminEventsPath)) {
      let adminEvents = JSON.parse(fs.readFileSync(adminEventsPath, 'utf8'));
      adminEvents = adminEvents.filter(e => e.id !== id);
      fs.writeFileSync(adminEventsPath, JSON.stringify(adminEvents, null, 2));
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/metrics', adminAuth, (req, res) => {
  try {
    const metrics = req.body;
    const mainEventsPath = path.join(__dirname, '../src/data/events.json');
    if (fs.existsSync(mainEventsPath)) {
      const mainData = JSON.parse(fs.readFileSync(mainEventsPath, 'utf8'));
      mainData.globalMetrics = { ...mainData.globalMetrics, ...metrics };
      mainData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(mainEventsPath, JSON.stringify(mainData, null, 2));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/snapshot/history/:date', async (req, res) => {
  const clientId = req.clientId;
  const { date } = req.params;
  
  try {
    
    // Валидация формата YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const [year, month, day] = date.split('-');
    
    // Проверка диапазонов
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    if (yearNum < 2020 || yearNum > 2030 || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      return res.status(400).json({ error: 'Invalid date values' });
    }
    
    const historyPath = path.join(__dirname, `../src/data/${year}/${month}/snapshot_${year}_${month}_${day}.json`);
    
    // Проверка существования файла перед realpathSync
    if (!fs.existsSync(historyPath)) {
      return res.status(404).json({ error: 'No data for this date' });
    }
    
    // Проверка, что путь внутри data директории
    const realPath = fs.realpathSync(historyPath);
    const dataDir = fs.realpathSync(path.join(__dirname, '../src/data'));
    
    if (!realPath.startsWith(dataDir)) {
      logger.warn(`Path traversal attempt: ${date} from ${req.ip}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    
    // Отправляем событие просмотра истории
    await analytics.sendEvent(clientId, 'view_history_snapshot', {
      date: date,
      articles_count: data.globalEvents?.length || 0
    });
    
    res.json(data);
  } catch (error) {
    await analytics.sendEvent(clientId, 'history_error', {
      date: date,
      error: error.message
    });
    
    res.status(500).json({ error: 'Failed to read snapshot data' });
  }
});

app.get('/api/snapshot/latest', (req, res) => {
  try {
    const latestPath = path.join(__dirname, '../src/data/latest.json');
    if (fs.existsSync(latestPath)) {
      const data = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'No latest data' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dataExists: fs.existsSync(DATA_PATH)
  });
});

// Добавьте после других эндпоинтов
app.post('/api/admin/cleanup', adminAuth, (req, res) => {
  console.log('Manual cleanup requested');
  try {
    cleanOldData();
    cleanOldBriefData();
    cleanOldAdminEvents();
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// world-atlas (ДО статики)
app.get('/api/world-atlas/countries-50m.json', async (req, res) => {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (error) {
    console.error('Error fetching world atlas:', error);
    res.status(500).json({ error: 'Failed to fetch map data', details: error.message });
  }
});

// Раздаем статические файлы из папки dist
app.use(express.static(path.join(__dirname, '../dist')));

// Все неизвестные GET-запросы направляем на index.html (для клиентского роутинга)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// ----------------------------------------

// Запуск
fetchNews();
fetchLightningBrief();
cleanOldData();       
cleanOldBriefData();  
cleanOldAdminEvents();

// Ежедневная очистка в 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('\nRunning daily cleanup...');
  cleanOldData();
  cleanOldBriefData();
  cleanOldAdminEvents();
}, { timezone: "America/New_York" });

// Основные обновления в 8 AM и 8 PM
cron.schedule('0 12,0 * * *', async () => {
  console.log('\nScheduled fetch (8AM/8PM NY)...');
  await fetchNews();
  await fetchLightningBrief();
}, { timezone: "America/New_York" });

const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  console.log(`\nServer on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`   GET  /api/snapshot`);
  console.log(`   GET  /api/deaths`);
  console.log(`   POST /api/fetch`);
  console.log(`   GET  /api/status\n`);
  console.log(`   Cleanup schedule: daily at 2:00 AM NY time`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logWithAlert('crit', 'Uncaught Exception', error, true);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logWithAlert('crit', 'Unhandled Rejection', reason, true);
});