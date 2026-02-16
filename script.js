// script.js - Version améliorée

const form = document.getElementById("location-form");
const agenda = document.getElementById("agenda");
const messageBox = document.getElementById("message");
const addressInput = document.getElementById("address");
const suggestionsBox = document.getElementById("suggestions");
const appliancesSection = document.getElementById("appliances-section");
const appliancesList = document.getElementById("appliances-list");

// Base de données d'appareils typiques
const APPLIANCES = [
  { id: "washing", name: "Lave-linge", icon: "🧺", power: 2000, duration: 2 },
  { id: "dishwasher", name: "Lave-vaisselle", icon: "🍽️", power: 1800, duration: 2.5 },
  { id: "dryer", name: "Sèche-linge", icon: "👕", power: 2500, duration: 1.5 },
  { id: "ev", name: "Voiture électrique", icon: "🚗", power: 3500, duration: 4 },
  { id: "water_heater", name: "Chauffe-eau", icon: "🚿", power: 3000, duration: 2 },
  { id: "pool", name: "Pompe piscine", icon: "🏊", power: 1200, duration: 6 },
  { id: "vacuum", name: "Aspirateur robot", icon: "🤖", power: 50, duration: 1 },
  { id: "iron", name: "Fer à repasser", icon: "👔", power: 2400, duration: 1 }
];

let currentForecastData = null;
let selectedAppliances = new Set();

// Charger les préférences utilisateur
window.onload = () => {
  const savedPrefs = JSON.parse(localStorage.getItem("solarPrefs"));
  if (savedPrefs) {
    document.getElementById("address").value = savedPrefs.address || "";
    document.getElementById("orientation").value = savedPrefs.orientation || "180";
    document.getElementById("tilt").value = savedPrefs.tilt || "30";
    document.getElementById("capacity").value = savedPrefs.capacity || "3.3";
    
    if (savedPrefs.appliances) {
      selectedAppliances = new Set(savedPrefs.appliances);
    }
  }
};

// Sauvegarde des préférences
function savePreferences(address, orientation, tilt, capacity) {
  localStorage.setItem(
    "solarPrefs",
    JSON.stringify({ 
      address, 
      orientation, 
      tilt, 
      capacity,
      appliances: Array.from(selectedAppliances)
    })
  );
}

// ===== CALCUL DE PRODUCTION RÉALISTE =====
function calculateSolarProduction(irradiance, azimuth, tilt, capacity, latitude, hour) {
  // Constantes
  const PANEL_EFFICIENCY = 0.18; // Rendement panneau ~18%
  const SYSTEM_LOSSES = 0.85; // Pertes système (onduleur, câblage, température) = 15%
  const OPTIMAL_IRRADIANCE = 1000; // W/m² (STC)
  
  // Calcul de l'angle d'incidence du soleil (simplifié)
  // En réalité, il faudrait calculer la position exacte du soleil
  // Ici on fait une approximation basée sur l'heure et l'orientation
  
  let orientationFactor = 1.0;
  
  // Facteur d'orientation (Sud = optimal = 1.0)
  const azimuthDiff = Math.abs(azimuth - 180); // Différence avec le sud
  if (azimuthDiff <= 45) {
    orientationFactor = 1.0 - (azimuthDiff / 180) * 0.1; // Perte max 10% à 45°
  } else if (azimuthDiff <= 90) {
    orientationFactor = 0.9 - ((azimuthDiff - 45) / 90) * 0.3; // Perte jusqu'à 40%
  } else {
    orientationFactor = 0.6 - ((azimuthDiff - 90) / 90) * 0.4; // Perte jusqu'à 80%
  }
  
  // Facteur d'inclinaison (optimal entre 30-35° en France)
  let tiltFactor = 1.0;
  const optimalTilt = Math.abs(latitude); // Approximation: tilt optimal ≈ latitude
  const tiltDiff = Math.abs(tilt - optimalTilt);
  if (tiltDiff <= 10) {
    tiltFactor = 1.0 - (tiltDiff / 100);
  } else {
    tiltFactor = 0.9 - ((tiltDiff - 10) / 60) * 0.2;
  }
  
  // Facteur horaire (production max vers midi)
  let hourFactor = 1.0;
  if (hour < 8 || hour > 18) {
    hourFactor = 0.3; // Faible production tôt/tard
  } else if (hour < 10 || hour > 16) {
    hourFactor = 0.7; // Production moyenne
  }
  
  // Calcul final de la production
  // Production = Irradiance × Surface × Rendement × Facteurs × Pertes système
  // Surface implicite: capacité (kWc) / (efficiency × 1000 W/m²)
  const productionKw = (irradiance / OPTIMAL_IRRADIANCE) * capacity * 
                       orientationFactor * tiltFactor * hourFactor * SYSTEM_LOSSES;
  
  // Retour en Wh (pour 1 heure)
  return Math.max(0, Math.round(productionKw * 1000));
}

// ===== AUTOCOMPLÉTION ADRESSE =====
let autocompleteTimeout;
addressInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  
  clearTimeout(autocompleteTimeout);
  
  if (query.length < 3 || query.toLowerCase() === "moi") {
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
    return;
  }
  
  autocompleteTimeout = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const results = await response.json();
      
      if (results.length === 0) {
        suggestionsBox.innerHTML = "";
        suggestionsBox.style.display = "none";
        return;
      }
      
      suggestionsBox.innerHTML = "";
      results.forEach(result => {
        const li = document.createElement("li");
        li.textContent = result.display_name;
        li.addEventListener("click", () => {
          addressInput.value = result.display_name;
          suggestionsBox.innerHTML = "";
          suggestionsBox.style.display = "none";
        });
        suggestionsBox.appendChild(li);
      });
      suggestionsBox.style.display = "block";
      
    } catch (err) {
      console.error("Erreur autocomplétion:", err);
    }
  }, 300);
});

// Fermer suggestions si clic ailleurs
document.addEventListener("click", (e) => {
  if (!addressInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
    suggestionsBox.style.display = "none";
  }
});

// ===== AFFICHAGE AGENDA =====
function renderAgenda(times, values, capacity, azimuth, tilt, latitude) {
  agenda.innerHTML = "";

  // Calculer les productions réalistes
  const productions = times.map((time, i) => {
    const date = new Date(time);
    const hour = date.getHours();
    return {
      time: time,
      hour: hour,
      production: calculateSolarProduction(values[i], azimuth, tilt, capacity, latitude, hour)
    };
  });

  // Regrouper par jour
  const days = {};
  productions.forEach(({ time, hour, production }) => {
    if (hour < 6 || hour > 21) return; // Ignorer nuit
    
    const date = new Date(time);
    const dayKey = date.toLocaleDateString("fr-FR");
    const dayLabel = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    if (!days[dayKey]) {
      days[dayKey] = { label: dayLabel, hours: [], total: 0 };
    }
    days[dayKey].hours.push({ time, hour, production });
    days[dayKey].total += production;
  });

  // Trouver les 15 meilleures heures (top production)
  const allHours = productions.filter(p => p.hour >= 6 && p.hour <= 21);
  const topHours = allHours
    .sort((a, b) => b.production - a.production)
    .slice(0, 15)
    .map(h => h.time);

  // Valeur max pour le dégradé
  const maxVal = Math.max(...productions.map(p => p.production));

  // Créer les colonnes par jour
  const container = document.createElement("div");
  container.className = "agenda-container";

  Object.entries(days).forEach(([dayKey, { label, hours, total }]) => {
    const col = document.createElement("div");
    col.className = "day-col";

    const title = document.createElement("div");
    title.className = "day-title";
    title.innerHTML = `${label}<br><small style="font-weight:normal; color:#667085;">${(total / 1000).toFixed(1)} kWh</small>`;
    col.appendChild(title);

    hours.forEach(({ time, hour, production }) => {
      const cell = document.createElement("div");
      cell.className = "hour-cell";
      
      // Highlight des meilleures heures
      if (topHours.includes(time)) {
        cell.classList.add("top-hour");
      }
      
      cell.innerHTML = `
        <span class="hour-label">${hour}h</span>
        <span class="hour-value">${production} Wh</span>
      `;

      // Dégradé de couleur (blanc → jaune/orange)
      const intensity = maxVal > 0 ? production / maxVal : 0;
      const hue = 45; // Jaune-orange
      const saturation = 85 + intensity * 15; // 85-100%
      const lightness = 95 - intensity * 45; // 95% (blanc) → 50% (orange vif)
      cell.style.background = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      
      // Bordure pour les top heures
      if (topHours.includes(time)) {
        cell.style.borderLeft = "4px solid #059669";
      }

      col.appendChild(cell);
    });

    container.appendChild(col);
  });

  agenda.appendChild(container);
  
  // Stocker les données pour suggestions d'appareils
  currentForecastData = { times, productions, topHours, days };
  
  // Afficher la section appareils
  renderAppliances();
}

// ===== GESTION DES APPAREILS =====
function renderAppliances() {
  appliancesSection.style.display = "block";
  appliancesList.innerHTML = "";
  
  APPLIANCES.forEach(appliance => {
    const card = document.createElement("div");
    card.className = "appliance-card";
    if (selectedAppliances.has(appliance.id)) {
      card.classList.add("selected");
    }
    
    card.innerHTML = `
      <div class="appliance-icon">${appliance.icon}</div>
      <div class="appliance-info">
        <div class="appliance-name">${appliance.name}</div>
        <div class="appliance-specs">${appliance.power}W · ${appliance.duration}h</div>
      </div>
      <div class="appliance-energy">${(appliance.power * appliance.duration / 1000).toFixed(1)} kWh</div>
    `;
    
    card.addEventListener("click", () => {
      if (selectedAppliances.has(appliance.id)) {
        selectedAppliances.delete(appliance.id);
        card.classList.remove("selected");
      } else {
        selectedAppliances.add(appliance.id);
        card.classList.add("selected");
      }
      
      // Sauvegarder et afficher suggestions
      savePreferencesWithAppliances();
      if (selectedAppliances.size > 0 && currentForecastData) {
        showApplianceSuggestions();
      } else {
        hideApplianceSuggestions();
      }
    });
    
    appliancesList.appendChild(card);
  });
  
  // Afficher suggestions si appareils déjà sélectionnés
  if (selectedAppliances.size > 0 && currentForecastData) {
    showApplianceSuggestions();
  }
}

function savePreferencesWithAppliances() {
  const savedPrefs = JSON.parse(localStorage.getItem("solarPrefs")) || {};
  savedPrefs.appliances = Array.from(selectedAppliances);
  localStorage.setItem("solarPrefs", JSON.stringify(savedPrefs));
}

function showApplianceSuggestions() {
  // Retirer anciennes suggestions
  const oldSuggestions = document.getElementById("suggestions-panel");
  if (oldSuggestions) oldSuggestions.remove();
  
  const panel = document.createElement("div");
  panel.id = "suggestions-panel";
  panel.className = "card";
  panel.style.padding = "16px";
  panel.style.marginBottom = "20px";
  
  let html = `<h2 style="margin: 0 0 12px; font-size: 18px;">💡 Recommandations</h2>`;
  
  // Pour chaque appareil sélectionné, trouver le meilleur créneau
  selectedAppliances.forEach(appId => {
    const appliance = APPLIANCES.find(a => a.id === appId);
    if (!appliance) return;
    
    const bestSlot = findBestTimeSlot(appliance, currentForecastData);
    
    if (bestSlot) {
      const date = new Date(bestSlot.startTime);
      const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
      const timeLabel = `${date.getHours()}h - ${new Date(bestSlot.endTime).getHours()}h`;
      const coverage = ((bestSlot.totalProduction / (appliance.power * appliance.duration)) * 100).toFixed(0);
      
      html += `
        <div class="suggestion-item">
          <div class="suggestion-icon">${appliance.icon}</div>
          <div class="suggestion-content">
            <div class="suggestion-appliance">${appliance.name}</div>
            <div class="suggestion-time">🕐 ${dayLabel}, ${timeLabel}</div>
            <div class="suggestion-coverage">☀️ ${coverage}% couvert par le solaire (${(bestSlot.totalProduction / 1000).toFixed(1)} kWh produits)</div>
          </div>
        </div>
      `;
    }
  });
  
  panel.innerHTML = html;
  appliancesSection.insertAdjacentElement("afterend", panel);
}

function hideApplianceSuggestions() {
  const oldSuggestions = document.getElementById("suggestions-panel");
  if (oldSuggestions) oldSuggestions.remove();
}

function findBestTimeSlot(appliance, forecastData) {
  const { productions } = forecastData;
  const durationHours = Math.ceil(appliance.duration);
  
  let bestSlot = null;
  let maxProduction = 0;
  
  // Chercher dans les 7 prochains jours
  for (let i = 0; i < productions.length - durationHours; i++) {
    const startHour = productions[i].hour;
    
    // Ignorer la nuit
    if (startHour < 6 || startHour > 20) continue;
    
    // Calculer production totale sur la durée
    let totalProduction = 0;
    for (let j = 0; j < durationHours; j++) {
      totalProduction += productions[i + j].production;
    }
    
    if (totalProduction > maxProduction) {
      maxProduction = totalProduction;
      bestSlot = {
        startTime: productions[i].time,
        endTime: productions[i + durationHours - 1].time,
        totalProduction: totalProduction
      };
    }
  }
  
  return bestSlot;
}

// ===== RÉCUPÉRATION COORDONNÉES =====
async function getCoordinates(address) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  );
  const results = await response.json();
  if (results.length === 0) throw new Error("Adresse introuvable");
  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    display: results[0].display_name,
  };
}

// ===== SOUMISSION FORMULAIRE =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  messageBox.textContent = "⏳ Chargement des prévisions...";
  messageBox.style.color = "#667085";

  const address = document.getElementById("address").value.trim();
  const orientation = parseInt(document.getElementById("orientation").value);
  const tilt = parseInt(document.getElementById("tilt").value);
  const capacity = parseFloat(document.getElementById("capacity").value);

  try {
    let coords;

    if (address.toLowerCase() === "moi") {
      coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ 
            lat: pos.coords.latitude, 
            lon: pos.coords.longitude, 
            display: "Ma position" 
          }),
          err => reject(new Error("Géolocalisation refusée"))
        );
      });
    } else {
      coords = await getCoordinates(address);
    }

    savePreferences(address, orientation, tilt, capacity);

    // Appel API Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=shortwave_radiation&timezone=auto&forecast_days=7`;
    const res = await fetch(url);

    if (!res.ok) throw new Error("Erreur API Open-Meteo");
    const data = await res.json();

    const times = data.hourly.time;
    const values = data.hourly.shortwave_radiation;

    messageBox.textContent = `✅ Prévisions chargées pour : ${coords.display}`;
    messageBox.style.color = "#059669";

    renderAgenda(times, values, capacity, orientation, tilt, coords.lat);

  } catch (err) {
    console.error(err);
    messageBox.textContent = `❌ ${err.message}`;
    messageBox.style.color = "#b42318";
  }
});
