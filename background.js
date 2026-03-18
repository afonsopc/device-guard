// Background service worker for Device Guard

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    cameraName: "Camera",
    micName: "Microphone",
    speakerName: "Speaker",
  });
});
