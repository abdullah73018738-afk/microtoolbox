/**
 * Main Thread Orchestrator - UI, Event Listeners, Worker Protocol, Clipboard
 */

class MicroToolboxApp {
  constructor() {
    this.worker = new Worker('js/worker.js');
    this.workerCallbacks = new Map();
    this.msgIdCounter = 0;

    this.initElements();
    this.attachEventListeners();
    this.registerWorkerHandler();
    this.initPWA();
  }

  initElements() {
    // Tabs
    this.tabs = document.querySelectorAll('.tab-btn');
    this.panels = document.querySelectorAll('.panel');

    // Minifier Elements
    this.btnMinify = document.getElementById('btn-minify');
    this.spinMinify = document.getElementById('spin-minify');
    this.minifyInput = document.getElementById('minify-input');
    this.minifyOutput = document.getElementById('minify-output');
    this.langSelect = document.getElementById('lang-select');
    this.btnCopyMinify = document.getElementById('btn-copy-minify');

    // Analyzer Elements
    this.analyzerInput = document.getElementById('analyzer-input');
    this.statWords = document.getElementById('stat-words');
    this.statChars = document.getElementById('stat-chars');
    this.statLines = document.getElementById('stat-lines');
    this.statReadTime = document.getElementById('stat-readtime');

    // JSON Elements
    this.jsonInput = document.getElementById('json-input');
    this.jsonOutput = document.getElementById('json-output');
    this.btnFormatJson = document.getElementById('btn-format-json');
    this.btnMinifyJson = document.getElementById('btn-minify-json');

    // Tag Generator Elements
    this.btnGenTags = document.getElementById('btn-gen-tags');
    this.tagTopic = document.getElementById('tag-topic');
    this.tagOutput = document.getElementById('tag-output');
    this.btnCopyTags = document.getElementById('btn-copy-tags');

    // Toast Container
    this.toastContainer = document.getElementById('toast-container');
  }

  attachEventListeners() {
    // Tab Switching Framework
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.tabs.forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        this.panels.forEach((p) => p.classList.remove('active'));

        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const activePanel = document.getElementById(tab.getAttribute('aria-controls'));
        if (activePanel) activePanel.classList.add('active');
      });
    });

    // Minification Action
    this.btnMinify.addEventListener('click', () => this.handleMinification());

    // Debounced Real-time Text Analysis
    let debounceTimer;
    this.analyzerInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.handleAnalysis(), 150);
    });

    // JSON Operations
    this.btnFormatJson.addEventListener('click', () => this.handleJSON(2));
    this.btnMinifyJson.addEventListener('click', () => this.handleJSON(0));

    // Tag Generator Action
    this.btnGenTags.addEventListener('click', async () => {
      const topic = this.tagTopic.value;
      if (!topic.trim()) return this.showToast('Please enter a topic', 'error');
      const result = await this.executeWorkerTask('GENERATE_TAGS', { topic });
      this.tagOutput.value = result;
      this.showToast('Tags generated!', 'success');
    });

    // Clipboard Actions
    this.btnCopyMinify.addEventListener('click', () => {
      this.copyToClipboard(this.minifyOutput.value);
    });
    this.btnCopyTags.addEventListener('click', () => {
      this.copyToClipboard(this.tagOutput.value);
    });
  }

  registerWorkerHandler() {
    this.worker.onmessage = (e) => {
      const { id, success, result, error } = e.data;
      if (this.workerCallbacks.has(id)) {
        const { resolve, reject } = this.workerCallbacks.get(id);
        this.workerCallbacks.delete(id);
        if (success) resolve(result);
        else reject(new Error(error));
      }
    };
  }

  executeWorkerTask(action, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgIdCounter;
      this.workerCallbacks.set(id, { resolve, reject });
      this.worker.postMessage({ id, action, payload });
    });
  }

  async handleMinification() {
    const code = this.minifyInput.value;
    if (!code.trim()) {
      this.showToast('Please enter source code to minify.', 'error');
      return;
    }

    this.spinMinify.style.display = 'inline-block';
    this.btnMinify.disabled = true;

    try {
      const minified = await this.executeWorkerTask('MINIFY', {
        code,
        lang: this.langSelect.value
      });
      this.minifyOutput.value = minified;
      this.showToast('Code minified successfully!', 'success');
    } catch (err) {
      this.showToast(`Minification Error: ${err.message}`, 'error');
    } finally {
      this.spinMinify.style.display = 'none';
      this.btnMinify.disabled = false;
    }
  }

  async handleAnalysis() {
    const text = this.analyzerInput.value;
    try {
      const stats = await this.executeWorkerTask('ANALYZE_TEXT', { text });
      this.statWords.textContent = stats.words.toLocaleString();
      this.statChars.textContent = stats.chars.toLocaleString();
      this.statLines.textContent = stats.lines.toLocaleString();
      this.statReadTime.textContent = stats.readTime;
    } catch (err) {
      console.error('Analysis Worker Error:', err);
    }
  }

  async handleJSON(indent) {
    const jsonStr = this.jsonInput.value;
    if (!jsonStr.trim()) {
      this.showToast('Please provide JSON string input.', 'error');
      return;
    }

    try {
      const result = await this.executeWorkerTask('FORMAT_JSON', {
        json: jsonStr,
        indent
      });
      this.jsonOutput.value = result;
      this.showToast('JSON processed successfully!', 'success');
    } catch (err) {
      this.showToast(`Invalid JSON: ${err.message}`, 'error');
    }
  }

  async copyToClipboard(text) {
    if (!text) {
      this.showToast('Nothing to copy!', 'error');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      this.showToast('Copied to clipboard!', 'success');
    } catch (err) {
      this.showToast('Failed to copy to clipboard.', 'error');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then(() => console.log('Service Worker Registered Successfully'))
          .catch((err) => console.error('Service Worker Registration Failed:', err));
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new MicroToolboxApp();
});
