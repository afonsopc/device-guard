// Device Guard - Main world content script
// Overrides media device APIs to spoof device names and prevent fingerprinting

(function () {
  "use strict";

  const STORAGE_KEY = "__deviceGuard__";

  // In-memory settings, updated by bridge.js via postMessage
  let currentSettings = null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) currentSettings = JSON.parse(raw);
  } catch {}

  window.addEventListener("message", (event) => {
    if (
      event.source === window &&
      event.data &&
      event.data.type === "DEVICE_GUARD_SETTINGS"
    ) {
      currentSettings = event.data.settings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    }
  });

  function getSettings() {
    return currentSettings;
  }

  // Generate consistent fake IDs per kind (stable within a session)
  const fakeIds = {
    videoinput: crypto.randomUUID(),
    audioinput: crypto.randomUUID(),
    audiooutput: crypto.randomUUID(),
  };
  const fakeGroupId = crypto.randomUUID();

  // ══════════════════════════════════════════
  // 1. enumerateDevices() — spoof all device labels
  // ══════════════════════════════════════════
  const originalEnumerateDevices = MediaDevices.prototype.enumerateDevices;

  MediaDevices.prototype.enumerateDevices = async function () {
    const devices = await originalEnumerateDevices.call(this);
    const settings = getSettings();

    if (!settings || !settings.enabled) {
      return devices;
    }

    const seen = new Set();
    const filtered = [];
    for (const device of devices) {
      if (seen.has(device.kind)) continue;
      seen.add(device.kind);
      const label = getLabelForKind(device.kind, settings);
      filtered.push(fakeDeviceInfo(device, label, device.kind));
    }
    return filtered;
  };

  function getLabelForKind(kind, settings) {
    switch (kind) {
      case "videoinput":
        return settings.cameraName || "Camera";
      case "audioinput":
        return settings.micName || "Microphone";
      case "audiooutput":
        return settings.speakerName || "Speaker";
      default:
        return "";
    }
  }

  // ══════════════════════════════════════════
  // 2. getUserMedia() — spoof track labels, settings, capabilities
  // ══════════════════════════════════════════
  const originalGetUserMedia = MediaDevices.prototype.getUserMedia;

  MediaDevices.prototype.getUserMedia = async function (constraints) {
    const stream = await originalGetUserMedia.call(this, constraints);
    const settings = getSettings();

    if (!settings || !settings.enabled) {
      return stream;
    }

    for (const track of stream.getTracks()) {
      spoofTrack(track, settings);
    }

    const origAddTrack = stream.addTrack.bind(stream);
    stream.addTrack = function (track) {
      const s = getSettings();
      if (s && s.enabled) {
        spoofTrack(track, s);
      }
      return origAddTrack(track);
    };

    return stream;
  };

  // ══════════════════════════════════════════
  // 3. Spoof individual MediaStreamTrack
  // ══════════════════════════════════════════
  function spoofTrack(track, settings) {
    const kind = track.kind; // "video" or "audio"
    const spoofedLabel =
      kind === "video"
        ? settings.cameraName || "Camera"
        : settings.micName || "Microphone";
    const spoofedDeviceId =
      kind === "video" ? fakeIds.videoinput : fakeIds.audioinput;

    Object.defineProperty(track, "label", {
      get: () => spoofedLabel,
      configurable: true,
    });

    const origGetSettings = track.getSettings.bind(track);
    track.getSettings = function () {
      const real = origGetSettings();
      return {
        ...real,
        deviceId: spoofedDeviceId,
        groupId: fakeGroupId,
      };
    };

    const origGetCapabilities = track.getCapabilities.bind(track);
    track.getCapabilities = function () {
      const real = origGetCapabilities();
      return {
        ...real,
        deviceId: spoofedDeviceId,
        groupId: fakeGroupId,
      };
    };

    const origGetConstraints = track.getConstraints.bind(track);
    track.getConstraints = function () {
      const real = origGetConstraints();
      if (real.deviceId) {
        real.deviceId = spoofedDeviceId;
      }
      return real;
    };
  }

  // ══════════════════════════════════════════
  // 4. Fake device info object
  // ══════════════════════════════════════════
  function fakeDeviceInfo(original, customLabel, kind) {
    const fakeId = fakeIds[kind] || crypto.randomUUID();
    const obj = {
      deviceId: fakeId,
      kind: kind,
      label: customLabel,
      groupId: fakeGroupId,
      toJSON() {
        return {
          deviceId: this.deviceId,
          kind: this.kind,
          label: this.label,
          groupId: this.groupId,
        };
      },
    };

    if (original.getCapabilities) {
      obj.getCapabilities = function () {
        const real = original.getCapabilities();
        return {
          ...real,
          deviceId: fakeId,
          groupId: fakeGroupId,
        };
      };
    }

    return obj;
  }
})();
