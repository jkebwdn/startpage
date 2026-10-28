const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
const key = 'startpage-pinterest-v1';
const pin = (n = 1) => ({ link: `https://uk.pinterest.com/pin/${n}/`, image: `https://i.pinimg.com/736x/${n}.jpg`, thumbnail: `https://i.pinimg.com/236x/${n}.jpg`, title: '<img onerror=bad> & art' });
const feed = (pins = [pin()], updatedAt = new Date().toISOString()) => ({ version: 1, updatedAt, pins, count: 999 });
const pause = () => new Promise(resolve => setTimeout(resolve, 60));

function fixture({ data = feed(), cached, error, blockedStorage = false, imageMode = () => 'load', width = 1280, hang = false } = {}) {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.classList = { toggle() {} }; }
    get scrollHeight() { return this.children.length * 100; }
    set innerHTML(value) { assert.equal(value, '', 'Remote HTML must never be injected'); this.replaceChildren(); }
    appendChild(child) { if (child.parent) child.parent.children = child.parent.children.filter(c => c !== child); this.children.push(child); child.parent = this; }
    replaceChildren(...children) { for (const c of this.children) c.parent = null; this.children = []; children.forEach(c => this.appendChild(c)); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    set src(value) { this._src = value; const event = imageMode(value); if (event) queueMicrotask(() => this.listeners[event]?.()); }
    get src() { return this._src; }
  }
  const elements = Object.fromEntries(['greeting', 'date-time', 'pin-grid', 'pinterest-status'].map(id => [id, new Element('div')]));
  const buttons = ['everforest', 'khold', 'catppuccin', 'zen'].map(theme => { const b = new Element('button'); b.dataset.theme = theme; return b; });
  const storage = new Map(cached ? [[key, JSON.stringify(cached)]] : []);
  let requests = 0;
  const window = { innerWidth: width, addEventListener(name, fn) { this[name] = fn; } };
  const context = vm.createContext({ document: { body: new Element('body'), getElementById: id => elements[id], querySelectorAll: () => buttons, createElement: tag => new Element(tag) }, window,
    localStorage: { getItem(k) { if (blockedStorage) throw Error('disabled'); return storage.get(k) ?? null; }, setItem(k, v) { if (blockedStorage) throw Error('disabled'); storage.set(k, v); } },
    URL, AbortController, Date, console: { warn() {}, error() {} },
    setTimeout: (fn, ms) => setTimeout(fn, ms >= 1000 ? 20 : 1), clearTimeout, setInterval() {},
    fetch: async (url, options) => { requests++; assert.equal(url, './feed/pinterest.json');
      if (hang) return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted'))));
      if (error) throw Error('offline');
      return { ok: data !== 'HTTP500', status: data === 'HTTP500' ? 500 : 200, json: async () => { if (data === 'malformed') throw SyntaxError('JSON'); return data; } };
    }
  });
  vm.runInContext(code, context);
  return { context, elements, storage, window, buttons, requests: () => requests, cards: () => elements['pin-grid'].children.flatMap(c => c.children).filter(c => c.className === 'pin') };
}

test('successful local feed uses actual card count and safe text; theme selector survives', async () => {
  const f = fixture(); await pause();
  assert.equal(f.cards().length, 1);
  assert.equal(f.elements['pinterest-status'].textContent, '1 recent');
  assert.equal(f.cards()[0].children[1].textContent, '<img onerror=bad> & art');
  assert.equal(f.cards()[0].rel, 'noopener noreferrer');
  assert.equal(JSON.parse(f.storage.get(key)).pins.length, 1);
  f.buttons[3].listeners.click();
  assert.equal(vm.runInContext('document.body.dataset.theme', f.context), 'zen');
});

for (const [name, options] of Object.entries({ offline: { error: true }, http500: { data: 'HTTP500' }, malformed: { data: 'malformed' }, empty: { data: feed([]) }, invalid: { data: { pins: [] } }, timeout: { hang: true } })) {
  test(`${name} preserves cached Pins and last-good data`, async () => {
    const cached = feed([pin(2)], '2020-01-01T00:00:00Z');
    const f = fixture({ ...options, cached }); await pause();
    assert.equal(f.cards().length, 1);
    assert.equal(f.cards()[0].href, pin(2).link);
    assert.equal(f.elements['pinterest-status'].textContent, 'Cached pins');
    assert.equal(f.storage.get(key), JSON.stringify(cached));
  });
}

test('fresh visitor without cache gets existing error treatment', async () => {
  const f = fixture({ error: true }); await pause();
  assert.equal(f.elements['pin-grid'].children[0].className, 'pinterest-error');
});

test('bad images fall back to thumbnail, otherwise skip; stalled images finish', async () => {
  const f = fixture({ data: feed([pin(1), pin(2), pin(3)]), imageMode: url => url.includes('/3.jpg') ? null : url.includes('/1.jpg') && url.includes('/236x/') ? 'load' : 'error' });
  await pause(); assert.equal(f.cards().length, 1); assert.equal(f.cards()[0].children[0].src, pin(1).thumbnail);
  assert.equal(JSON.parse(f.storage.get(key)).pins.length, 1);
});

test('all new images failing does not clear displayed cached cards', async () => {
  const f = fixture({ cached: feed([pin(2)]), imageMode: url => url.includes('/2.jpg') ? 'load' : 'error' });
  await pause(); assert.equal(f.cards()[0].href, pin(2).link); assert.equal(f.elements['pinterest-status'].textContent, 'Cached pins');
});

test('stale generated JSON remains visible with quiet cached status', async () => {
  const f = fixture({ data: feed([pin()], '2020-01-01T00:00:00Z') }); await pause();
  assert.equal(f.cards().length, 1); assert.equal(f.elements['pinterest-status'].textContent, 'Cached pins');
});

test('resize reuses cards at 4/3/2 columns without another request', async () => {
  const f = fixture({ data: feed([pin(1), pin(2), pin(3)]) }); await pause();
  const cards = f.cards(); assert.equal(f.elements['pin-grid'].children.length, 4);
  for (const [width, columns] of [[900, 3], [390, 2], [1280, 4]]) {
    f.window.innerWidth = width; f.window.resize(); await pause();
    assert.equal(f.elements['pin-grid'].children.length, columns);
    assert.equal(f.cards().length, 3); assert.ok(f.cards().every(c => cards.includes(c))); assert.equal(f.requests(), 1);
  }
});

test('untrusted and duplicate URLs filtered; no storage permission required', async () => {
  const f = fixture({ blockedStorage: true, data: feed([{ ...pin(2), link: 'javascript:alert(1)' }, { ...pin(3), image: 'https://i.pinimg.com.evil/a' }, pin(), pin()]) });
  await pause(); assert.equal(f.cards().length, 1);
});
