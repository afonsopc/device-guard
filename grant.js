const btn = document.getElementById("grantBtn");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "Requesting access...";

  try {
    const result = await chrome.runtime.sendMessage({
      type: "grant-media-access",
    });

    if (result && result.success) {
      status.textContent = "Access granted! You can close this tab.";
      status.style.display = "block";
      status.classList.remove("error");
      btn.textContent = "Done";
    } else {
      throw new Error(result?.error || "Permission denied");
    }
  } catch (err) {
    status.textContent =
      "Permission denied. Please allow access and try again.";
    status.style.display = "block";
    status.classList.add("error");
    btn.disabled = false;
    btn.textContent = "Try Again";
  }
});
