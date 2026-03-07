// Background service worker for Device Guard
// Handles storage and communication between popup and content scripts

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: false,
    selectedCamera: null,
    selectedMic: null,
    cameraName: "Camera",
    micName: "Microphone",
  });
});
