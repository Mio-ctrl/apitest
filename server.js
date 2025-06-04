const express = require('express');
const cors = require('cors');

console.log('🚀 Starting simple test server...');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Einfacher Test-Endpoint
app.get('/', (req, res) => {
  console.log('Root route called');
  res.json({ 
    message: 'Test Server läuft!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ 
    status: 'OK',
    server: 'running'
  });
});

// Einfache Test-Suche OHNE eBay API
app.get('/search', (req, res) => {
  console.log('Search called with params:', req.query);
  res.json({
    success: true,
    message: 'Test-Daten',
    results: [
      {
        id: '123',
        title: 'Test iPhone 12',
        price: '€ 450',
        location: 'Berlin',
        url: '#',
        images: []
      }
    ]
  });
});

console.log(`Attempting to start server on port ${PORT}`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully started on port ${PORT}`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
});
