// world_snapshot/server/analyzer_new.js

// ========== БАЗОВЫЙ АНАЛИЗАТОР ТОНАЛЬНОСТИ ==========
export function analyzeSentiment(text) {
  const negativeWords = {
    war: 15, death: 20, attack: 15, crisis: 12, conflict: 12,
    kill: 18, bomb: 15, missile: 12, drone: 8, explosion: 12,
    destroyed: 10, casualties: 15, violence: 10, terror: 15,
    collapse: 8, disaster: 10, emergency: 5, evacuation: 5,
    strike: 10, offensive: 8, invasion: 15, clashes: 10,
    genocide: 25, massacre: 22, atrocities: 20, famine: 18,
    epidemic: 15, starvation: 12, siege: 10, insurgency: 12
  };
  
  const positiveWords = {
    success: 10, breakthrough: 15, victory: 12, peace: 15,
    discovery: 10, innovation: 8, recovery: 8, agreement: 10,
    ceasefire: 12, rescue: 10, aid: 5, cooperation: 5,
    achievement: 8, progress: 5, hope: 3, treaty: 8,
    reconciliation: 12, prosperity: 10, development: 5,
    solution: 8, cure: 15, treatment: 10, vaccine: 12
  };
  
  let score = 0;
  const lowerText = text.toLowerCase();
  
  for (const [word, weight] of Object.entries(negativeWords)) {
    if (lowerText.includes(word)) score -= weight;
  }
  
  for (const [word, weight] of Object.entries(positiveWords)) {
    if (lowerText.includes(word)) score += weight;
  }
  
  // Нормализация через tanh (сигмоида)
  return normalizeSentiment(score);
}

// Нормализация тональности через tanh
function normalizeSentiment(score) {
  return Math.tanh(score / 50) * 100;
}

// ========== 1. ФИЛЬТР НИЗКОКАЧЕСТВЕННОГО КОНТЕНТА ==========
function isLowQualityContent(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();

  const spamPatterns = [
    'you won’t believe', 'you won\'t believe',
    'shocking', 'click here', 'watch now', 'top 10', 'top ten',
    'breaking!!!', 'exclusive:', 'must see', 'goes viral',
    'internet reacts', 'you need to see', 'can\'t miss',
    'this will blow your mind', 'unbelievable', 'mind-blowing'
  ];

  return spamPatterns.some(p => text.includes(p));
}

// ========== 2. ГЕОПОЛИТИЧЕСКИЙ ВЕС ==========
const importantRegions = [
  'usa', 'united states', 'china', 'russia', 'ukraine', 'eu', 'european union',
  'nato', 'middle east', 'israel', 'iran', 'north korea', 'south china sea',
  'taiwan', 'gaza', 'palestine', 'syria', 'afghanistan', 'iraq',
  'saudi arabia', 'turkey', 'india', 'pakistan', 'kremlin', 'white house',
  'pentagon', 'united nations', 'kremlin', 'beijing', 'moscow'
];

function getGeoWeight(text) {
  const lower = text.toLowerCase();
  let weight = 0;

  for (const region of importantRegions) {
    if (lower.includes(region)) weight += 10;
  }

  return weight;
}

// ========== 3. ФИЛЬТР ДУБЛИКАТОВ ==========
function isDuplicate(news, existingNews) {
  const normalize = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').substring(0, 100);
  const current = normalize(news.title);
  
  return existingNews.some(n => {
    const existing = normalize(n.title);
    return existing.includes(current) || current.includes(existing);
  });
}

// ========== 4. ФИЛЬТР УСТАРЕВШИХ НОВОСТЕЙ ==========
export function isOutdated(publishedAt) {
  if (!publishedAt) return false;
  
  const now = Date.now();
  const newsTime = new Date(publishedAt).getTime();
  const diffHours = (now - newsTime) / (1000 * 60 * 60);
  
  return diffHours > 24; // старше суток
}

// ========== 5. BREAKING NEWS БУСТ ==========
function getBreakingBoost(text) {
  const keywords = [
    'breaking', 'just in', 'developing', 'live updates', 'urgent',
    'flash', 'emergency', 'immediate', 'now', 'latest'
  ];
  
  let boost = 0;
  for (const k of keywords) {
    if (text.toLowerCase().includes(k)) boost += 10;
  }
  
  return boost;
}

// ========== 6. ENTITY-AWARE ФИЛЬТР ==========
const importantEntities = [
  'white house', 'pentagon', 'kremlin', 'un', 'united nations', 'nato',
  'who', 'world health organization', 'imf', 'world bank', 'eu',
  'g7', 'g20', 'opec', 'fbi', 'cia', 'nasa', 'spacex'
];

function getEntityScore(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const entity of importantEntities) {
    if (lower.includes(entity)) score += 8;
  }
  return score;
}

// ========== 7. CONFIDENCE SCORE ==========
function calculateConfidence(matchCount, textLength) {
  return Math.min(1, matchCount / (textLength / 50));
}

// ========== ИГНОРИРУЕМЫЕ ТЕМЫ ==========
const ignoredTopics = {
  sports: {
    keywords: [
      'football', 'soccer', 'basketball', 'tennis', 'cricket', 'baseball',
      'hockey', 'golf', 'rugby', 'athlete', 'coach', 'player', 'team',
      'match', 'tournament', 'championship', 'league', 'playoff', 'super bowl',
      'world cup', 'olympic', 'nba', 'nfl', 'uefa', 'fifa', 'mlb', 'nhl'
    ]
  },
  entertainment: {
    keywords: [
      'celebrity gossip', 'red carpet', 'fashion week', 'makeup tutorial',
      'reality tv', 'dating show', 'talent show', 'cooking show',
      'celebrity', 'hollywood gossip', 'movie premiere'
    ]
  }
};

// ========== КАТЕГОРИИ С ВЕСАМИ ==========
const categoryKeywords = {
  military: {
    weight: 2,
    priority: 1,
    icon: 'fas fa-shield-alt',
    color: '#ef4444',
    keywords: [
      'war', 'conflict', 'attack', 'military', 'battle', 'strike', 
      'defense', 'explosion', 'drone', 'missile', 'army', 'tank',
      'fighter', 'jet', 'bomb', 'shelling', 'casualties', 'troops',
      'offensive', 'counterattack', 'frontline', 'ceasefire', 'invasion',
      'air strike', 'ground operation', 'navy', 'artillery', 'rocket',
      'uav', 'ballistic missile', 'air defense', 'military base',
      'deployment', 'mobilization', 'conscription', 'mercenaries',
      'paramilitary', 'special forces', 'nato', 'military aid',
      'border clash', 'incursion', 'security forces'
    ]
  },
  disasters: {
    weight: 2,
    priority: 1,
    icon: 'fas fa-fire',
    color: '#f59e0b',
    keywords: [
      'earthquake', 'flood', 'hurricane', 'fire', 'landslide', 
      'tornado', 'disaster', 'wildfire', 'eruption', 'tsunami',
      'cyclone', 'storm', 'drought', 'avalanche', 'mudslide',
      'evacuation', 'rescue', 'wildfire', 'blaze', 'burning',
      'aftershock', 'magnitude', 'seismic', 'flooding', 'flash flood',
      'storm surge', 'heatwave', 'extreme weather', 'climate disaster',
      'evacuated', 'missing persons', 'death toll', 'injured',
      'emergency response', 'relief operation', 'power outage'
    ]
  },
  politics: {
    weight: 1.5,
    priority: 2,
    icon: 'fas fa-landmark',
    color: '#a855f7',
    keywords: [
      'election', 'protest', 'government', 'crisis', 'sanctions', 
      'parliament', 'vote', 'president', 'minister', 'policy',
      'diplomacy', 'negotiation', 'summit', 'alliance', 'treaty',
      'law', 'regulation', 'reform', 'opposition', 'campaign',
      'senate', 'congress', 'prime minister', 'cabinet',
      'geopolitics', 'foreign policy', 'domestic policy',
      'legislation', 'bill passed', 'trade talks', 'tariffs', 'embargo',
      'political unrest', 'demonstration', 'riot', 'leadership change',
      'resignation', 'impeachment', 'diplomatic relations', 'peace talks'
    ]
  },
  economy: {
    weight: 1.8,
    priority: 2,
    icon: 'fas fa-chart-line',
    color: '#10b981',
    keywords: [
      'economy', 'market', 'stock', 'trade', 'inflation', 'recession',
      'growth', 'gdp', 'investment', 'bank', 'interest rate',
      'cryptocurrency', 'bitcoin', 'ethereum', 'financial', 'debt',
      'credit', 'loan', 'mortgage', 'housing', 'real estate',
      'tax', 'budget', 'fiscal', 'monetary', 'dollar', 'euro',
      'jobs report', 'unemployment', 'economic crisis', 'supply chain',
      'consumer spending', 'retail sales', 'bond yield', 'central bank',
      'fed', 'ecb', 'rate hike', 'rate cut', 'bankruptcy', 'stimulus',
      'commodity prices', 'oil prices', 'gas prices', 'trade deficit'
    ]
  },
  health: {
    weight: 1.8,
    priority: 2,
    icon: 'fas fa-hospital',
    color: '#10b981',
    keywords: [
      'health', 'disease', 'pandemic', 'epidemic', 'outbreak',
      'hospital', 'clinic', 'vaccine', 'treatment', 'cure',
      'covid', 'coronavirus', 'flu', 'virus', 'bacteria',
      'infection', 'medicine', 'doctor', 'nurse', 'patient',
      'healthcare', 'medical', 'surgery', 'emergency room',
      'public health', 'who', 'cdc', 'health ministry',
      'variant', 'mutation', 'immunization', 'booster',
      'clinical study', 'trial phase', 'drug approval',
      'mental health', 'burnout', 'telemedicine', 'shortage',
      'medical supply', 'icu', 'intensive care'
    ]
  },
  science: {
    weight: 1.5,
    priority: 3,
    icon: 'fas fa-flask',
    color: '#3b82f6',
    keywords: [
      'space', 'research', 'discovery', 'scientific', 'crispr', 
      'quantum', 'nasa', 'spacex', 'science', 'invention',
      'technology', 'ai', 'artificial intelligence', 'robot',
      'vaccine', 'medical research', 'clinical trial', 'breakthrough',
      'innovation', 'laboratory', 'study', 'experiment', 'physics',
      'chemistry', 'biology', 'astronomy', 'mars', 'moon mission',
      'machine learning', 'deep learning', 'neural network',
      'data center', 'automation', 'robotics', 'space mission',
      'satellite', 'orbit', 'launch', 'rocket', 'payload'
    ]
  },
  popular: {
    weight: 1,
    priority: 4,
    icon: 'fas fa-star',
    color: '#ec4899',
    keywords: [
      'viral', 'trending', 'record', 'million views', 'blockbuster', 
      'celebrity', 'tiktok', 'instagram', 'twitter', 'meme',
      'influencer', 'streamer', 'youtube', 'netflix', 'spotify',
      'concert', 'festival', 'award', 'oscar', 'grammy', 'hollywood',
      'movie', 'series', 'entertainment', 'music', 'artist',
      'content creator', 'streaming platform', 'box office',
      'media industry', 'executive change', 'ceo', 'leadership shift',
      'disney', 'streaming wars', 'digital media'
    ]
  }
};

// Проверка на игнорируемый контент
function isIgnoredContent(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  for (const topic of Object.values(ignoredTopics)) {
    for (const keyword of topic.keywords) {
      if (text.includes(keyword)) {
        return true;
      }
    }
  }
  
  return false;
}

// Главная функция категоризации
export function categorizeNews(title, description) {
  // Проверяем игнорируемые темы
  if (isIgnoredContent(title, description)) {
    return 'ignored';
  }
  
  // Проверяем низкокачественный контент
  if (isLowQualityContent(title, description)) {
    return 'ignored';
  }
  
  const text = `${title} ${description || ''}`.toLowerCase();
  const scores = {};
  
  // Подсчет очков для каждой категории
  for (const [category, config] of Object.entries(categoryKeywords)) {
    let score = 0;
    let matchCount = 0;
    
    for (const keyword of config.keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const found = (text.match(regex) || []).length;
      if (found > 0) {
        matchCount += found;
        score += found * config.weight;
      }
    }
    
    // Бонус за несколько совпадений
    if (matchCount >= 2) score *= 1.2;
    if (matchCount >= 3) score *= 1.3;
    
    // Добавляем геополитический вес
    score += getGeoWeight(text) * 0.5;
    
    // Добавляем entity score
    score += getEntityScore(text) * 0.3;
    
    if (score > 0) {
      scores[category] = {
        score,
        matchCount,
        confidence: calculateConfidence(matchCount, text.length)
      };
    }
  }
  
  if (Object.keys(scores).length > 0) {
    // Сортируем по приоритету и счету
    const bestCategory = Object.entries(scores)
      .sort((a, b) => {
        const priorityA = categoryKeywords[a[0]]?.priority || 99;
        const priorityB = categoryKeywords[b[0]]?.priority || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        
        // Фильтруем по уверенности
        if (b[1].confidence < 0.2) return -1;
        return b[1].score - a[1].score;
      })[0][0];
    
    return bestCategory;
  }
  
  return 'politics';
}

// Расчет интенсивности
export function calculateIntensity(sentimentScore, category, text) {
  let intensity = 50;
  
  // Влияние тональности
  if (sentimentScore < -50) intensity = 95;
  else if (sentimentScore < -20) intensity = 85;
  else if (sentimentScore < 0) intensity = 70;
  else if (sentimentScore > 50) intensity = 30;
  else if (sentimentScore > 20) intensity = 40;
  else if (sentimentScore > 0) intensity = 50;
  
  // Корректировка по категории
  const categoryIntensity = {
    military: 20,
    disasters: 25,
    politics: 10,
    health: 15,
    economy: 5,
    science: -10,
    popular: -20
  };
  
  intensity += categoryIntensity[category] || 0;
  
  // Breaking news boost
  intensity += getBreakingBoost(text);
  
  // Геополитический вес
  intensity += getGeoWeight(text) / 10;
  
  // Поиск ключевых слов экстренности
  const urgentKeywords = [
    'breaking', 'urgent', 'emergency', 'critical', 
    'catastrophic', 'deadly', 'fatal', 'disaster',
    'crisis', 'evacuation', 'casualties', 'imminent',
    'severe', 'massive', 'devastating', 'catastrophe'
  ];
  
  for (const keyword of urgentKeywords) {
    if (text.toLowerCase().includes(keyword)) {
      intensity += 15;
      break;
    }
  }
  
  return Math.max(0, Math.min(100, intensity));
}

// Получение метки тональности
export function getSentimentLabel(score) {
  if (score <= -60) return { label: 'Catastrophic', color: 'text-red-600', icon: 'fas fa-skull' };
  if (score <= -30) return { label: 'Critical', color: 'text-red-500', icon: 'fas fa-exclamation-triangle' };
  if (score <= -10) return { label: 'Negative', color: 'text-orange-500', icon: 'fas fa-frown' };
  if (score <= 10) return { label: 'Neutral', color: 'text-gray-400', icon: 'fas fa-meh' };
  if (score <= 30) return { label: 'Positive', color: 'text-green-500', icon: 'fas fa-smile' };
  if (score <= 60) return { label: 'Optimistic', color: 'text-green-400', icon: 'fas fa-grin' };
  return { label: 'Excellent', color: 'text-green-300', icon: 'fas fa-star' };
}

export const categoryList = Object.keys(categoryKeywords);
export const categoryInfo = categoryKeywords;