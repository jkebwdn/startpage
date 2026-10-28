const greetingElement =
  document.getElementById("greeting");

const dateTimeElement =
  document.getElementById("date-time");

const themeButtons =
  document.querySelectorAll(".theme-button");

const pinGrid =
  document.getElementById("pin-grid");

const pinterestStatus =
  document.getElementById("pinterest-status");


const PINTEREST_FEED_URL = "./feed/pinterest.json";
const PINTEREST_CACHE_KEY = "startpage-pinterest-v1";

// Storage can be unavailable in private/restricted browser contexts.
function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Optional cache only. */ }
}


/* =========================================================
   CLOCK + GREETING
========================================================= */

function updateClock() {

  const now =
    new Date();

  const hour =
    now.getHours();


  let greeting =
    "Good evening, jkebwdn.";


  if (hour < 12) {

    greeting =
      "Good morning, jkebwdn.";

  } else if (hour < 18) {

    greeting =
      "Good afternoon, jkebwdn.";

  }


  greetingElement.textContent =
    greeting;


  const time =
    now.toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    );


  const weekday =
    now
      .toLocaleDateString(
        "en-GB",
        {
          weekday: "short"
        }
      )
      .toUpperCase();


  const date =
    now.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
      }
    );


  dateTimeElement.textContent =
    `${time} • ${weekday} ${date}`;

}


/* =========================================================
   THEMES
========================================================= */

function setTheme(themeName) {

  document.body.dataset.theme =
    themeName;


  writeStorage(
    "startpage-theme",
    themeName
  );


  themeButtons.forEach(
    (button) => {

      const isSelected =
        button.dataset.theme ===
        themeName;


      button.classList.toggle(
        "selected",
        isSelected
      );

    }
  );

}


themeButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        setTheme(
          button.dataset.theme
        );

      }
    );

  }
);


const savedTheme =
  readStorage(
    "startpage-theme"
  );


if (savedTheme) {

  if (savedTheme === "blue") {

    setTheme("zen");

  } else {

    setTheme(savedTheme);

  }

} else {

  setTheme("everforest");

}


/* =========================================================
   MASONRY HELPERS
========================================================= */

function getColumnCount() {

  const width =
    window.innerWidth;


  if (width <= 700) {
    return 2;
  }


  if (width <= 1100) {
    return 3;
  }


  return 4;

}


function createMasonryColumns() {

  pinGrid.innerHTML =
    "";


  const count =
    getColumnCount();


  const columns =
    [];


  for (
    let index = 0;
    index < count;
    index += 1
  ) {

    const column =
      document.createElement("div");


    column.className =
      "masonry-column";


    pinGrid.appendChild(
      column
    );


    columns.push(
      column
    );

  }


  return columns;

}


function getShortestColumn(columns) {

  return columns.reduce(
    (shortest, column) => {

      if (
        column.scrollHeight <
        shortest.scrollHeight
      ) {

        return column;

      }


      return shortest;

    },
    columns[0]
  );

}


/* =========================================================
   CREATE PIN
========================================================= */

function createPinElement(pin) {
  return new Promise((resolve) => {
    const link = document.createElement("a");
    link.className = "pin";
    link.href = pin.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const image = document.createElement("img");
    image.alt = pin.title || "Pinterest pin";
    image.decoding = "async";
    image.loading = "eager";
    let fallbackUsed = false;
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };
    // A stalled image must not stall the whole feed indefinitely.
    const timer = setTimeout(() => finish(null), 10000);
    image.addEventListener("error", () => {
      if (finished) return;
      if (!fallbackUsed && pin.thumbnail && pin.thumbnail !== image.src) {
        fallbackUsed = true;
        image.src = pin.thumbnail;
      } else {
        finish(null);
      }
    });
    image.addEventListener("load", () => finish(link), { once: true });
    link.appendChild(image);
    if (pin.title) {
      const overlay = document.createElement("div");
      overlay.className = "pin-overlay";
      overlay.textContent = pin.title;
      link.appendChild(overlay);
    }
    image.src = pin.image;
  });
}

/* =========================================================
   VALIDATED FEED / LAST-KNOWN-GOOD CACHE
========================================================= */

function safePinUrl(value, image = false) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    const hostAllowed = image ? url.hostname === "i.pinimg.com" :
      (url.hostname === "pinterest.com" || url.hostname.endsWith(".pinterest.com"));
    if (url.protocol !== "https:" || !hostAllowed || url.username || url.password || url.port ||
        (!image && !/^\/pin\/\d+\/?$/.test(url.pathname))) return "";
    return url.href;
  } catch { return ""; }
}

function validateFeed(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.pins)) throw new Error("Invalid feed");
  const updated = Date.parse(data.updatedAt);
  if (!Number.isFinite(updated) || updated > Date.now() + 300000) throw new Error("Invalid feed date");
  const seen = new Set();
  const pins = [];
  for (const pin of data.pins) {
    if (!pin || typeof pin !== "object") continue;
    const link = safePinUrl(pin.link);
    const image = safePinUrl(pin.image, true);
    if (!link || !image || seen.has(link)) continue;
    seen.add(link);
    pins.push({ link, image, thumbnail: safePinUrl(pin.thumbnail, true),
      title: typeof pin.title === "string" ? pin.title.slice(0, 300) : "" });
    if (pins.length === 40) break;
  }
  if (!pins.length) throw new Error("No usable Pins");
  return { version: 1, updatedAt: new Date(updated).toISOString(), pins };
}

let displayedCards = [];
function layoutPins() {
  const columns = createMasonryColumns();
  for (const card of displayedCards) getShortestColumn(columns).appendChild(card);
}

async function renderPins(pins) {
  const results = await Promise.all(pins.map(async (pin) => ({ pin, card: await createPinElement(pin) })));
  const usable = results.filter((result) => result.card);
  // Do not clear existing cards when replacement images all fail.
  if (!usable.length) throw new Error("Pin images unavailable");
  displayedCards = usable.map((result) => result.card);
  layoutPins();
  return usable.map((result) => result.pin);
}

function setPinterestStatus(text, success = false) {
  pinterestStatus.textContent = text;
  pinterestStatus.className = `pinterest-status${success ? " success" : ""}`;
}

function showFeedUnavailable() {
  if (displayedCards.length) {
    setPinterestStatus("Cached pins");
    pinterestStatus.title = "Feed temporarily unavailable. Showing previously loaded Pins.";
    return;
  }
  setPinterestStatus("Feed unavailable");
  const error = document.createElement("div");
  error.className = "pinterest-error";
  const title = document.createElement("strong");
  title.textContent = "Pinterest unavailable";
  const message = document.createElement("p");
  message.textContent = "The recent-pin feed could not be loaded.";
  error.appendChild(title);
  error.appendChild(message);
  pinGrid.replaceChildren(error);
}

async function loadPinterest() {
  let cached;
  try { cached = validateFeed(JSON.parse(readStorage(PINTEREST_CACHE_KEY))); } catch { /* No valid cache. */ }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  // Attach rejection handling immediately while cached images load.
  const fresh = fetch(PINTEREST_FEED_URL, {
    headers: { Accept: "application/json" }, cache: "no-cache", signal: controller.signal
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Feed HTTP ${response.status}`);
    return validateFeed(await response.json());
  }).then((data) => ({ data }), (error) => ({ error })).finally(() => clearTimeout(timeout));
  if (cached) {
    try {
      await renderPins(cached.pins);
      setPinterestStatus("Cached pins");
    } catch { /* Network refresh may still succeed. */ }
  }
  try {
    const result = await fresh;
    if (result.error) throw result.error;
    const data = result.data;
    const pins = await renderPins(data.pins);
    writeStorage(PINTEREST_CACHE_KEY, JSON.stringify({ ...data, pins }));
    const stale = Date.now() - Date.parse(data.updatedAt) > 24 * 60 * 60 * 1000;
    setPinterestStatus(stale ? "Cached pins" : `${pins.length} recent`, !stale);
    pinterestStatus.title = `${stale ? "Feed temporarily unavailable. " : ""}Last refreshed ${new Date(data.updatedAt).toLocaleString()}`;
  } catch (error) {
    console.warn("Pinterest refresh unavailable:", error.message);
    showFeedUnavailable();
  }
}

/* =========================================================
   RESPONSIVE MASONRY REBUILD — no upstream request on resize
========================================================= */

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (displayedCards.length) layoutPins();
  }, 250);
});


/* =========================================================
   START
========================================================= */

updateClock();


setInterval(
  updateClock,
  1000
);


loadPinterest();
