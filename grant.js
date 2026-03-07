const btn = document.getElementById("grantBtn");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "Requesting access...";

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

    // Save devices to extension storage
    await chrome.storage.local.set({ deviceList });

    status.textContent = "Access granted! You can close this tab.";
    status.style.display = "block";
    status.classList.remove("error");
    btn.textContent = "Done";
  } catch (err) {
    status.textContent = "Permission denied. Please allow access and try again.";
    status.style.display = "block";
    status.classList.add("error");
    btn.disabled = false;
    btn.textContent = "Try Again";
  }
});
