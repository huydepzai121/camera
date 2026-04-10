// JSMpeg will be loaded from CDN in the view templates
// This file provides the stream viewer wrapper

class StreamViewer {
  constructor(canvas, cameraId, options = {}) {
    this.canvas = canvas;
    this.cameraId = cameraId;
    this.player = null;
    this.options = options;
  }

  start() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws?camera=${this.cameraId}`;

    if (typeof JSMpeg !== 'undefined') {
      this.player = new JSMpeg.Player(wsUrl, {
        canvas: this.canvas,
        autoplay: true,
        audio: false,
        loop: false,
        disableWebAssembly: false,
        preserveDrawingBuffer: true,
        ...this.options,
      });
    } else {
      // Fallback: raw WebSocket data rendering won't work without JSMpeg
      // Show message on canvas
      const ctx = this.canvas.getContext('2d');
      ctx.fillStyle = '#1a1d27';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#a0a3b1';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JSMpeg not loaded', this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  stop() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  isPlaying() {
    return this.player !== null;
  }
}
