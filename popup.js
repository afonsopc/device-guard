const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const masterToggle = $("#masterToggle");
const cameraCard = $("#cameraCard");
const micCard = $("#micCard");
const speakerCard = $("#speakerCard");
const cameraNameInput = $("#cameraName");
const micNameInput = $("#micName");
const speakerNameInput = $("#speakerName");
const statusDot = $("#statusDot");
const statusText = $("#statusText");
const randomizeBtn = $("#randomizeBtn");
const editBtn = $("#editBtn");
const backBtn = $("#backBtn");

// Default name lists
const DEFAULT_CAMERAS = [
  "FaceTime HD Camera",
  "FaceTime HD Camera (Built-in)",
  "Integrated Webcam",
  "HD Webcam",
  "USB Camera",
  "HP HD Camera",
  "Lenovo EasyCamera",
  "Dell Webcam",
  "Integrated Camera",
  "HD WebCam",
  "USB2.0 HD UVC WebCam",
  "BisonCam",
  "Chicony USB2.0 Camera",
  "Realtek PC Camera",
  "Acer HD User Facing",
  "Surface Camera Front",
  "ThinkPad P50 Integrated Camera",
];

const DEFAULT_MICS = [
  "Internal Microphone",
  "Built-in Microphone",
  "Microphone Array",
  "Microphone (Realtek High Definition Audio)",
  "Microphone (Realtek(R) Audio)",
  "Microphone (USB Audio Device)",
  "Microphone Array (Realtek(R) Audio)",
  "MacBook Air Microphone",
  "MacBook Pro Microphone",
  "Microphone (HD Audio)",
  "Front Microphone",
  "Digital Microphone",
  "Headset Microphone",
  "Microphone (High Definition Audio Device)",
];

const DEFAULT_SPEAKERS = [
  "Speakers (Realtek High Definition Audio)",
  "Speakers (Realtek(R) Audio)",
  "MacBook Air Speakers",
  "MacBook Pro Speakers",
  "Built-in Output",
  "Internal Speakers",
  "Speakers (High Definition Audio Device)",
  "Speakers (USB Audio Device)",
  "Speakers / Headphones (Realtek(R) Audio)",
  "Speaker (Realtek HD Audio output)",
  "Default - Speakers",
];

// Current name lists (loaded from storage or defaults)
let nameLists = {
  cameras: [...DEFAULT_CAMERAS],
  mics: [...DEFAULT_MICS],
  speakers: [...DEFAULT_SPEAKERS],
};

function updateUI(enabled) {
  cameraCard.classList.toggle("disabled", !enabled);
  micCard.classList.toggle("disabled", !enabled);
  speakerCard.classList.toggle("disabled", !enabled);
  statusDot.classList.toggle("active", enabled);
  statusText.classList.toggle("active", enabled);
  statusText.textContent = enabled ? "Protected" : "Disabled";
  randomizeBtn.disabled = !enabled;
  editBtn.disabled = !enabled;
}

function getSettings() {
  return {
    enabled: masterToggle.checked,
    cameraName: cameraNameInput.value || "Camera",
    micName: micNameInput.value || "Microphone",
    speakerName: speakerNameInput.value || "Speaker",
  };
}

function saveSettings() {
  chrome.storage.local.set(getSettings());
}

function saveNameLists() {
  chrome.storage.local.set({ nameLists });
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["enabled", "cameraName", "micName", "speakerName", "nameLists"],
      (data) => {
        if (data.enabled) masterToggle.checked = true;
        if (data.cameraName) cameraNameInput.value = data.cameraName;
        if (data.micName) micNameInput.value = data.micName;
        if (data.speakerName) speakerNameInput.value = data.speakerName;
        if (data.nameLists) {
          nameLists = data.nameLists;
        }
        updateUI(!!data.enabled);
        resolve();
      }
    );
  });
}

masterToggle.addEventListener("change", () => {
  updateUI(masterToggle.checked);
  saveSettings();
});

let debounceTimer;
function debouncedSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveSettings, 300);
}

cameraNameInput.addEventListener("input", debouncedSave);
micNameInput.addEventListener("input", debouncedSave);
speakerNameInput.addEventListener("input", debouncedSave);

// Randomize
function pickRandom(arr) {
  return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : "";
}

randomizeBtn.addEventListener("click", () => {
  cameraNameInput.value = pickRandom(nameLists.cameras);
  micNameInput.value = pickRandom(nameLists.mics);
  speakerNameInput.value = pickRandom(nameLists.speakers);
  saveSettings();
});

// ── Edit page ──

editBtn.addEventListener("click", () => {
  document.body.classList.add("show-edit");
  renderAllLists();
});

backBtn.addEventListener("click", () => {
  document.body.classList.remove("show-edit");
  // Close any open add inputs
  $$(".name-section.adding").forEach((s) => s.classList.remove("adding"));
});

function renderList(category) {
  const list = $(`.name-list[data-category="${category}"]`);
  list.innerHTML = "";
  nameLists[category].forEach((name, i) => {
    const item = document.createElement("div");
    item.className = "name-item";
    item.innerHTML = `<span title="${name}">${name}</span><button class="remove-btn" data-category="${category}" data-index="${i}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    list.appendChild(item);
  });
}

function renderAllLists() {
  renderList("cameras");
  renderList("mics");
  renderList("speakers");
}

// Remove name
document.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".remove-btn");
  if (removeBtn) {
    const cat = removeBtn.dataset.category;
    const idx = parseInt(removeBtn.dataset.index, 10);
    nameLists[cat].splice(idx, 1);
    saveNameLists();
    renderList(cat);
  }
});

// Add name - show input
$$(".add-name-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.closest(".name-section");
    section.classList.add("adding");
    const input = section.querySelector(".name-input-row input");
    input.value = "";
    input.focus();
  });
});

// Add name - confirm
function confirmAdd(section, category) {
  const input = section.querySelector(".name-input-row input");
  const raw = input.value;
  const names = raw.split("§").map((s) => s.trim()).filter(Boolean);
  let added = false;
  for (const name of names) {
    if (!nameLists[category].includes(name)) {
      nameLists[category].push(name);
      added = true;
    }
  }
  if (added) {
    saveNameLists();
    renderList(category);
  }
  input.value = "";
  section.classList.remove("adding");
}

$$(".confirm-add-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.closest(".name-section");
    confirmAdd(section, btn.dataset.category);
  });
});

// Enter key in add input
$$(".name-input-row input").forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const section = input.closest(".name-section");
      const cat = section.querySelector(".confirm-add-btn").dataset.category;
      confirmAdd(section, cat);
    } else if (e.key === "Escape") {
      input.closest(".name-section").classList.remove("adding");
    }
  });
});

loadSettings();
