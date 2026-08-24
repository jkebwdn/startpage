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


const PINTEREST_WORKER_URL =
  "https://startpage-pinterest.jkebwdn.workers.dev/pins";


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

  /*
    Compatibility with the old generic blue
    theme name.
  */

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

  return new Promise(
    (resolve) => {

      const link =
        document.createElement("a");


      link.className =
        "pin";

      link.href =
        pin.link;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";


      const image =
        document.createElement("img");


      image.alt =
        pin.title ||
        "Pinterest pin";

      image.decoding =
        "async";


      /*
        We intentionally don't use lazy loading here.

        The feed only has ~25 items, and loading them
        immediately lets us calculate masonry height
        correctly before placing each item.
      */

      image.loading =
        "eager";


      let fallbackUsed =
        false;


      image.addEventListener(
        "error",
        () => {

          if (
            !fallbackUsed &&
            pin.thumbnail
          ) {

            fallbackUsed =
              true;


            image.src =
              pin.thumbnail;


            return;

          }


          resolve(null);

        }
      );


      image.addEventListener(
        "load",
        () => {

          resolve(link);

        },
        {
          once: true
        }
      );


      link.appendChild(
        image
      );


      if (pin.title) {

        const overlay =
          document.createElement("div");


        overlay.className =
          "pin-overlay";

        overlay.textContent =
          pin.title;


        link.appendChild(
          overlay
        );

      }


      image.src =
        pin.image;

    }
  );

}


/* =========================================================
   RENDER MASONRY
========================================================= */

async function renderPins(pins) {

  const columns =
    createMasonryColumns();


  for (const pin of pins) {

    const element =
      await createPinElement(
        pin
      );


    if (!element) {
      continue;
    }


    const shortestColumn =
      getShortestColumn(
        columns
      );


    shortestColumn.appendChild(
      element
    );

  }

}


/* =========================================================
   PINTEREST
========================================================= */

async function loadPinterest() {

  try {

    pinterestStatus.textContent =
      "Loading…";


    const response =
      await fetch(
        PINTEREST_WORKER_URL,
        {
          headers: {
            Accept:
              "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        `Pinterest feed request failed: ${response.status}`
      );

    }


    const data =
      await response.json();


    if (
      !Array.isArray(
        data.pins
      )
    ) {

      throw new Error(
        "Pinterest feed returned invalid data."
      );

    }


    await renderPins(
      data.pins
    );


    pinterestStatus.textContent =
      `${data.count} recent`;

    pinterestStatus.className =
      "pinterest-status success";


  } catch (error) {

    console.error(
      "Pinterest load failed:",
      error
    );


    pinterestStatus.textContent =
      "Feed unavailable";

    pinterestStatus.className =
      "pinterest-status error";


    pinGrid.innerHTML =
      `
        <div class="pinterest-error">
          <strong>
            Pinterest unavailable
          </strong>

          <p>
            The recent-pin feed could not be loaded.
          </p>
        </div>
      `;

  }

}


/* =========================================================
   RESPONSIVE MASONRY REBUILD
========================================================= */

let resizeTimer;


window.addEventListener(
  "resize",
  () => {

    clearTimeout(
      resizeTimer
    );


    resizeTimer =
      setTimeout(
        () => {

          loadPinterest();

        },
        250
      );

  }
);


/* =========================================================
   START
========================================================= */

updateClock();


setInterval(
  updateClock,
  1000
);


loadPinterest();
