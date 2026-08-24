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


/* =========================================================
   SETTINGS
========================================================= */

const PINTEREST_USERNAME =
  "jkebwdn";

const PINTEREST_BASE_URL =
  "https://www.pinterest.com";

const MAX_PINS =
  40;


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


  localStorage.setItem(
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
  localStorage.getItem(
    "startpage-theme"
  );


if (savedTheme) {

  setTheme(savedTheme);

} else {

  setTheme("everforest");

}


/* =========================================================
   PINTEREST HELPERS
========================================================= */

function createPinterestResourceURL(
  resourceName,
  sourceUrl,
  options
) {

  const url =
    new URL(
      `${PINTEREST_BASE_URL}/resource/${resourceName}/get/`
    );


  url.searchParams.set(
    "source_url",
    sourceUrl
  );


  url.searchParams.set(
    "data",
    JSON.stringify({
      options,
      context: {}
    })
  );


  url.searchParams.set(
    "_",
    Date.now().toString()
  );


  return url.toString();

}


/* =========================================================
   FETCH PINTEREST PROFILE
========================================================= */

async function fetchPinterestProfile() {

  const sourceUrl =
    `/${PINTEREST_USERNAME}/_created`;


  const requestUrl =
    createPinterestResourceURL(
      "UserResource",
      sourceUrl,
      {
        username:
          PINTEREST_USERNAME,

        field_set_key:
          "unauth_profile"
      }
    );


  const response =
    await fetch(
      requestUrl,
      {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept:
            "application/json"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      `Pinterest profile request failed: ${response.status}`
    );

  }


  const json =
    await response.json();


  const profile =
    json?.resource_response?.data;


  if (!profile?.id) {

    throw new Error(
      "Pinterest returned no public profile ID."
    );

  }


  return profile;

}


/* =========================================================
   FETCH RECENT PINS
========================================================= */

async function fetchPinterestPins(
  profile
) {

  const sourceUrl =
    `/${PINTEREST_USERNAME}/_created`;


  const requestUrl =
    createPinterestResourceURL(
      "UserActivityPinsResource",
      sourceUrl,
      {
        exclude_add_pin_rep:
          true,

        field_set_key:
          "grid_item",

        is_own_profile_pins:
          false,

        user_id:
          profile.id,

        username:
          PINTEREST_USERNAME
      }
    );


  const response =
    await fetch(
      requestUrl,
      {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept:
            "application/json"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      `Pinterest pins request failed: ${response.status}`
    );

  }


  const json =
    await response.json();


  const pins =
    json?.resource_response?.data;


  if (!Array.isArray(pins)) {

    throw new Error(
      "Pinterest returned an unexpected pin response."
    );

  }


  return pins.slice(
    0,
    MAX_PINS
  );

}


/* =========================================================
   PIN DATA HELPERS
========================================================= */

function getPinImage(pin) {

  return (
    pin?.images?.orig?.url ||
    pin?.images?.["736x"]?.url ||
    pin?.images?.["564x"]?.url ||
    pin?.images?.["474x"]?.url ||
    pin?.images?.["236x"]?.url ||
    null
  );

}


function getPinURL(pin) {

  if (pin?.seo_url) {

    return `${PINTEREST_BASE_URL}${pin.seo_url}`;

  }


  if (pin?.id) {

    return `${PINTEREST_BASE_URL}/pin/${pin.id}/`;

  }


  return `${PINTEREST_BASE_URL}/${PINTEREST_USERNAME}/`;

}


function getPinTitle(pin) {

  return (
    pin?.title ||
    pin?.seo_title ||
    pin?.grid_title ||
    pin?.grid_description ||
    ""
  );

}


/* =========================================================
   RENDER PINS
========================================================= */

function renderPinterestPins(pins) {

  pinGrid.innerHTML =
    "";


  const usablePins =
    pins.filter(
      (pin) =>
        Boolean(
          getPinImage(pin)
        )
    );


  if (!usablePins.length) {

    throw new Error(
      "Pinterest returned no usable public pin images."
    );

  }


  usablePins.forEach(
    (pin) => {

      const imageUrl =
        getPinImage(pin);

      const pinUrl =
        getPinURL(pin);

      const title =
        getPinTitle(pin);


      const link =
        document.createElement("a");


      link.className =
        "pin";

      link.href =
        pinUrl;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";


      const image =
        document.createElement("img");


      image.src =
        imageUrl;

      image.alt =
        title || "Pinterest pin";

      image.loading =
        "lazy";

      image.decoding =
        "async";


      link.appendChild(
        image
      );


      if (title) {

        const overlay =
          document.createElement("div");


        overlay.className =
          "pin-overlay";

        overlay.textContent =
          title;


        link.appendChild(
          overlay
        );

      }


      pinGrid.appendChild(
        link
      );

    }
  );


  pinterestStatus.textContent =
    `${usablePins.length} recent pins`;

  pinterestStatus.className =
    "pinterest-status success";

}


/* =========================================================
   PINTEREST ERROR
========================================================= */

function showPinterestError(error) {

  console.error(
    "Pinterest loader failed:",
    error
  );


  pinterestStatus.textContent =
    "Direct access blocked";

  pinterestStatus.className =
    "pinterest-status error";


  pinGrid.innerHTML =
    `
      <div class="pinterest-error">
        <strong>Unable to load Pinterest directly</strong>

        <p>
          The page attempted to read your public Pinterest
          activity feed, but the browser was not allowed to
          access the response.
        </p>

        <p>
          If the developer console reports a CORS error,
          we'll move this exact loader behind a tiny proxy
          and keep the custom themed masonry layout.
        </p>
      </div>
    `;

}


/* =========================================================
   LOAD PINTEREST
========================================================= */

async function loadPinterest() {

  try {

    pinterestStatus.textContent =
      "Loading profile…";


    const profile =
      await fetchPinterestProfile();


    pinterestStatus.textContent =
      "Loading recent pins…";


    const pins =
      await fetchPinterestPins(
        profile
      );


    renderPinterestPins(
      pins
    );

  } catch (error) {

    showPinterestError(
      error
    );

  }

}


/* =========================================================
   START
========================================================= */

updateClock();


setInterval(
  updateClock,
  1000
);


loadPinterest();
