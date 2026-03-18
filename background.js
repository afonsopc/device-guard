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

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Requesting camera and microphone permission",
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "grant-media-access") {
    ensureOffscreenDocument()
      .then(() =>
        chrome.runtime.sendMessage({ type: "request-media-permission" })
      )
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
