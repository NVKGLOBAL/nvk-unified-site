/* NVK orb sounds — ported from nvknexusorb/audio.ts (AudioEngine).
 * Only the two short sounds the orb actually uses are ported here:
 * nexusOrbClick (orb / gateway click) and cardHover (kept for the gateway
 * modal, used on open only). Ambience loops from the original are NOT
 * ported: this is a public site, and ambient sound must never start
 * without the visitor asking. Sounds play ONLY on click gestures, and the
 * visitor can mute them from the orb panel. Nothing auto-plays.
 */
(function () {
  "use strict";

  var audioContext = null;
  var masterGain = null;
  var isMuted = false;

  function ensureContext() {
    if (audioContext && audioContext.state !== "closed") {
      if (audioContext.state === "suspended") audioContext.resume();
      return true;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      audioContext = new AC();
      masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      if (audioContext.state === "suspended") audioContext.resume();
      return true;
    } catch (e) {
      return false;
    }
  }

  function toggleMute() {
    if (!ensureContext()) return isMuted;
    isMuted = !isMuted;
    var t = audioContext.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.linearRampToValueAtTime(isMuted ? 0 : 1, t + 0.05);
    return isMuted;
  }

  // Verbatim port of AudioEngine.nexusOrbClick (audio.ts).
  function nexusOrbClick() {
    if (isMuted || !ensureContext()) return;
    var ac = audioContext;
    var now = ac.currentTime;
    var duration = 1.5;

    var impactGain = ac.createGain();
    impactGain.gain.setValueAtTime(0.6, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    impactGain.connect(masterGain);
    var impactOsc = ac.createOscillator();
    impactOsc.type = "sine";
    impactOsc.frequency.setValueAtTime(120, now);
    impactOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    impactOsc.connect(impactGain);
    impactOsc.start(now);
    impactOsc.stop(now + 0.5);

    var whooshGain = ac.createGain();
    whooshGain.gain.setValueAtTime(0, now);
    whooshGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    whooshGain.connect(masterGain);
    var noise = ac.createBufferSource();
    var bufferSize = ac.sampleRate * 1.0;
    var buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    var noiseFilter = ac.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.Q.value = 2;
    noiseFilter.frequency.setValueAtTime(200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(4000, now + duration * 0.8);
    noise.connect(noiseFilter).connect(whooshGain);
    noise.start(now);

    var chordGain = ac.createGain();
    chordGain.gain.setValueAtTime(0, now + 0.1);
    chordGain.gain.linearRampToValueAtTime(0.1, now + 0.2);
    chordGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    chordGain.connect(masterGain);
    [440, 440 * 1.5, 440 * 2].forEach(function (freq, j) {
      var osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = (j - 1) * 5;
      osc.connect(chordGain);
      osc.start(now + 0.1);
      osc.stop(now + duration);
    });
  }

  // Verbatim port of AudioEngine.cardHover (audio.ts). Used on gateway
  // modal open (a click outcome), never on hover — hover chimes on a
  // public page are intrusive.
  function cardChime() {
    if (isMuted || !ensureContext()) return;
    var ac = audioContext;
    var now = ac.currentTime;
    var g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.1, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    g.connect(masterGain);
    [880, 1046.5].forEach(function (freq) {
      var osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.3);
      osc.connect(g);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  window.NVKAudio = {
    nexusOrbClick: nexusOrbClick,
    cardChime: cardChime,
    toggleMute: toggleMute,
    isMuted: function () { return isMuted; }
  };
})();
