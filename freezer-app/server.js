const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 3000;

const db = require('./db');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve admin pages
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'views', 'admin.html'));
});
app.get('/admin/csv', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'views', 'csv.html'));
});
app.get('/admin/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'views', 'settings.html'));
});

// API router
const apiBase = '/freezer-inventory/v1';
const router = require('./routes');
app.use(apiBase, router);

// Root redirect
app.get('/', (req, res) => res.redirect('/admin'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Freezer Inventory app listening on http://localhost:${PORT}`);
});
