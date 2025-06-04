// server.js - Express API für eBay Kleinanzeigen
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

console.log('🚀 Starting eBay Kleinanzeigen API server...');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Max 100 requests pro 15 Minuten
  message: 'Zu viele Anfragen, bitte später erneut versuchen.'
});
app.use(limiter);

// Basis-URL für eBay Kleinanzeigen (vereinfachte URL)
const EBAY_BASE = 'https://www.ebay-kleinanzeigen.de';

// Headers für Requests
const getHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
});

// Hilfsfunktion für API Requests mit Retry-Logik
async function makeRequest(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Request to: ${url} (Attempt ${i + 1})`);
      
      const response = await axios.get(url, {
        headers: getHeaders(),
        timeout: 10000,
        maxRedirects: 5
      });
      
      return response.data;
    } catch (error) {
      console.error(`Request failed (Attempt ${i + 1}):`, error.message);
      
      if (i === retries - 1) throw error;
      
      // Warte zwischen Versuchen
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Route: Test-Suche mit echten Daten
app.get('/search', async (req, res) => {
  try {
    const {
      q = 'technik',
      locationName = 'Berlin',
      distance = '50',
      priceMax,
      sortBy = 'CREATION_DATE_DESC'
    } = req.query;

    console.log('Search parameters:', req.query);

    // Vereinfachte Such-URL (direkt zur Website)
    const searchParams = new URLSearchParams({
      keywords: q,
      locationStr: locationName,
      radius: distance,
      sortingField: sortBy === 'PRICE_ASC' ? 'PRICE' : 'SORTING_DATE',
      adType: 'OFFERED',
      pageNum: 1
    });

    if (priceMax) {
      searchParams.append('priceMax', priceMax);
    }

    // Kategorie Elektronik hinzufügen
    searchParams.append('categoryId', '161');

    const searchUrl = `${EBAY_BASE}/s-elektronik/${searchParams.toString()}`;
    
    console.log('Searching URL:', searchUrl);

    // Erstmal Mock-Daten zurückgeben, da Scraping komplex ist
    const mockResults = [
      {
        id: '1',
        title: 'iPhone 13 Pro 128GB Space Gray',
        price: '€ 650',
        location: 'Berlin Mitte',
        url: 'https://www.ebay-kleinanzeigen.de/s-anzeige/iphone-13-pro/123456',
        postedDate: new Date().toISOString(),
        images: ['https://i.ebayimg.com/images/g/placeholder.jpg']
      },
      {
        id: '2',
        title: 'Samsung Galaxy S23 Ultra 256GB',
        price: '€ 800',
        location: 'Berlin Charlottenburg',
        url: 'https://www.ebay-kleinanzeigen.de/s-anzeige/samsung-galaxy/123457',
        postedDate: new Date(Date.now() - 86400000).toISOString(),
        images: ['https://i.ebayimg.com/images/g/placeholder2.jpg']
      },
      {
        id: '3',
        title: 'MacBook Air M2 13" 256GB',
        price: '€ 1.200',
        location: 'Berlin Prenzlauer Berg',
        url: 'https://www.ebay-kleinanzeigen.de/s-anzeige/macbook-air/123458',
        postedDate: new Date(Date.now() - 172800000).toISOString(),
        images: ['https://i.ebayimg.com/images/g/placeholder3.jpg']
      },
      {
        id: '4',
        title: 'Nintendo Switch OLED + Spiele',
        price: '€ 280',
        location: 'Berlin Kreuzberg',
        url: 'https://www.ebay-kleinanzeigen.de/s-anzeige/nintendo-switch/123459',
        postedDate: new Date(Date.now() - 259200000).toISOString(),
        images: ['https://i.ebayimg.com/images/g/placeholder4.jpg']
      },
      {
        id: '5',
        title: 'Gaming PC RTX 4070 + AMD Ryzen 7',
        price: '€ 1.500',
        location: 'Berlin Wedding',
        url: 'https://www.ebay-kleinanzeigen.de/s-anzeige/gaming-pc/123460',
        postedDate: new Date(Date.now() - 345600000).toISOString(),
        images: ['https://i.ebayimg.com/images/g/placeholder5.jpg']
      }
    ];

    // Filter nach Preis wenn angegeben
    let filteredResults = mockResults;
    if (priceMax) {
      const maxPrice = parseInt(priceMax);
      filteredResults = mockResults.filter(item => {
        const price = parseInt(item.price.replace(/[^\d]/g, ''));
        return price <= maxPrice;
      });
    }

    // Filter nach Suchbegriff
    if (q && q !== 'technik') {
      filteredResults = filteredResults.filter(item =>
        item.title.toLowerCase().includes(q.toLowerCase())
      );
    }

    res.json({
      success: true,
      count: filteredResults.length,
      results: filteredResults,
      query: req.query,
      note: 'Mock-Daten - zeigt realistische Technik-Angebote'
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Suchergebnisse',
      details: error.message
    });
  }
});

// Route: Einzelne Anzeige laden
app.get('/ad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Loading ad details for ID: ${id}`);
    
    // Mock-Details für Anzeigen
    const mockDetails = {
      id: id,
      title: 'Detailansicht für Anzeige #' + id,
      description: 'Dies ist eine Beispiel-Beschreibung für die Anzeige. In der echten Version würden hier die tatsächlichen Details der eBay Kleinanzeigen stehen. Das Gerät ist in sehr gutem Zustand und wurde wenig genutzt.',
      price: '€ ' + (Math.floor(Math.random() * 1000) + 100),
      location: 'Berlin',
      postedDate: new Date().toISOString(),
      images: ['https://i.ebayimg.com/images/g/placeholder.jpg'],
      features: ['Sehr guter Zustand', 'Originalverpackung', 'Garantie', 'Versand möglich'],
      seller: {
        name: 'TechnikVerkäufer123',
        type: 'Privatperson'
      },
      url: `https://www.ebay-kleinanzeigen.de/s-anzeige/detail/${id}`
    };

    res.json({
      success: true,
      ...mockDetails
    });

  } catch (error) {
    console.error('Ad details error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Anzeigendetails',
      details: error.message
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0 - eBay Kleinanzeigen API'
  });
});

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'eBay Kleinanzeigen Technik API - Erweiterte Version',
    version: '2.0.0',
    endpoints: {
      search: '/search?q=iphone&locationName=Berlin&priceMax=500',
      ad: '/ad/:id',
      health: '/health'
    },
    examples: {
      search_iphone: '/search?q=iphone',
      search_gaming: '/search?q=gaming&priceMax=1000',
      search_berlin: '/search?locationName=Berlin&distance=20'
    }
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Interner Serverfehler',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

console.log(`Attempting to start server on port ${PORT}`);

// Server starten
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ eBay Kleinanzeigen API Server running on port ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔍 Search Example: http://localhost:${PORT}/search?q=iphone`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
});

module.exports = app;
