// Charger préférences sauvegardées
window.onload = () => {
  if (localStorage.getItem("address")) {
    document.getElementById("addressInput").value = localStorage.getItem("address");
  }
  if (localStorage.getItem("orientation")) {
    document.getElementById("orientation").value = localStorage.getItem("orientation");
  }
  if (localStorage.getItem("power")) {
    document.getElementById("power").value = localStorage.getItem("power");
  }
};

async function getSolarData(lat=null, lon=null) {
  const addressInput = document.getElementById("addressInput").value;
  const orientation = parseFloat(document.getElementById("orientation").value);
  const power = parseFloat(document.getElementById("power").value) || 3300;

  // Sauvegarder préférences
  localStorage.setItem("address", addressInput);
  localStorage.setItem("orientation", orientation);
  localStorage.setItem("power", power);

  document.getElementById("results").innerHTML = "<p>Chargement...</p>";

  try {
    if (!lat || !lon) {
      if (!addressInput) {
        alert("Merci d'entrer une adresse ou d'utiliser votre localisation !");
        return;
      }

      // Adresse → GPS
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}`);
      const geoData = await geoRes.json();
      if (!geoData || geoData.length === 0) {
        document.getElementById("results").innerHTML = "<p>Adresse introuvable.</p>";
        return;
      }
      lat = geoData[0].lat;
      lon = geoData[0].lon;
    }

    // Données irradiation
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    if (!weatherData.hourly) {
      document.getElementById("results").innerHTML = "<p>Erreur lors de la récupération des données météo.</p>";
      return;
    }

    const times = weatherData.hourly.time;
    const radiation = weatherData.hourly.shortwave_radiation;

    // Regrouper par jour
    const days = {};
    const allHours = [];

    for (let i = 0; i < times.length; i++) {
      const date = new Date(times[i]);
      const dayName = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      const hour = date.getHours() + "h";

      if (radiation[i] > 0) {
        // appliquer orientation et puissance (Wh estimés)
        const estimatedWh = radiation[i] * orientation * (power / 1000);

        if (!days[dayName]) days[dayName] = [];
        days[dayName].push({ hour, value: estimatedWh });

        allHours.push({ day: dayName, hour, value: estimatedWh });
      }
    }

    // Trouver les 10 heures les plus productives
    const top10 = allHours.sort((a, b) => b.value - a.value).slice(0, 10);

    const maxVal = Math.max(...allHours.map(h => h.value));

    // Affichage
    let html = "";
    for (const [day, hours] of Object.entries(days)) {
      html += `<div class="day"><h3>${day}</h3>`;
      hours.forEach(h => {
        const intensity = h.value / maxVal;
        const color = `rgb(${255 * intensity}, ${200 - 150 * intensity}, 0)`;
        const isTop = top10.some(t => t.day === day && t.hour === h.hour);
        html += `<div class="hour ${isTop ? 'top-hour' : ''}" style="background:${color}">
          ${h.hour} - ${Math.round(h.value)} Wh
        </div>`;
      });
      html += "</div>";
    }

    document.getElementById("results").innerHTML = html;

  } catch (error) {
    console.error(error);
    document.getElementById("results").innerHTML = "<p>Erreur de connexion à l'API.</p>";
  }
}

// Utiliser la localisation GPS du navigateur
function useMyLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => getSolarData(position.coords.latitude, position.coords.longitude),
      error => alert("Impossible de récupérer votre localisation : " + error.message)
    );
  } else {
    alert("La géolocalisation n'est pas supportée par votre navigateur.");
  }
}
