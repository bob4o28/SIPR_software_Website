const CENTER_RUSE = [43.8356, 25.9657];
let map, marker;

// Initialize Leaflet map
function initMap() {
  if (!window.L) {
    console.error('Leaflet library not loaded');
    alert('Грешка: Картата не е заредена. Проверете интернет връзката.');
    return;
  }

  // Ensure map container exists and has dimensions
  const mapEl = document.getElementById('map');
  if (!mapEl) {
    console.error('Map container not found');
    return;
  }

  map = L.map('map').setView(CENTER_RUSE, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Force map to recalculate size
  map.invalidateSize();

  marker = L.marker(CENTER_RUSE, { draggable: true }).addTo(map);
  marker.bindPopup("Преместете маркера на точната локация").openPopup();

  // Show initial coords
  document.getElementById('coordsDisplay').textContent =
    `${CENTER_RUSE[0].toFixed(5)}, ${CENTER_RUSE[1].toFixed(5)}`;

  // Reverse-geocode on drag end
  marker.on('moveend', async () => {
    const coords = marker.getLatLng();
    document.getElementById('coordsDisplay').textContent =
      `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

    try {
      const address = await reverseGeocode(coords.lat, coords.lng);
      document.getElementById('addressDisplay').textContent = address;
    } catch {
      document.getElementById('addressDisplay').textContent = "Адресът не е намерен";
    }
  });
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;
 
      const coords = [lat, lng];
 
      // Преместваме картата и маркера
      map.setView(coords, 16);
      marker.setLatLng(coords);
      
      // Update coordinates display
      document.getElementById('coordsDisplay').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      
      // Reverse-geocode to get address
      try {
        const address = await reverseGeocode(lat, lng);
        document.getElementById('addressDisplay').textContent = address;
      } catch (err) {
        console.warn("Address lookup failed:", err);
        document.getElementById('addressDisplay').textContent = "Адресът не е намерен";
      }
 
      console.log(`Автоматично откриване: ${lat}, ${lng} (точност ${Math.round(acc)} м)`);
    },
    (err) => {
      console.warn("Geolocation отказано или недостъпно:", err);
    }
  );
}
  // Optional: click map to move marker
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    marker.setLatLng([lat, lng]);
    document.getElementById('coordsDisplay').textContent =
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const address = await reverseGeocode(lat, lng);
      document.getElementById('addressDisplay').textContent = address;
    } catch {
      document.getElementById('addressDisplay').textContent = "Адресът не е намерен";
    }
  });
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  return data.display_name || "Адресът не е намерен";
}

// ---- 3) FORWARD GEOCODING (address -> coords) ----
document.addEventListener('DOMContentLoaded', () => {
  const geocodeBtn = document.getElementById('geocodeBtn');
  if (geocodeBtn) {
    geocodeBtn.addEventListener('click', async () => {
      const addressInput = document.getElementById('address');
      const address = addressInput.value.trim();
      if (!address) {
        alert("Въведете адрес!");
        return;
      }

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=Русе, България, ${encodeURIComponent(address)}&limit=1`;
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          // Move map and marker
          map.setView([lat, lon], 15);
          marker.setLatLng([lat, lon]);

          // Update UI
          document.getElementById('coordsDisplay').textContent =
            `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
          document.getElementById('addressDisplay').textContent =
            data[0].display_name || address;

        } else {
          alert("Адресът не е намерен!");
        }
      } catch (err) {
        console.error(err);
        alert("Възникна грешка при търсене на адрес.");
      }
    });
  }
});

// Bootstrap the map on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initMap, 100);
});
function setLoading(el, loading = true, loadingText = "Моля, изчакайте...") {
  if (!el) return;
  if (!el.dataset.defaultText) {
    el.dataset.defaultText = el.textContent;
  }
  el.disabled = loading;
  el.textContent = loading ? loadingText : el.dataset.defaultText;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${
    type === "error" ? "toast--error" : ""
  }`;

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = type === "error" ? "⚠️" : "ℹ️";

  const text = document.createElement("span");
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    setTimeout(() => {
      toast.remove();
    }, 180);
  }, 3500);
}

