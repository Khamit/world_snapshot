// world_snapshot/server/index.js
import * as cheerio from 'cheerio';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs, { mkdirSync } from 'fs';
import cron from 'node-cron';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeSentiment, calculateIntensity, categorizeNews } from './analyzer_new.js';

let cachedData = null;
let lastFetchTime = null;

dotenv.config();
/*
world_snapshot/server/index.js — проблема с import.meta.env.VITE_API_URL
Строка 340: const API_URL = import.meta.env.VITE_API_URL; 
— это фронтенд-переменная, она не работает в Node.js!
Нужно: Удалить эту строку и заменить на правильный импорт
*/

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secret-token-here';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const DATA_PATH = path.join(__dirname, '../src/data/events.json');
const DEATHS_DATA_PATH = path.join(__dirname, '../src/data/deaths_statistics.json');

console.log('=== GNews API Status ===');
console.log('API Key:', GNEWS_API_KEY ? `${GNEWS_API_KEY.substring(0, 10)}... ` : ' NOT FOUND');
console.log('========================\n');


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

// Функция для парсинга globalissues.org
async function fetchLightningBrief() {
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
    
    // Парсим новости - адаптируйте селекторы под структуру сайта
    // Обычно на globalissues.org новости в тегах <article> или <div class="news-item">
    $('article, .news-item, .story, .post').each((index, element) => {
      const titleElement = $(element).find('h2, h3, .title, .headline');
      const linkElement = $(element).find('a').first();
      const descriptionElement = $(element).find('p, .summary, .description');
      const dateElement = $(element).find('time, .date, .published');
      
      const title = titleElement.text().trim();
      const link = linkElement.attr('href');
      const description = descriptionElement.text().trim().substring(0, 150);
      const date = dateElement.text().trim();
      
      if (title && link) {
        briefItems.push({
          id: `brief-${Date.now()}-${index}`,
          title: title,
          description: description || 'Read more...',
          url: link.startsWith('http') ? link : `https://www.globalissues.org${link}`,
          date: date || new Date().toISOString(),
          category: 'brief'
        });
      }
    });
    
    // Если не нашли статьи по стандартным селекторам, пробуем альтернативный подход
    if (briefItems.length === 0) {
      // Ищем любые ссылки с заголовками
      $('a').each((index, element) => {
        const title = $(element).text().trim();
        const link = $(element).attr('href');
        
        // Фильтруем: заголовок должен быть достаточно длинным и не быть навигацией
        if (title && title.length > 20 && title.length < 200 && 
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
    
    // Ограничиваем количество (первые 10-15 новостей)
    const topBriefs = briefItems.slice(0, 12);
    
    // Сохраняем в отдельный JSON файл
    const BRIEF_PATH = path.join(__dirname, '../src/data/lightning_brief.json');
    const briefData = {
      items: topBriefs,
      lastUpdated: new Date().toISOString(),
      source: 'globalissues.org'
    };
    
    fs.writeFileSync(BRIEF_PATH, JSON.stringify(briefData, null, 2));
    console.log(`✅ Lightning brief saved: ${topBriefs.length} items`);
    
    return briefData;
    
  } catch (error) {
    console.error('Error fetching lightning brief:', error);
    return null;
  }
}

// API endpoint для Lightning Brief
app.get('/api/lightning-brief', (req, res) => {
  try {
    const BRIEF_PATH = path.join(__dirname, '../src/data/lightning_brief.json');
    if (fs.existsSync(BRIEF_PATH)) {
      const data = JSON.parse(fs.readFileSync(BRIEF_PATH, 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'No lightning brief data yet' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read lightning brief' });
  }
});

async function fetchNews(force = false) {
  const now = Date.now();
  // Кэш на 30 минут
  if (!force && cachedData && lastFetchTime && (now - lastFetchTime) < 30 * 60 * 1000) {
    console.log('Returning cached data (last fetch < 30 min ago)');
    return cachedData;
  }
  // ----------------
  console.log(`\n[${new Date().toISOString()}] Fetching news from GNews...`);
  
  if (!GNEWS_API_KEY) {
    console.error('GNews API key not found');
    return null;
  }
  
  const allArticles = [];
  
  // Улучшенные запросы
const queries = [
  { q: 'war OR conflict OR military OR attack', category: 'military', lang: 'en', max: 8 },
  { q: 'earthquake OR flood OR hurricane OR fire OR disaster', category: 'disasters', lang: 'en', max: 8 },
  { q: 'economy OR inflation OR stock market OR recession OR trade', category: 'economy', lang: 'en', max: 8 }, // Увеличен max
  { q: 'health OR disease OR pandemic OR hospital OR vaccine', category: 'health', lang: 'en', max: 8 }, // Увеличен max
  { q: 'election OR protest OR government OR politics', category: 'politics', lang: 'en', max: 8 },
  { q: 'space OR nasa OR research OR science OR technology', category: 'science', lang: 'en', max: 8 },
  { q: 'celebrity OR entertainment OR viral OR trending', category: 'popular', lang: 'en', max: 6 }
];
  
  for (const query of queries) {
    try {
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query.q)}&lang=${query.lang}&max=${query.max}&apikey=${GNEWS_API_KEY}`;
      console.log(`${query.category}...`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.articles && data.articles.length > 0) {
        console.log(`${data.articles.length} articles`);
        
        data.articles.forEach(article => {
          const fullText = `${article.title} ${article.description || ''} ${article.content || ''}`;
          
          // Определяем категорию
          const detectedCategory = categorizeNews(article.title, article.description);
          
          // Пропускаем игнорируемый контент (спорт)
          if (detectedCategory === 'ignored') {
            console.log(`   ⏭ Skipped (sports): ${article.title.substring(0, 50)}...`);
            return;
          }
          
          // Анализируем тональность только для релевантных новостей
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
        console.log(`No articles`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`Error:`, error.message);
    }
  }
  
  console.log(`\nTotal: ${allArticles.length} articles`);
  
  if (allArticles.length === 0) {
    console.log('No articles found');
    return null;
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
  
  // Средняя интенсивность по категориям
  const avgIntensity = {};
  for (const article of topArticles) {
    if (!avgIntensity[article.category]) {
      avgIntensity[article.category] = { sum: 0, count: 0 };
    }
    avgIntensity[article.category].sum += article.intensity;
    avgIntensity[article.category].count++;
  }
  
  console.log('\nAverage intensity by category:');
  Object.entries(avgIntensity).forEach(([cat, data]) => {
    console.log(`   ${cat}: ${Math.round(data.sum / data.count)}%`);
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
    adminEvents: adminEvents.slice(0, 20), // лимит
    lightningBrief: briefData,
    lastUpdated: new Date().toISOString()
  };
  
  const savedPath = saveDataByDate(globalData);
  console.log(`\nSaved ${topArticles.length} articles to ${DATA_PATH}\n`);
  
  cachedData = globalData;
  lastFetchTime = now;
  return globalData;
}
// hand parsing
app.post('/api/fetch-brief', async (req, res) => {
  console.log('Manual lightning brief fetch requested');
  const data = await fetchLightningBrief();
  res.json({ success: !!data, data });
});

// В POST /api/fetch можно передавать force=true
app.post('/api/fetch', async (req, res) => {
  console.log('Manual fetch requested');
  const data = await fetchNews(true); // force refresh
  res.json({ success: !!data, data });
});

// API endpoints
app.get('/api/snapshot', (req, res) => {
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

// Новый endpoint для получения статистики смертей
app.get('/api/deaths', (req, res) => {
  try {
    if (fs.existsSync(DEATHS_DATA_PATH)) {
      const data = JSON.parse(fs.readFileSync(DEATHS_DATA_PATH, 'utf8'));
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
    return res.status(401).json({ error: 'Missing admin token' });
  }
  
  if (token !== ADMIN_TOKEN) {
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


app.get('/api/snapshot/history/:date', (req, res) => {
  try {
    const { date } = req.params; // формат: 2026-03-29
    const [year, month, day] = date.split('-');
    const historyPath = path.join(__dirname, `../src/data/${year}/${month}/snapshot_${year}_${month}_${day}.json`);
    
    if (fs.existsSync(historyPath)) {
      const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'No data for this date' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Раздаем статические файлы из папки dist
app.use(express.static(path.join(__dirname, '../dist')));

// Все неизвестные GET-запросы направляем на index.html (для клиентского роутинга)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});
// ----------------------------------------

// Запуск
fetchNews();

cron.schedule('0 12,0 * * *', async () => {
  console.log('\nScheduled fetch (8AM/8PM NY)...');
  await fetchNews();
  await fetchLightningBrief(); // Добавляем обновление brief
}, { timezone: "America/New_York" });

app.listen(PORT, () => {
  console.log(`\nServer on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`   GET  /api/snapshot`);
  console.log(`   GET  /api/deaths`);
  console.log(`   POST /api/fetch`);
  console.log(`   GET  /api/status\n`);
});
