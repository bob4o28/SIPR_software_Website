// -------- ИНИЦИАЛИЗАЦИЯ НА КАРТА --------
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
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;
 
      const coords = [lat, lng];
 
      // Преместваме картата и маркера
      map.setView(coords, 16);
      marker.setLatLng(coords);
      showCoords(marker.getLatLng());
 
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


// -------- GROQ ИНТЕГРАЦИЯ --------
const GROQ_API_KEY = window.__CONFIG__?.GROQ_API_KEY;
const GROQ_MODEL = window.__CONFIG__?.GROQ_MODEL || "openai/gpt-oss-120b";


const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroqChat(messages) {
  if (!Array.isArray(messages)) {
    throw new Error(
      "Невалидни данни за AI заявка (messages трябва да е масив)."
    );
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.5,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Groq error:", data);
    const apiMessage = data?.error?.message || "Groq API error";
    throw new Error(`Грешка от AI: ${apiMessage}`);
  }

  return (
    data.choices?.[0]?.message?.content?.trim() ??
    ""
  );
}

// Класификация в една дума от фиксиран списък
async function classifyProblem(problemText) {
  const system =
    "Ти си класификатор. Върни САМО една от категориите: осветление, инфраструктура, транспорт, животни, хигиена, шум, други.";
  const user = `Класифицирай следния сигнал: "${problemText}". Избери само една категория от списъка. Избери категорията на база по-дългосрочния ефект от събитието. Пример "паднало дърво", дългосрочния ефект е инфраструктура, а краткосрочние е шум`;

  const out = await callGroqChat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const normalized = out.toLowerCase().replace(/\./g, "").trim();
  const allowed = [
    "осветление",
    "инфраструктура",
    "транспорт",
    "животни",
    "хигиена",
    "шум",
    "други",
  ];
  return allowed.includes(normalized) ? normalized : "други";
}

async function generateMunicipalSignal(
  problemText,
  category,
  coordsText,
  addressText = ""
) {
  const system =
    "Ти пишеш кратки официални сигнали до общинска администрация на български. Тон: учтив, конкретен, без емоции.";
  const locationInfo = addressText && addressText.trim() !== "—" ? `${addressText} (${coordsText})` : (coordsText || "неуточнена");
  const user = `Създай кратък официален сигнал (5–7 изречения) до Община Русе.
Проблем: ${problemText}
Категория: ${category}
Локация: ${locationInfo}
Изисквания: посочи конкретен участък, очаквано действие, и добави финално благодарствено изречение.`;

  return await callGroqChat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

async function generateMunicipalSignalWithReverseGeo(problemText, category, lat, lon) {
  let addressText = "";
  try {
    addressText = await reverseGeocodeCoordinates(lat, lon);
  } catch (err) {
    console.warn("Обратното геокодиране не сработи, използва се неуточнена локация");
  }

  const coordsText = `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
  return await generateMunicipalSignal(problemText, category, coordsText, addressText);
}

async function geocodeAddress(address) {
  if (!address) throw new Error("Въведете адрес или квартал");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `Русе, България, ${address}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "ai-safety-assistant-demo" },
  });
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("Не е намерена локация. Преместете маркера ръчно.");
  const { lat, lon } = data[0];
  return [Number(lat), Number(lon)];
}

async function reverseGeocodeCoordinates(lat, lon) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "18"); // Ниво на детайлност - сграда/улица
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ai-safety-assistant-demo",
    },
  });

  if (!res.ok) {
    throw new Error("Грешка при връзка с Nominatim reverse geocoding API");
  }

  const data = await res.json();

  // Връща човеко-разбираемия адрес или празен низ ако няма
  return data.display_name || "";
}

// -------- MAIN UI ЛОГИКА --------
document.addEventListener("DOMContentLoaded", () => {
  const coords = marker?.getLatLng();
  if (coords) {
    document.getElementById('coordsDisplay').textContent = 
      `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }

  const generateBtn = document.getElementById("generateBtn");


  const geocodeBtn = document.getElementById("geocodeBtn");


  const useCenterBtn = document.getElementById("useCenterBtn");
  const copySignalBtn =
    document.getElementById("copySignalBtn");

  // Save default button texts
  if (generateBtn)
    generateBtn.dataset.defaultText = "Генерирай сигнал с AI";
  if (geocodeBtn)
    geocodeBtn.dataset.defaultText = "Намери на картата";
  if (useCenterBtn)
    useCenterBtn.dataset.defaultText = "Пин в центъра";

  // Геокодиране
  geocodeBtn?.addEventListener("click", async () => {
    const address = document
      .getElementById("address")
      .value.trim();
    try {
      setLoading(geocodeBtn, true);
      const coords = await geocodeAddress(address);
      map.setView(coords, 15);
      marker.setLatLng(coords);
      document.getElementById('coordsDisplay').textContent = 
        `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
    } catch (e) {
      console.error(e);
      showToast(e.message || String(e), "error");
    } finally {
      setLoading(geocodeBtn, false);
    }
  });

  // Пин в центъра
  useCenterBtn?.addEventListener("click", () => {
    marker.setLatLng(CENTER_RUSE);
    map.setView(CENTER_RUSE, 13);
    document.getElementById('coordsDisplay').textContent = 
      `${CENTER_RUSE[0].toFixed(5)}, ${CENTER_RUSE[1].toFixed(5)}`;
  });

  // Генериране на сигнал
  generateBtn?.addEventListener("click", async () => {
    const problemText = document
      .getElementById("problem")
      .value.trim();

    if (!problemText) {
      showToast("Моля, опишете проблема.", "error");
      return;
    }

    if (!GROQ_API_KEY || GROQ_API_KEY.includes("PASTE_")) {
      showToast(
        "Моля, сложете Groq API ключа си в config.js или през бекенд proxy.",
        "error"
      );
      return;
    }

    try {
      setLoading(generateBtn, true, "AI генерира сигнал...");

      // Класификация
      const category = await classifyProblem(problemText);
      document.getElementById("category").textContent =
        category;

      // Координати
      const coords = marker.getLatLng();
      const coordsText = `${coords.lat.toFixed(
        5
      )}, ${coords.lng.toFixed(5)}`;
      document.getElementById("coords").textContent =
        coordsText;

      // Сигнал
      const addressText = document.getElementById("addressDisplay")?.textContent || "";
      const signalText = await generateMunicipalSignal(
        problemText,
        category,
        coordsText,
        addressText
      );
      document.getElementById("signal").textContent =
        signalText || "Неуспешно генериране на сигнал.";

      showToast("Сигналът е генериран успешно ✅");
    } catch (e) {
      console.error(e);
      showToast(
        e.message ||
          "Възникна грешка при генерирането. Вижте конзолата (DevTools).",
        "error"
      );
    } finally {
      setLoading(generateBtn, false);
    }
  });

  // Копиране на генерирания текст
  copySignalBtn?.addEventListener("click", async () => {
    const signalEl = document.getElementById("signal");
    const text = signalEl.textContent.trim();
    if (!text) {
      showToast("Няма текст за копиране.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Текстът е копиран в клипборда.");
    } catch (e) {
      console.error(e);
      showToast(
        "Неуспешно копиране. Копирайте ръчно.",
        "error"
      );
    }
  });

  // Изпращане по имейл (клиентска опция: отваря mail client / mailto)
  const sendEmailBtn = document.getElementById("sendEmailBtn");
  if (sendEmailBtn) sendEmailBtn.dataset.defaultText = "Изпрати по имейл";

  sendEmailBtn?.addEventListener("click", async () => {
    const signalEl = document.getElementById("signal");
    const text = signalEl.textContent.trim();
    if (!text) {
      showToast("Няма текст за изпращане.", "error");
      return;
    }

    // Бърза клиентска опция: отвори mail client с предварително попълнено тяло
    const recipient = prompt("Въведете имейл получател", "example@gmail.com");
    if (!recipient) return;
    const subject = encodeURIComponent("Жалба/Сигнал до Община Русе");
    const body = encodeURIComponent(text);
    const mailto = `mailto:${recipient}?subject=${subject}&body=${body}`;

    // Отваряме в нов прозорец/таб. Това ще работи с локален mail client или уебmail (Gmail will handle mailto links).
    window.open(mailto);
  });
});

// Optional: backend proxy call (unchanged)
async function callGroqAgent(prompt) {
  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: prompt }),
  });
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  return res.json();
}

// Send email via backend endpoint `/api/send-email`.
async function sendViaBackend(to, subject, text) 
{
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Send failed: ${res.status}`);
  }
  return res.json();
}
