const btn = document.getElementById("getForecast");
const grid = document.getElementById("forecastGrid");
const usedAddress = document.getElementById("usedAddress");
const addressInput = document.getElementById("address");
const suggestionsEl = document.getElementById("suggestions");

// ---- Suggestions d'adresses (Nominatim) ----
let typingTimer;
addressInput.addEventListener("input", () => {
  clearTimeout(typingTimer);
  const query = addressInput.value.trim();
  if (query.length < 3 || query === "moi") {
    suggestionsEl.innerHTML = "";
    return;
  }
  typingTimer = setTimeout(async () => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
    const data = await res.json();
    suggestionsEl.innerHTML = "";
    data.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.display_name;
      li.addEventListener("click", () => {
        addressInput.value = item.display_name;
        suggestionsEl.innerHTML = "";
      });
      suggestionsEl.appendChild(li);
    });
  }, 400);
});

// ---- Fonction principale ----
btn.addEventListener("click", async () => {
  let address = addressInput.value.trim();
  let lat, lon, displayAddr;

  if (address.toLowerCase() === "moi") {
    // Localisation utilisateur
    try {
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej);
      });
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      displayAddr = data.display_name;
    } catch (e) {
      alert("Impossible d'obtenir votre localisation.");
      return;
    }
  } else {
    // Géocodage d'adresse
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await res.json();
      if (!data.length) {
        alert("Adresse introuvable.");
        return;
      }
      lat = data[0].lat;
      lon = data[0].lon;
      displayAddr = data[0].display_name;
    } catch (e) {
      alert("Erreur lors de la recherche d'adresse.");
      return;
    }
  }

  const tilt = document.getElementById("tilt").value || 40;
  const azimuth = document.getElementById("azimuth").value || 135;
  const capacity = document.getElementById("capacity").value || 3.3;

  // API Open-Meteo
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=global_horizontal_irradiance&timezone=auto`;
  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch (e) {
    alert("Erreur de connexion à l'API.");
    return;
  }

  if (!data.hourly) {
    alert("Pas de données météo disponibles.");
    return;
  }

  usedAddress.textContent = `📍 Prévisions pour : ${displayAddr}`;
  renderForecast(data.hourly, capacity);
});

// ---- Affichage prévisions ----
function renderForecast(hourly, capacity) {
  grid.innerHTML = "";
  const times = hourly.time;
  const irradiance = hourly.global_horizontal_irradiance;

  // Regrouper par jour
  const days = {};
  times.forEach((t, i) => {
    const d = new Date(t);
    const dayKey = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    if (!days[dayKey]) days[dayKey] = [];
    days[dayKey].push({ hour: d.getHours(), val: irradiance[i] });
  });

  // Calculer totaux journaliers pour marquer les meilleurs jours
  const dailyTotals = [];

  Object.entries(days).forEach(([dayLabel, arr]) => {
    const col = document.createElement("div");
    col.className = "day-col";

    const title = document.createElement("div");
    title.className = "day-title";
    title.textContent = dayLabel;
    col.appendChild(title);

    let dailyTotal = 0;
    arr.forEach(obj => {
      if (obj.val <= 0) return; // Ignorer nuit
      const prodWh = obj.val * capacity;
      dailyTotal += prodWh;
      const hourCell = document.createElement("div");
      hourCell.className = "hour-cell";
      hourCell.style.background = `linear-gradient(to right, #fff ${100 - Math.min(prodWh/30,100)}%, #f87171)`;
      hourCell.innerHTML = `<span>${obj.hour}h</span><span>${Math.round(prodWh)} Wh</span>`;
      col.appendChild(hourCell);
    });

    const totalEl = document.createElement("div");
    totalEl.className = "day-total";
    totalEl.textContent = `⚡ Total: ${(dailyTotal/1000).toFixed(1)} kWh`;
    col.appendChild(totalEl);

    grid.appendChild(col);

    dailyTotals.push({ col, total: dailyTotal });
  });

  // Ajouter ⭐ aux 2 meilleurs jours
  dailyTotals.sort((a,b) => b.total - a.total);
  dailyTotals.slice(0,2).forEach(d => {
    const star = document.createElement("span");
    star.textContent = " ⭐";
    d.col.querySelector(".day-title").appendChild(star);
  });
}
