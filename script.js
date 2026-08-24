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
  setTheme(savedTheme);
} else {
  setTheme("everforest");
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


    if (!Array.isArray(data.pins)) {
      throw new Error(
        "Pinterest feed returned invalid data."
      );
    }


    renderPins(
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
          <strong>Pinterest unavailable</strong>

          <p>
            The recent-pin feed could not be loaded.
          </p>
        </div>
      `;
  }
}


function renderPins(pins) {
  pinGrid.innerHTML =
    "";


  pins.forEach(
    (pin) => {

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


      image.src =
        pin.image;

      image.alt =
        pin.title || "Pinterest pin";

      image.loading =
        "lazy";

      image.decoding =
        "async";


      image.onerror =
        () => {
          if (
            pin.thumbnail &&
            image.src !== pin.thumbnail
          ) {
            image.src =
              pin.thumbnail;
          }
        };


      link.appendChild(
        image
      );


      if (pin.title) {
        const overlay =
          document.createElement(
            "div"
          );


        overlay.className =
          "pin-overlay";

        overlay.textContent =
          pin.title;


        link.appendChild(
          overlay
        );
      }


      pinGrid.appendChild(
        link
      );
    }
  );
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
