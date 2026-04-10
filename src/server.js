const express = require('express');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { getDb } = require('./db/database');
const { seedAdmin } = require('./db/seed');
const { authenticateToken } = require('./middleware/auth');
const { setupWebSocket } = require('./services/stream-manager');

const app = express();
const server = http.createServer(app);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Auth middleware
app.use(authenticateToken);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cameras', require('./routes/cameras'));
app.use('/api/cameras/:id/ptz', require('./routes/ptz'));
app.use('/api/camera-groups', require('./routes/camera-groups'));
app.use('/api/recordings', require('./routes/recordings'));
app.use('/api/snapshots', require('./routes/snapshots'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Page routes
app.get('/', (req, res) => {
  res.render('dashboard', { title: 'Dashboard', user: req.user, page: 'dashboard' });
});

app.get('/cameras', (req, res) => {
  res.render('cameras/index', { title: 'Cameras', user: req.user, page: 'cameras' });
});

app.get('/cameras/grid', (req, res) => {
  res.render('cameras/grid', { title: 'Camera Grid', user: req.user, page: 'grid' });
});

app.get('/cameras/:id', (req, res) => {
  res.render('cameras/view', { title: 'Camera View', user: req.user, page: 'cameras', cameraId: req.params.id });
});

app.get('/recordings', (req, res) => {
  res.render('recordings/index', { title: 'Recordings', user: req.user, page: 'recordings' });
});

app.get('/snapshots', (req, res) => {
  res.render('snapshots/index', { title: 'Snapshots', user: req.user, page: 'snapshots' });
});

app.get('/alerts', (req, res) => {
  res.render('alerts/index', { title: 'Alerts', user: req.user, page: 'alerts' });
});

app.get('/users', (req, res) => {
  res.render('users/index', { title: 'Users', user: req.user, page: 'users' });
});

app.get('/settings', (req, res) => {
  res.render('settings/index', { title: 'Settings', user: req.user, page: 'settings' });
});

// Error pages
app.use((req, res) => {
  res.status(404).render('error', { title: '404', message: 'Page not found', user: req.user });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).render('error', { title: '500', message: 'Internal server error', user: req.user || null });
});

// Initialize
getDb();
seedAdmin();

// Setup WebSocket for streaming
setupWebSocket(server);

server.listen(config.port, config.host, () => {
  console.log(`Camera Management Server running at http://${config.host}:${config.port}`);
});

module.exports = { app, server };
