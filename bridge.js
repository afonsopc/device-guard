// Bridge: ISOLATED world content script
// Reads settings from chrome.storage.local and pushes to MAIN world

function pushSettings() {
  chrome.storage.local.get(
    ["enabled", "cameraName", "micName", "speakerName"],
    (data) => {
      const settings = {
        enabled: !!data.enabled,
        cameraName: data.cameraName || "Camera",
        micName: data.micName || "Microphone",
        speakerName: data.speakerName || "Speaker",
      };
      window.postMessage(
        { type: "DEVICE_GUARD_SETTINGS", settings },
        "*"
      );
    }
  );
}

pushSettings();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    pushSettings();
  }
});
