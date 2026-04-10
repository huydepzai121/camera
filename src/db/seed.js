const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./database');
const config = require('../config');

function seedAdmin() {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (existing) return;

  const hash = bcrypt.hashSync(config.defaultAdminPassword, 12);
  db.prepare(
    'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), 'admin', hash, 'admin');

  console.log('Default admin account created (username: admin)');
}

module.exports = { seedAdmin };
