const citySearch = document.getElementById("citySearch");
const cityList = document.getElementById("cityList");
const selectedCityDiv = document.getElementById("selectedCity");
const prayersDiv = document.getElementById("prayers");
const progressBar = document.getElementById("progressBar");
const stats = document.getElementById("stats");
const gregDateDiv = document.getElementById("gregDate");

let prayerTimes = {};
let selectedCity = localStorage.getItem("selectedCity") || "";
const today = new Date();
const todayKey = "salat-" + today.toISOString().split("T")[0];

// ----------------------------
// Reset automatique localStorage
// ----------------------------
const lastReset = localStorage.getItem("lastResetDate");
const todayDateStr = today.toISOString().split("T")[0];
if (lastReset !== todayDateStr) {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("salat-")) localStorage.removeItem(key);
  });
  localStorage.setItem("lastResetDate", todayDateStr);
}

// Affichage date grégorienne
gregDateDiv.textContent =
  "Date : " +
  today.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ----------------------------
// Icônes prières
// ----------------------------
const prayerIcons = {
  Fajr: "🌅", // Lever de soleil pour Fajr
  Dhuhr: "☀️",
  Asr: "☁️",
  Maghrib: "🌇",
  Isha: "🌙",
};

// ----------------------------
// Notification avec son et rappel X minutes avant
// ----------------------------
const notificationSound = new Audio(
  "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
);
const reminderMinutes = 5; // Rappel 5 minutes avant la prière

function showNotification(prayer) {
  if (Notification.permission === "granted") {
    new Notification("🕌 Rappel Salat", {
      body: `Il est l'heure de ${prayer}`,
    });
    notificationSound.play();
  }
}

// ----------------------------
// Charger prières
// ----------------------------
function loadPrayers() {
  prayersDiv.innerHTML = "";
  const savedData = JSON.parse(localStorage.getItem(todayKey)) || {};

  Object.keys(prayerTimes).forEach((prayer) => {
    const checked = savedData[prayer] || false;
    const div = document.createElement("div");
    div.className = "prayer";
    div.id = `prayer-${prayer}`;
    div.innerHTML = `
      <div style="display:flex; align-items:center;">
        <span class="prayer-icon">${prayerIcons[prayer]}</span>
        <div>
          <strong>${prayer}</strong>
          <div class="time">${prayerTimes[prayer]}</div>
        </div>
      </div>
      <input type="checkbox" ${checked ? "checked" : ""} onchange="togglePrayer('${prayer}', this.checked)">
    `;
    prayersDiv.appendChild(div);
  });
  updateProgress();
  highlightNextPrayer();
}

function togglePrayer(prayer, value) {
  const savedData = JSON.parse(localStorage.getItem(todayKey)) || {};
  savedData[prayer] = value;
  localStorage.setItem(todayKey, JSON.stringify(savedData));
  updateProgress();
}

function updateProgress() {
  const savedData = JSON.parse(localStorage.getItem(todayKey)) || {};
  const completed = Object.keys(prayerTimes).filter((p) => savedData[p]).length;
  progressBar.style.width = (completed / 5) * 100 + "%";
  stats.innerText = `${completed}/5 prières accomplies`;
}

// ----------------------------
// Vérification notifications avec rappel X minutes avant
// ----------------------------
function checkReminders() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const savedData = JSON.parse(localStorage.getItem(todayKey)) || {};

  Object.keys(prayerTimes).forEach((prayer) => {
    const [h, m] = prayerTimes[prayer].split(":").map(Number);
    const prayerMinutes = h * 60 + m;
    // Notification normale
    if (currentMinutes === prayerMinutes && !savedData[prayer]) {
      showNotification(prayer);
    }
    // Notification X minutes avant
    if (
      currentMinutes === prayerMinutes - reminderMinutes &&
      !savedData[prayer]
    ) {
      showNotification(`${prayer} dans ${reminderMinutes} minutes`);
    }
  });

  highlightNextPrayer();
}

setInterval(checkReminders, 60000);

// ----------------------------
// Prochaine prière surlignée
// ----------------------------
function highlightNextPrayer() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let nextPrayer = null;
  let minDiff = Infinity;

  Object.keys(prayerTimes).forEach((prayer) => {
    const [h, m] = prayerTimes[prayer].split(":").map(Number);
    const prayerMinutes = h * 60 + m;
    const diff = prayerMinutes - currentMinutes;
    if (diff >= 0 && diff < minDiff) {
      minDiff = diff;
      nextPrayer = prayer;
    }
  });

  Object.keys(prayerTimes).forEach((prayer) => {
    document.getElementById(`prayer-${prayer}`).classList.remove("next");
  });

  if (nextPrayer) {
    document.getElementById(`prayer-${nextPrayer}`).classList.add("next");
  }
}

// ----------------------------
// Recherche villes
// ----------------------------
citySearch.addEventListener("input", function () {
  const query = this.value;
  if (query.length < 2) {
    cityList.innerHTML = "";
    return;
  }

  fetch(`https://geo.api.gouv.fr/communes?nom=${query}&fields=nom&limit=20`)
    .then((res) => res.json())
    .then((data) => {
      cityList.innerHTML = "";
      data.forEach((city) => {
        const li = document.createElement("li");
        li.textContent = city.nom;
        li.onclick = () => selectCity(city.nom);
        cityList.appendChild(li);
      });
    });
});

function selectCity(city) {
  selectedCity = city;
  localStorage.setItem("selectedCity", city);
  selectedCityDiv.innerHTML = `<strong>Ville :</strong> ${city}`;
  cityList.innerHTML = "";
  citySearch.value = "";
  fetchPrayerTimes(city);
}

// ----------------------------
// Charger horaires via AlAdhan
// ----------------------------
function fetchPrayerTimes(city) {
  fetch(
    `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=France&method=2`,
  )
    .then((res) => res.json())
    .then((data) => {
      const t = data.data.timings;
      prayerTimes = {
        Fajr: t.Fajr.substring(0, 5),
        Dhuhr: t.Dhuhr.substring(0, 5),
        Asr: t.Asr.substring(0, 5),
        Maghrib: t.Maghrib.substring(0, 5),
        Isha: t.Isha.substring(0, 5),
      };
      loadPrayers();
    });
}

// ----------------------------
// Géolocalisation automatique
// ----------------------------
if (!selectedCity && navigator.geolocation) {
  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.city) {
          selectCity(data.city);
        }
      });
  });
} else if (selectedCity) {
  selectCity(selectedCity);
}
