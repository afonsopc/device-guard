chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "request-media-permission") {
    handleMediaPermission().then(sendResponse);
    return true;
  }
});

async function handleMediaPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    stream.getTracks().forEach((t) => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const deviceList = devices.map((d) => ({
      deviceId: d.deviceId,
      kind: d.kind,
      label: d.label,
      groupId: d.groupId,
    }));

    await chrome.storage.local.set({ deviceList });
    return { success: true, deviceList };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
