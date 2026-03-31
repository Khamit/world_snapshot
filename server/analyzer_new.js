// world_snapshot/server/analyzer_new.js
// ========== УЛУЧШЕННЫЙ АНАЛИЗАТОР ТОНАЛЬНОСТИ ==========
export function analyzeSentiment(text) {
  const negativeWords = {
    war: 15, death: 20, attack: 15, crisis: 12, conflict: 12,
    kill: 18, bomb: 15, missile: 12, drone: 8, explosion: 12,
    destroyed: 10, casualties: 15, violence: 10, terror: 15,
    collapse: 8, disaster: 10, emergency: 5, evacuation: 5,
    strike: 10, offensive: 8, invasion: 15, clashes: 10
  };
  
  const positiveWords = {
    success: 10, breakthrough: 15, victory: 12, peace: 15,
    discovery: 10, innovation: 8, recovery: 8, agreement: 10,
    ceasefire: 12, rescue: 10, aid: 5, cooperation: 5,
    achievement: 8, progress: 5, hope: 3, treaty: 8
  };
  
  let score = 0;
  const lowerText = text.toLowerCase();
  
  for (const [word, weight] of Object.entries(negativeWords)) {
    if (lowerText.includes(word)) score -= weight;
  }
  
  for (const [word, weight] of Object.entries(positiveWords)) {
    if (lowerText.includes(word)) score += weight;
  }
  
  return Math.max(-100, Math.min(100, score));
}

// ========== ИГНОРИРУЕМЫЕ ТЕМЫ (СПОРТ И Т.Д.) ==========
const ignoredTopics = {
  sports: {
    keywords: [
      'football', 'soccer', 'basketball', 'tennis', 'cricket', 'baseball',
      'hockey', 'golf', 'rugby', 'athlete', 'coach', 'player', 'team',
      'match', 'tournament', 'championship', 'league', 'playoff', 'super bowl',
      'world cup', 'olympic', 'arsenal', 'chelsea', 'liverpool', 'manchester',
      'real madrid', 'barcelona', 'bayern', 'psg', 'nba', 'nfl', 'uefa',
      'fifa', 'wsl', 'derby', 'goal', 'score', 'striker', 'goalkeeper',

      // NEW
      'mlb', 'nhl', 'formula 1', 'f1', 'grand prix', 'motogp',
      'ufc', 'mma', 'boxing', 'knockout', 'title fight',
      'esports', 'dota', 'league of legends', 'counter strike',
      'transfer', 'draft', 'season opener', 'finals', 'semifinal'
    ]
  }
};

// ========== КАТЕГОРИИ С ВЕСАМИ ==========
const categoryKeywords = {
military: {
  weight: 2,
  priority: 1,
  keywords: [
    'war', 'conflict', 'attack', 'military', 'battle', 'strike', 
    'defense', 'explosion', 'drone', 'missile', 'army', 'tank',
    'fighter', 'jet', 'bomb', 'shelling', 'casualties', 'troops',
    'offensive', 'counterattack', 'frontline', 'ceasefire', 'invasion',
    'air strike', 'ground operation', 'navy', 'artillery', 'rocket',

    // NEW
    'uav', 'kamikaze drone', 'ballistic missile', 'cruise missile',
    'air defense', 'anti-aircraft', 'interceptor', 'radar',
    'military base', 'deployment', 'mobilization', 'conscription',
    'mercenaries', 'paramilitary', 'special forces',
    'nato', 'military aid', 'weapons shipment', 'arms supply',
    'cluster munition', 'hypersonic', 'surveillance drone',
    'border clash', 'incursion', 'security forces'
  ]
},

disasters: {
  weight: 2,
  priority: 1,
  keywords: [
    'earthquake', 'flood', 'hurricane', 'fire', 'landslide', 
    'tornado', 'disaster', 'wildfire', 'eruption', 'tsunami',
    'cyclone', 'storm', 'drought', 'avalanche', 'mudslide',
    'evacuation', 'rescue', 'wildfire', 'blaze', 'burning',

    // NEW
    'aftershock', 'magnitude', 'richter', 'seismic',
    'flooding', 'flash flood', 'storm surge',
    'heatwave', 'extreme weather', 'climate disaster',
    'evacuated', 'missing persons', 'death toll', 'injured',
    'emergency response', 'relief operation', 'aid effort',
    'power outage', 'blackout', 'infrastructure damage'
  ]
},

economy: {
  weight: 1.8,
  priority: 2,
  keywords: [
    'economy', 'market', 'stock', 'trade', 'inflation', 'recession',
    'growth', 'gdp', 'investment', 'bank', 'interest rate',
    'cryptocurrency', 'bitcoin', 'ethereum', 'financial', 'debt',
    'credit', 'loan', 'mortgage', 'housing', 'real estate',
    'tax', 'budget', 'fiscal', 'monetary', 'dollar', 'euro',
    'jobs report', 'unemployment', 'economic crisis',

    // NEW
    'k-shaped recovery', 'supply chain', 'supply shock',
    'consumer spending', 'retail sales', 'bond yield',
    'central bank', 'fed', 'ecb', 'rate hike', 'rate cut',
    'liquidity', 'default', 'bankruptcy', 'stimulus',
    'buy now pay later', 'bnpl', 'household debt',
    'commodity prices', 'oil prices', 'gas prices',
    'trade deficit', 'exports', 'imports'
  ]
},

health: {
  weight: 1.8,
  priority: 2,
  keywords: [
    'health', 'disease', 'pandemic', 'epidemic', 'outbreak',
    'hospital', 'clinic', 'vaccine', 'treatment', 'cure',
    'covid', 'coronavirus', 'flu', 'virus', 'bacteria',
    'infection', 'medicine', 'doctor', 'nurse', 'patient',
    'healthcare', 'medical', 'surgery', 'emergency room',

    // NEW
    'public health', 'who', 'cdc', 'health ministry',
    'variant', 'mutation', 'immunization', 'booster',
    'clinical study', 'trial phase', 'drug approval',
    'mental health', 'burnout', 'telemedicine',
    'shortage', 'medical supply', 'icu', 'intensive care'
  ]
},

politics: {
  weight: 1.5,
  priority: 2,
  keywords: [
    'election', 'protest', 'government', 'crisis', 'sanctions', 
    'parliament', 'vote', 'president', 'minister', 'policy',
    'diplomacy', 'negotiation', 'summit', 'alliance', 'treaty',
    'law', 'regulation', 'reform', 'opposition', 'campaign',
    'senate', 'congress', 'prime minister', 'cabinet',

    // NEW
    'geopolitics', 'foreign policy', 'domestic policy',
    'regulatory', 'legislation', 'bill passed',
    'trade talks', 'wto', 'tariffs', 'embargo',
    'political unrest', 'demonstration', 'riot',
    'leadership change', 'resignation', 'impeachment',
    'diplomatic relations', 'peace talks'
  ]
},

science: {
  weight: 1.5,
  priority: 3,
  keywords: [
    'space', 'research', 'discovery', 'scientific', 'crispr', 
    'quantum', 'nasa', 'spacex', 'science', 'invention',
    'technology', 'ai', 'artificial intelligence', 'robot',
    'vaccine', 'medical research', 'clinical trial', 'breakthrough',
    'innovation', 'laboratory', 'study', 'experiment', 'physics',
    'chemistry', 'biology', 'astronomy', 'mars', 'moon mission',

    // NEW
    'agentic ai', 'machine learning', 'deep learning',
    'neural network', 'foundation model', 'llm',
    'data center', 'compute power', 'gpu cluster',
    'digital sovereignty', 'automation', 'robotics',
    'space mission', 'lunar mission', 'satellite',
    'orbit', 'launch', 'rocket', 'payload'
  ]
},

popular: {
  weight: 1,
  priority: 4,
  keywords: [
    'viral', 'trending', 'record', 'million views', 'blockbuster', 
    'celebrity', 'tiktok', 'instagram', 'twitter', 'meme',
    'influencer', 'streamer', 'youtube', 'netflix', 'spotify',
    'concert', 'festival', 'award', 'oscar', 'grammy', 'hollywood',
    'movie', 'series', 'entertainment', 'music', 'artist',

    // NEW
    'ai search', 'ai media', 'content creator',
    'streaming platform', 'box office',
    'media industry', 'journalism crisis',
    'executive change', 'ceo', 'leadership shift',
    'disney', 'streaming wars', 'digital media'
  ]
}

};

function isIgnoredContent(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Проверяем спорт
  for (const keyword of ignoredTopics.sports.keywords) {
    if (text.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

export function categorizeNews(title, description) {
  // Сначала проверяем, нужно ли игнорировать
  if (isIgnoredContent(title, description)) {
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
      const matches = (text.match(regex) || []).length;
      if (matches > 0) {
        matchCount += matches;
        score += matches * config.weight;
      }
    }
    
    // Бонус за несколько совпадений
    if (matchCount >= 2) score *= 1.2;
    if (matchCount >= 3) score *= 1.3;
    
    if (score > 0) scores[category] = score;
  }
  
  // Выбираем категорию с максимальным счетом
  if (Object.keys(scores).length > 0) {
    // Сортируем по приоритету и счету
    const bestCategory = Object.entries(scores)
      .sort((a, b) => {
        // Сначала по приоритету (меньше = выше приоритет)
        const priorityA = categoryKeywords[a[0]]?.priority || 99;
        const priorityB = categoryKeywords[b[0]]?.priority || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        // Затем по счету
        return b[1] - a[1];
      })[0][0];
    
    return bestCategory;
  }
  
  return 'politics'; // дефолтная категория
}

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
  
  // Поиск ключевых слов экстренности
  const urgentKeywords = [
    'breaking', 'urgent', 'emergency', 'critical', 
    'catastrophic', 'deadly', 'fatal', 'disaster',
    'crisis', 'evacuation', 'casualties'
  ];
  
  for (const keyword of urgentKeywords) {
    if (text.toLowerCase().includes(keyword)) {
      intensity += 15;
      break;
    }
  }
  
  return Math.max(0, Math.min(100, intensity));
}

// Экспорт дополнительных данных
export const categoryList = Object.keys(categoryKeywords);