async function getSolarData() {
  const address = document.getElementById("addressInput").value;
  if (!address) {
    alert("Merci d'entrer une adresse !");
    return;
  }

  document.getElementById("results").innerHTML = "<p>Chargement...</p>";

  try {
    // 1. Convertir adresse → coordonnées GPS
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) {
      document.getElementById("results").innerHTML = "<p>Adresse introuvable.</p>";
      return;
    }
    const lat = geoData[0].lat;
    const lon = geoData[0].lon;

    // 2. Récupérer irradiation solaire
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

    // 3. Regrouper par jour
    const days = {};
    for (let i = 0; i < times.length; i++) {
      const date = new Date(times[i]);
      const dayName = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      const hour = date.getHours() + "h";

      // Filtrer la nuit (production nulle)
      if (radiation[i] > 0) {
        if (!days[dayName]) days[dayName] = [];
        days[dayName].push({ hour, value: radiation[i] });
      }
    }

    // 4. Déterminer la valeur max pour échelle couleurs
    const maxVal = Math.max(...radiation);

    // 5. Construire affichage
    let html = "";
    for (const [day, hours] of Object.entries(days)) {
      html += `<div class="day"><h3>${day}</h3>`;
      hours.forEach(h => {
        const intensity = h.value / maxVal;
        const color = `rgb(${255 * intensity}, ${200 - 150 * intensity}, 0)`; // dégradé jaune → rouge
        html += `<div class="hour" style="background:${color}">${h.hour} - ${Math.round(h.value)} W/m²</div>`;
      });
      html += "</div>";
    }

    document.getElementById("results").innerHTML = html;

  } catch (error) {
    console.error(error);
    document.getElementById("results").innerHTML = "<p>Erreur de connexion à l'API.</p>";
  }
}

