// Device Guard - Main world content script
// Overrides all media device APIs to prevent device fingerprinting

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

  // Generate a consistent fake deviceId per kind (so it stays the same within a session)
  const fakeIds = {
    videoinput: crypto.randomUUID(),
    audioinput: crypto.randomUUID(),
    audiooutput: crypto.randomUUID(),
  };
  const fakeGroupId = crypto.randomUUID();

  // ══════════════════════════════════════════
  // 1. enumerateDevices()
  // ══════════════════════════════════════════
  const originalEnumerateDevices = MediaDevices.prototype.enumerateDevices;

  MediaDevices.prototype.enumerateDevices = async function () {
    const devices = await originalEnumerateDevices.call(this);
    const settings = getSettings();

    if (!settings || !settings.enabled) {
      return devices;
    }

    const cameras = devices.filter((d) => d.kind === "videoinput");
    const mics = devices.filter((d) => d.kind === "audioinput");
    const speakers = devices.filter((d) => d.kind === "audiooutput");

    const filtered = [];

    const camIndex = settings.cameraIndex || 0;
    if (cameras.length > 0) {
      const cam = cameras[Math.min(camIndex, cameras.length - 1)];
      filtered.push(
        fakeDeviceInfo(cam, settings.cameraName || "Camera", "videoinput")
      );
    }

    const micIndex = settings.micIndex || 0;
    if (mics.length > 0) {
      const mic = mics[Math.min(micIndex, mics.length - 1)];
      filtered.push(
        fakeDeviceInfo(mic, settings.micName || "Microphone", "audioinput")
      );
    }

    const spkIndex = settings.speakerIndex || 0;
    if (speakers.length > 0) {
      const spk = speakers[Math.min(spkIndex, speakers.length - 1)];
      filtered.push(
        fakeDeviceInfo(spk, settings.speakerName || "Speaker", "audiooutput")
      );
    }

    return filtered;
  };

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

    // Also intercept future tracks added to this stream
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

    // Spoof label
    Object.defineProperty(track, "label", {
      get: () => spoofedLabel,
      configurable: true,
    });

    // Spoof getSettings() — hides real deviceId and groupId
    const origGetSettings = track.getSettings.bind(track);
    track.getSettings = function () {
      const real = origGetSettings();
      return {
        ...real,
        deviceId: spoofedDeviceId,
        groupId: fakeGroupId,
      };
    };

    // Spoof getCapabilities() — hides real deviceId and groupId
    const origGetCapabilities = track.getCapabilities.bind(track);
    track.getCapabilities = function () {
      const real = origGetCapabilities();
      return {
        ...real,
        deviceId: spoofedDeviceId,
        groupId: fakeGroupId,
      };
    };

    // Spoof getConstraints() — hide deviceId if present
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
  // 4. Fake device info object (replaces MediaDeviceInfo)
  // ══════════════════════════════════════════
  function fakeDeviceInfo(original, customLabel, kind) {
    const obj = {
      deviceId: fakeIds[kind],
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

    // If the original is an InputDeviceInfo (has getCapabilities), add a spoofed version
    if (original.getCapabilities) {
      obj.getCapabilities = function () {
        const real = original.getCapabilities();
        return {
          ...real,
          deviceId: fakeIds[kind],
          groupId: fakeGroupId,
        };
      };
    }

    return obj;
  }
})();
