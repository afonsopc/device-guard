// Bridge: ISOLATED world content script
// Reads settings from chrome.storage.local and pushes to MAIN world

function pushSettings() {
  chrome.storage.local.get(
    ["enabled", "cameraIndex", "micIndex", "speakerIndex", "cameraName", "micName", "speakerName"],
    (data) => {
      const settings = {
        enabled: !!data.enabled,
        cameraIndex: data.cameraIndex || 0,
        micIndex: data.micIndex || 0,
        speakerIndex: data.speakerIndex || 0,
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
