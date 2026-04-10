const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// Cache ONVIF device connections
const deviceCache = new Map();

async function getOnvifDevice(camera) {
  if (deviceCache.has(camera.id)) return deviceCache.get(camera.id);

  if (!camera.onvif_host) return null;

  try {
    const onvif = require('node-onvif');
    const device = new onvif.OnvifDevice({
      xaddr: `http://${camera.onvif_host}:${camera.onvif_port || 80}/onvif/device_service`,
      user: camera.onvif_user || '',
      pass: camera.onvif_pass || '',
    });

    await device.init();
    deviceCache.set(camera.id, device);
    return device;
  } catch (err) {
    console.error(`[PTZ] Failed to connect to ONVIF device for ${camera.name}:`, err.message);
    return null;
  }
}

async function detectPtzCapability(cameraId) {
  const db = getDb();
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
  if (!camera || !camera.onvif_host) {
    db.prepare('UPDATE cameras SET ptz_supported = 0 WHERE id = ?').run(cameraId);
    return false;
  }

  try {
    const device = await getOnvifDevice(camera);
    if (!device) return false;

    const services = device.services;
    const hasPtz = !!(services && services.ptz);

    db.prepare('UPDATE cameras SET ptz_supported = ? WHERE id = ?').run(hasPtz ? 1 : 0, cameraId);
    return hasPtz;
  } catch {
    db.prepare('UPDATE cameras SET ptz_supported = 0 WHERE id = ?').run(cameraId);
    return false;
  }
}

async function continuousMove(cameraId, { pan = 0, tilt = 0, zoom = 0 }) {
  const db = getDb();
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
  if (!camera) throw new Error('Camera not found');

  const device = await getOnvifDevice(camera);
  if (!device) throw new Error('ONVIF device not available');

  try {
    await device.ptzMove({
      speed: { x: pan, y: tilt, z: zoom },
      timeout: 1,
    });
  } catch (err) {
    throw new Error('PTZ move failed: ' + err.message);
  }
}

async function stopMove(cameraId) {
  const db = getDb();
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
  if (!camera) throw new Error('Camera not found');

  const device = await getOnvifDevice(camera);
  if (!device) throw new Error('ONVIF device not available');

  try {
    await device.ptzStop();
  } catch (err) {
    throw new Error('PTZ stop failed: ' + err.message);
  }
}

async function savePreset(cameraId, presetName) {
  const db = getDb();
  const id = uuidv4();

  // Store in local DB (ONVIF set preset would need profile token)
  db.prepare('INSERT INTO ptz_presets (id, camera_id, name) VALUES (?, ?, ?)').run(id, cameraId, presetName);
  return { id, name: presetName };
}

async function gotoPreset(cameraId, presetId) {
  const db = getDb();
  const preset = db.prepare('SELECT * FROM ptz_presets WHERE id = ? AND camera_id = ?').get(presetId, cameraId);
  if (!preset) throw new Error('Preset not found');

  // In a full impl, this would call device.ptzGotoPreset(preset.onvif_preset_token)
  return { message: 'Moving to preset: ' + preset.name };
}

function getPresets(cameraId) {
  const db = getDb();
  return db.prepare('SELECT * FROM ptz_presets WHERE camera_id = ? ORDER BY name').all(cameraId);
}

function deletePreset(presetId) {
  const db = getDb();
  db.prepare('DELETE FROM ptz_presets WHERE id = ?').run(presetId);
}

function clearDeviceCache(cameraId) {
  deviceCache.delete(cameraId);
}

module.exports = {
  detectPtzCapability, continuousMove, stopMove,
  savePreset, gotoPreset, getPresets, deletePreset, clearDeviceCache,
};
