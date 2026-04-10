// PTZ Controls client-side component
function initPtzControls(containerId, cameraId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="ptz-panel">
      <div class="ptz-dpad">
        <div></div>
        <button class="ptz-btn" data-pan="0" data-tilt="1">↑</button>
        <div></div>
        <button class="ptz-btn" data-pan="-1" data-tilt="0">←</button>
        <div class="ptz-center"></div>
        <button class="ptz-btn" data-pan="1" data-tilt="0">→</button>
        <div></div>
        <button class="ptz-btn" data-pan="0" data-tilt="-1">↓</button>
        <div></div>
      </div>
      <div class="ptz-zoom">
        <button class="btn btn-sm btn-outline" id="zoomIn">🔍+ Zoom In</button>
        <button class="btn btn-sm btn-outline" id="zoomOut">🔍- Zoom Out</button>
      </div>
      <div style="width:100%;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:13px;color:var(--text-secondary);">Presets</span>
          <button class="btn btn-sm btn-outline" onclick="saveNewPreset()">+ Save</button>
        </div>
        <div class="ptz-presets" id="ptzPresets">Loading...</div>
      </div>
    </div>
  `;

  // D-pad buttons: mousedown = move, mouseup = stop
  container.querySelectorAll('.ptz-dpad .ptz-btn').forEach(btn => {
    btn.addEventListener('mousedown', () => {
      const pan = parseFloat(btn.dataset.pan);
      const tilt = parseFloat(btn.dataset.tilt);
      ptzMove(cameraId, pan, tilt, 0);
    });
    btn.addEventListener('mouseup', () => ptzStop(cameraId));
    btn.addEventListener('mouseleave', () => ptzStop(cameraId));
    // Touch support
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const pan = parseFloat(btn.dataset.pan);
      const tilt = parseFloat(btn.dataset.tilt);
      ptzMove(cameraId, pan, tilt, 0);
    });
    btn.addEventListener('touchend', () => ptzStop(cameraId));
  });

  // Zoom
  const zoomIn = container.querySelector('#zoomIn');
  const zoomOut = container.querySelector('#zoomOut');
  zoomIn.addEventListener('mousedown', () => ptzMove(cameraId, 0, 0, 1));
  zoomIn.addEventListener('mouseup', () => ptzStop(cameraId));
  zoomIn.addEventListener('mouseleave', () => ptzStop(cameraId));
  zoomOut.addEventListener('mousedown', () => ptzMove(cameraId, 0, 0, -1));
  zoomOut.addEventListener('mouseup', () => ptzStop(cameraId));
  zoomOut.addEventListener('mouseleave', () => ptzStop(cameraId));

  loadPresets(cameraId);
}

async function ptzMove(cameraId, pan, tilt, zoom) {
  try {
    await api(`/api/cameras/${cameraId}/ptz/move`, {
      method: 'POST',
      body: JSON.stringify({ pan, tilt, zoom }),
    });
  } catch {}
}

async function ptzStop(cameraId) {
  try {
    await api(`/api/cameras/${cameraId}/ptz/stop`, { method: 'POST' });
  } catch {}
}

async function loadPresets(cameraId) {
  const presets = await api(`/api/cameras/${cameraId}/ptz/presets`);
  const container = document.getElementById('ptzPresets');
  if (presets.length === 0) {
    container.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">No presets saved</span>';
    return;
  }
  container.innerHTML = presets.map(p => `
    <button class="btn btn-sm btn-outline" onclick="gotoPreset('${cameraId}', '${p.id}')">${p.name}</button>
  `).join('');
}

async function saveNewPreset() {
  const name = prompt('Preset name:');
  if (!name) return;
  const cameraId = document.querySelector('[data-pan]')?.closest('.ptz-panel')?.closest('[id]')?.id;
  // Get cameraId from URL
  const match = location.pathname.match(/\/cameras\/([^/]+)/);
  if (!match) return;
  try {
    await api(`/api/cameras/${match[1]}/ptz/presets`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    notify('Preset saved', 'success');
    loadPresets(match[1]);
  } catch (err) {
    notify(err.message, 'error');
  }
}

async function gotoPreset(cameraId, presetId) {
  try {
    await api(`/api/cameras/${cameraId}/ptz/presets/${presetId}/goto`, { method: 'POST' });
  } catch (err) {
    notify(err.message, 'error');
  }
}
