// Background service worker for Device Guard

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: false,
    cameraIndex: 0,
    micIndex: 0,
    speakerIndex: 0,
    cameraName: "Camera",
    micName: "Microphone",
    speakerName: "Speaker",
  });
});
