async function loadDashboard() {
  try {
    const stats = await api('/api/dashboard/stats');

    // Camera counts
    document.getElementById('totalCameras').textContent = stats.cameras.total;
    document.getElementById('onlineCameras').textContent = stats.cameras.online;
    document.getElementById('offlineCameras').textContent = stats.cameras.offline;
    document.getElementById('activeRecordings').textContent = stats.recordings.active;

    // Storage
    const usagePercent = Math.round(stats.storage.usage * 100);
    document.getElementById('storageBar').style.width = usagePercent + '%';
    if (usagePercent > 80) document.getElementById('storageBar').className = 'fill red';
    else if (usagePercent > 60) document.getElementById('storageBar').className = 'fill yellow';
    document.getElementById('storageUsed').textContent = formatBytes(stats.storage.total);
    document.getElementById('storageLimit').textContent = formatBytes(stats.storage.limit);
    document.getElementById('recStorage').textContent = formatBytes(stats.storage.recordings);
    document.getElementById('snapStorage').textContent = formatBytes(stats.storage.snapshots);

    // System health
    document.getElementById('cpuValue').textContent = stats.system.cpu + '%';
    document.getElementById('cpuBar').style.width = stats.system.cpu + '%';
    if (stats.system.cpu > 90) document.getElementById('cpuBar').className = 'fill red';
    else if (stats.system.cpu > 70) document.getElementById('cpuBar').className = 'fill yellow';

    document.getElementById('memValue').textContent = stats.system.memory + '%';
    document.getElementById('memBar').style.width = stats.system.memory + '%';
    if (stats.system.memory > 90) document.getElementById('memBar').className = 'fill red';

    document.getElementById('ffmpegCount').textContent = stats.system.ffmpegProcesses;
    document.getElementById('wsCount').textContent = stats.system.wsConnections;

    // Recent alerts
    const alertsContainer = document.getElementById('recentAlerts');
    if (stats.alerts.recent.length === 0) {
      alertsContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No recent alerts</p>';
    } else {
      alertsContainer.innerHTML = stats.alerts.recent.map(a => `
        <div class="alert-item">
          ${a.snapshot_id
            ? `<img class="alert-thumb" src="/api/snapshots/${a.snapshot_id}" alt="">`
            : '<div class="alert-thumb" style="display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-muted);">No img</div>'
          }
          <div class="alert-info">
            <h4>${a.camera_name}</h4>
            <p>${formatDate(a.created_at)}</p>
          </div>
          <span class="alert-badge ${a.status}">${a.status}</span>
        </div>
      `).join('');
    }

    // Storage warning
    if (usagePercent > 80) {
      notify('Storage usage is at ' + usagePercent + '%. Consider cleaning up old recordings.', 'warning', 8000);
    }
    if (stats.system.cpu > 90 || stats.system.memory > 90) {
      notify('High system resource usage detected. Consider reducing active streams.', 'warning', 8000);
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// Real-time updates via WebSocket
const dashWs = connectWs('/ws?action=notifications');
dashWs.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data);
    if (data.type === 'motion_alert') {
      notify('Motion: ' + data.cameraName, 'warning');
      loadDashboard();
    }
  } catch {}
};

loadDashboard();
setInterval(loadDashboard, 10000);
