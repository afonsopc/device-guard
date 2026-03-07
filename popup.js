const $ = (sel) => document.querySelector(sel);
const masterToggle = $("#masterToggle");
const cameraCard = $("#cameraCard");
const micCard = $("#micCard");
const speakerCard = $("#speakerCard");
const cameraSelect = $("#cameraSelect");
const micSelect = $("#micSelect");
const speakerSelect = $("#speakerSelect");
const cameraNameInput = $("#cameraName");
const micNameInput = $("#micName");
const speakerNameInput = $("#speakerName");
const statusDot = $("#statusDot");
const statusText = $("#statusText");

function updateUI(enabled) {
  cameraCard.classList.toggle("disabled", !enabled);
  micCard.classList.toggle("disabled", !enabled);
  speakerCard.classList.toggle("disabled", !enabled);
  statusDot.classList.toggle("active", enabled);
  statusText.classList.toggle("active", enabled);
  statusText.textContent = enabled ? "Protected" : "Disabled";
}

function getSettings() {
  return {
    enabled: masterToggle.checked,
    cameraIndex: parseInt(cameraSelect.value, 10) || 0,
    micIndex: parseInt(micSelect.value, 10) || 0,
    speakerIndex: parseInt(speakerSelect.value, 10) || 0,
    cameraName: cameraNameInput.value || "Camera",
    micName: micNameInput.value || "Microphone",
    speakerName: speakerNameInput.value || "Speaker",
  };
}

function saveSettings() {
  const settings = getSettings();
  chrome.storage.local.set(settings);
}

function populateSelects(devices) {
  const cameras = devices.filter((d) => d.kind === "videoinput");
  const mics = devices.filter((d) => d.kind === "audioinput");
  const speakers = devices.filter((d) => d.kind === "audiooutput");
  const hasLabels = devices.some((d) => d.label);

  const grantLink = $("#grantAccess");
  if (grantLink) {
    grantLink.style.display =
      hasLabels || devices.length === 0 ? "none" : "flex";
  }

  cameraSelect.innerHTML = "";
  if (cameras.length === 0) {
    cameraSelect.innerHTML =
      '<option value="0" class="empty-option">No cameras found</option>';
  } else {
    cameras.forEach((cam, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = cam.label || `Camera ${i + 1}`;
      cameraSelect.appendChild(opt);
    });
  }

  micSelect.innerHTML = "";
  if (mics.length === 0) {
    micSelect.innerHTML =
      '<option value="0" class="empty-option">No microphones found</option>';
  } else {
    mics.forEach((mic, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = mic.label || `Microphone ${i + 1}`;
      micSelect.appendChild(opt);
    });
  }

  speakerSelect.innerHTML = "";
  if (speakers.length === 0) {
    speakerSelect.innerHTML =
      '<option value="0" class="empty-option">No speakers found</option>';
  } else {
    speakers.forEach((spk, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = spk.label || `Speaker ${i + 1}`;
      speakerSelect.appendChild(opt);
    });
  }
}

async function enumerateDevices() {
  const stored = await chrome.storage.local.get(["deviceList"]);
  if (stored.deviceList && stored.deviceList.some((d) => d.label)) {
    populateSelects(stored.deviceList);
    return;
  }

  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const devices = devs.map((d) => ({
      deviceId: d.deviceId,
      kind: d.kind,
      label: d.label,
      groupId: d.groupId,
    }));
    populateSelects(devices);
  } catch {
    populateSelects([]);
  }
}

async function loadSettings() {
  await enumerateDevices();

  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "enabled",
        "cameraIndex",
        "micIndex",
        "speakerIndex",
        "cameraName",
        "micName",
        "speakerName",
      ],
      (data) => {
        if (data.enabled) masterToggle.checked = true;
        if (data.cameraIndex != null) cameraSelect.value = data.cameraIndex;
        if (data.micIndex != null) micSelect.value = data.micIndex;
        if (data.speakerIndex != null) speakerSelect.value = data.speakerIndex;
        if (data.cameraName) cameraNameInput.value = data.cameraName;
        if (data.micName) micNameInput.value = data.micName;
        if (data.speakerName) speakerNameInput.value = data.speakerName;
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

cameraSelect.addEventListener("change", saveSettings);
micSelect.addEventListener("change", saveSettings);
speakerSelect.addEventListener("change", saveSettings);

let debounceTimer;
function debouncedSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveSettings, 300);
}

cameraNameInput.addEventListener("input", debouncedSave);
micNameInput.addEventListener("input", debouncedSave);
speakerNameInput.addEventListener("input", debouncedSave);

// Randomize button
const CAMERA_NAMES = [
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

const MIC_NAMES = [
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

const SPEAKER_NAMES = [
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

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const randomizeBtn = $("#randomizeBtn");
if (randomizeBtn) {
  randomizeBtn.addEventListener("click", () => {
    cameraNameInput.value = pickRandom(CAMERA_NAMES);
    micNameInput.value = pickRandom(MIC_NAMES);
    speakerNameInput.value = pickRandom(SPEAKER_NAMES);
    saveSettings();
  });
}

function updateRandomizeBtn() {
  if (randomizeBtn) {
    randomizeBtn.disabled = !masterToggle.checked;
  }
}

masterToggle.addEventListener("change", updateRandomizeBtn);

const grantLink = $("#grantAccess");
if (grantLink) {
  grantLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("grant.html") });
  });
}

loadSettings().then(updateRandomizeBtn);
