
// -------- ИНИЦИАЛИЗАЦИЯ НА КАРТА --------
const CENTER_RUSE = [43.8356, 25.9657]; // приблизителен център на Русе
let map, marker;

function initMap() {
  map = L.map("map").setView(CENTER_RUSE, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  // Начален пин (център)
  marker = L.marker(CENTER_RUSE, { draggable: true }).addTo(map);
  marker.bindPopup("Преместете маркера на точната локация").openPopup();

  marker.on("moveend", () => showCoords(marker.getLatLng()));
}
function showCoords(latlng) {
  const { lat, lng } = latlng;
  document.getElementById("coords").textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// -------- ПОМОЩНИ ФУНКЦИИ --------
function setLoading(el, loading = true) {
  el.disabled = loading;
  el.textContent = loading ? "Моля, изчакайте..." : el.dataset.defaultText || el.textContent;
}
function toast(msg) { alert(msg); }

// -------- OPENAI ИНТЕГРАЦИЯ --------
// ВАЖНО: ключът е в config.js (видим в браузъра). За реално приложение – бекенд!
const OPENAI_API_KEY = window.__CONFIG__?.OPENAI_API_KEY;

async function callOpenAIChat(messages, model = "gpt-4o-mini") {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2
    })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("OpenAI error:", data);
    throw new Error(data.error?.message || "OpenAI API error");
  }
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// Класификация в една дума от фиксиран списък
async function classifyProblem(problemText) {
  const system = "Ти си класификатор. Върни САМО една от категориите: осветление, инфраструктура, транспорт, животни, хигиена, шум, други.";
  const user = `Класифицирай следния сигнал: "${problemText}". Избери само една категория от списъка.`;
  const out = await callOpenAIChat([{ role: "system", content: system }, { role: "user", content: user }]);
  // Нормализиране
  const normalized = out.toLowerCase().replace(/\./g, "").trim();
  const allowed = ["осветление","инфраструктура","транспорт","животни","хигиена","шум","други"];
  return allowed.includes(normalized) ? normalized : "други";
}

async function generateMunicipalSignal(problemText, category, coordsText) {
  const system = "Ти пишеш кратки официални сигнали до общинска администрация на български. Тон: учтив, конкретен, без емоции.";
  const user = `Създай кратък официален сигнал (5–7 изречения) до Община Русе.
Проблем: ${problemText}
Категория: ${category}
Локация: ${coordsText || "неуточнена"}
Изисквания: посочи конкретен участък, очаквано действие, и добави финално благодарствено изречение.`;
  return await callOpenAIChat([{ role: "system", content: system }, { role: "user", content: user }]);
}

// -------- ГЕОКОДИРАНЕ (АДРЕС -> КООРДИНАТИ) --------
// Използваме публичния Nominatim (OpenStreetMap). За хакатон е ОК.
// В реален продукт — собствен геокодинг или кеш с rate-limit защита.
async function geocodeAddress(address) {
  if (!address) throw new Error("Въведете адрес или квартал");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `Русе, България, ${address}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "ai-safety-assistant-demo" }
  });
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("Не е намерена локация. Преместете маркера ръчно.");
  const { lat, lon } = data[0];
  const latNum = Number(lat), lonNum = Number(lon);
  return [latNum, lonNum];
}

// -------- MAIN UI ЛОГИКА --------
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  showCoords(marker.getLatLng());

  const generateBtn = document.getElementById("generateBtn");
  generateBtn.dataset.defaultText = "Генерирай сигнал";

  const geocodeBtn = document.getElementById("geocodeBtn");
  geocodeBtn.dataset.defaultText = "Намери на картата";

  const useCenterBtn = document.getElementById("useCenterBtn");
  useCenterBtn.dataset.defaultText = "Пин в центъра";

  geocodeBtn.addEventListener("click", async () => {
    const address = document.getElementById("address").value.trim();
    try {
      setLoading(geocodeBtn, true);
      const coords = await geocodeAddress(address);
      map.setView(coords, 15);
      marker.setLatLng(coords);
      showCoords(marker.getLatLng());
    } catch (e) {
      toast(e.message);
    } finally {
      setLoading(geocodeBtn, false);
    }
  });

  useCenterBtn.addEventListener("click", () => {
    marker.setLatLng(CENTER_RUSE);
    map.setView(CENTER_RUSE, 13);
    showCoords(marker.getLatLng());
  });

  generateBtn.addEventListener("click", async () => {
    const problemText = document.getElementById("problem").value.trim();
    if (!problemText) {
      toast("Моля, опишете проблема.");
      return;
    }
    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes("PASTE_")) {
      toast("Моля, сложете OpenAI API ключа си в config.js.");
      return;
    }
    try {
      setLoading(generateBtn, true);
      const category = await classifyProblem(problemText);
      document.getElementById("category").textContent = category;

      const coords = marker.getLatLng();
      const coordsText = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      document.getElementById("coords").textContent = coordsText;

      const signal = await generateMunicipalSignal(problemText, category, coordsText);
      document.getElementById("signal").textContent = signal;
    } catch (e) {
      console.error(e);
      toast("Възникна грешка при генерирането. Вижте конзолата (DevTools).");
    } finally {
      setLoading(generateBtn, false);
    }
  });

});

// Groq Agent function for future use
async function callGroqAgent(prompt) {
  const res = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: prompt })
  });
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  return res.json();
}
