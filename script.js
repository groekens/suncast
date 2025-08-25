// script.js

const form = document.getElementById("location-form");
const agenda = document.getElementById("agenda");
const messageBox = document.getElementById("message");

// Charger les préférences utilisateur
window.onload = () => {
  const savedPrefs = JSON.parse(localStorage.getItem("solarPrefs"));
  if (savedPrefs) {
    document.getElementById("address").value = savedPrefs.address || "";
    document.getElementById("orientation").value = savedPrefs.orientation || "180";
    document.getElementById("capacity").value = savedPrefs.capacity || "3.3";
  }
};

// Sauvegarde des préférences
function savePreferences(address, orientation, capacity) {
  localStorage.setItem(
    "solarPrefs",
    JSON.stringify({ address, orientation, capacity })
  );
}

// Conversion irradiance (W/m²) → production estimée (Wh)
function irradianceToWh(irradiance, capacity) {
  // Hypothèse simple : 1000 W/m² = 100% de la puissance nominale
  // Production Wh = irradiance/1000 * capacité(kW) * 1000 (pour W)
  return Math.round((irradiance / 1000) * capacity * 1000);
}

// Affichage
function renderAgenda(times, values, capacity) {
  agenda.innerHTML = "";

  // Regrouper par jour
  const days = {};
  times.forEach((time, i) => {
    const date = new Date(time);
    const day = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const hour = date.getHours();
    if (hour >= 6 && hour <= 21) {
      if (!days[day]) days[day] = [];
      days[day].push({ hour, value: irradianceToWh(values[i], capacity) });
    }
  });

  // Trouver la valeur max pour le dégradé
  const maxVal = Math.max(...values.map(v => irradianceToWh(v, capacity)));

  // Créer les colonnes par jour
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.gap = "10px";

  Object.entries(days).forEach(([day, hours]) => {
    const col = document.createElement("div");
    col.style.flex = "1";
    col.style.border = "1px solid #ddd";
    col.style.borderRadius = "8px";
    col.style.overflow = "hidden";

    const title = document.createElement("div");
    title.textContent = day;
    title.style.textAlign = "center";
    title.style.fontWeight = "bold";
    title.style.padding = "5px";
    title.style.background = "#f0f0f0";
    col.appendChild(title);

    hours.forEach(({ hour, value }) => {
      const cell = document.createElement("div");
      cell.textContent = `${hour}h : ${value} Wh`;

      const intensity = value / maxVal;
      cell.style.background = `rgba(255, ${255 - 200 * intensity}, ${255 - 200 * intensity}, 1)`;
      cell.style.padding = "4px";
      cell.style.fontSize = "0.9em";

      col.appendChild(cell);
    });

    container.appendChild(col);
  });

  agenda.appendChild(container);
}

// Récupération des coordonnées avec Nominatim
async function getCoordinates(address) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  );
  const results = await response.json();
  if (results.length === 0) throw new Error("Adresse introuvable");
  return {
    lat: results[0].lat,
    lon: results[0].lon,
    display: results[0].display_name,
  };
}

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  messageBox.textContent = "";

  const address = document.getElementById("address").value.trim();
  const orientation = document.getElementById("orientation").value.trim();
  const capacity = parseFloat(document.getElementById("capacity").value.trim());

  try {
    let coords;

    if (address.toLowerCase() === "moi") {
      // Localisation via navigateur
      coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, display: "Ma position" }),
          err => reject(err)
        );
      });
    } else {
      coords = await getCoordinates(address);
    }

    // Sauvegarde des prefs
    savePreferences(address, orientation, capacity);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=shortwave_radiation&timezone=auto`;
    const res = await fetch(url);

    if (!res.ok) throw new Error("Erreur API");
    const data = await res.json();

    const times = data.hourly.time;
    const values = data.hourly.shortwave_radiation;

    renderAgenda(times, values, capacity);

  } catch (err) {
    console.error(err);
    messageBox.textContent = "Erreur de connexion à l'API.";
  }
});
