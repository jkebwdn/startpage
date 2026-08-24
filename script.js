const greetingElement =
  document.getElementById("greeting");

const dateTimeElement =
  document.getElementById("date-time");

const themeButtons =
  document.querySelectorAll(".theme-button");


function updateClock() {

  const now = new Date();

  const hour = now.getHours();


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


updateClock();


setInterval(
  updateClock,
  1000
);
