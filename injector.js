// Device Guard - Main world content script
// Overrides enumerateDevices() and getUserMedia() to expose only selected devices

(function () {
  "use strict";

  const STORAGE_KEY = "__deviceGuard__";

  function getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Listen for settings updates from the popup via custom events
  window.addEventListener("message", (event) => {
    if (
      event.source === window &&
      event.data &&
      event.data.type === "DEVICE_GUARD_UPDATE"
    ) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(event.data.settings));
    }
  });

  const originalEnumerateDevices =
    MediaDevices.prototype.enumerateDevices;
  const originalGetUserMedia =
    MediaDevices.prototype.getUserMedia;

  MediaDevices.prototype.enumerateDevices = async function () {
    const devices = await originalEnumerateDevices.call(this);
    const settings = getSettings();

    if (!settings || !settings.enabled) {
      return devices;
    }

    const filtered = [];

    for (const device of devices) {
      if (device.kind === "videoinput") {
        if (
          settings.selectedCamera &&
          device.deviceId === settings.selectedCamera
        ) {
          filtered.push(
            new MediaDeviceInfo
              ? createDeviceInfo(device, settings.cameraName || "Camera")
              : fakeDevice(device, settings.cameraName || "Camera")
          );
        }
      } else if (device.kind === "audioinput") {
        if (
          settings.selectedMic &&
          device.deviceId === settings.selectedMic
        ) {
          filtered.push(
            new MediaDeviceInfo
              ? createDeviceInfo(device, settings.micName || "Microphone")
              : fakeDevice(device, settings.micName || "Microphone")
          );
        }
      } else if (device.kind === "audiooutput") {
        // Keep default audio output only
        if (device.deviceId === "default" || device.deviceId === "") {
          filtered.push(device);
        }
      }
    }

    return filtered;
  };

  MediaDevices.prototype.getUserMedia = async function (constraints) {
    const settings = getSettings();

    if (!settings || !settings.enabled) {
      return originalGetUserMedia.call(this, constraints);
    }

    // Force the selected deviceId into constraints
    if (constraints) {
      if (constraints.video && settings.selectedCamera) {
        if (typeof constraints.video === "boolean") {
          constraints.video = { deviceId: { exact: settings.selectedCamera } };
        } else if (typeof constraints.video === "object") {
          constraints.video.deviceId = { exact: settings.selectedCamera };
        }
      }
      if (constraints.audio && settings.selectedMic) {
        if (typeof constraints.audio === "boolean") {
          constraints.audio = { deviceId: { exact: settings.selectedMic } };
        } else if (typeof constraints.audio === "object") {
          constraints.audio.deviceId = { exact: settings.selectedMic };
        }
      }
    }

    return originalGetUserMedia.call(this, constraints);
  };

  // MediaDeviceInfo constructor is not available directly,
  // so we create a proxy object that mimics it
  function fakeDevice(original, customLabel) {
    return {
      deviceId: original.deviceId,
      kind: original.kind,
      label: customLabel,
      groupId: original.groupId,
      toJSON() {
        return {
          deviceId: this.deviceId,
          kind: this.kind,
          label: this.label,
          groupId: this.groupId,
        };
      },
    };
  }

  function createDeviceInfo(original, customLabel) {
    // Try to use the native constructor, fallback to fake
    return fakeDevice(original, customLabel);
  }
})();
