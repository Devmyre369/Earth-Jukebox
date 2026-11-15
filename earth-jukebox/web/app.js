"use strict";

const DATA_URL = "./data/processed/global_temperature_monthly.json";
const MONTH_DURATION_MS = 480;
const MIN_FREQUENCY_HZ = 220;
const PITCH_OCTAVES = 1.35;

const elements = {
  status: document.querySelector("#data-status"),
  statusLabel: document.querySelector("#status-label"),
  range: document.querySelector("#dataset-range"),
  readingDate: document.querySelector("#reading-date"),
  readingValue: document.querySelector("#reading-value"),
  chart: document.querySelector("#timeline-chart"),
  chartAxis: document.querySelector("#chart-axis"),
  timeline: document.querySelector("#timeline"),
  timelineHintEnd: document.querySelector("#timeline-hint-end"),
  timelineEnd: document.querySelector("#timeline-end"),
  playButton: document.querySelector("#play-button"),
  playLabel: document.querySelector("#play-label"),
  stopButton: document.querySelector("#stop-button"),
  speed: document.querySelector("#speed-select"),
  volume: document.querySelector("#volume"),
  playbackStatus: document.querySelector("#playback-status"),
  observationCount: document.querySelector("#observation-count"),
};

const state = {
  records: [],
  minimum: 0,
  maximum: 0,
  index: 0,
  playing: false,
  timer: null,
  lastSoundedIndex: -1,
  audioContext: null,
  masterGain: null,
};

function setPlaybackStatus(message, isError) {
  elements.playbackStatus.textContent = message;
  elements.playbackStatus.classList.toggle("is-error", Boolean(isError));
}

function formatAnomaly(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function monthNumber(record) {
  return record.year * 12 + record.month - 1;
}

function formatMonth(record) {
  return `${record.month_name} ${record.year}`;
}

function validateDataset(dataset) {
  if (!dataset || !dataset.metadata || !Array.isArray(dataset.records) || dataset.records.length === 0) {
    throw new Error("The NASA dataset is empty or has an invalid structure.");
  }

  const previousMonth = -Infinity;
  let lastMonth = previousMonth;
  let minimum = Infinity;
  let maximum = -Infinity;

  for (const [index, record] of dataset.records.entries()) {
    const validRecord =
      typeof record.time === "string" &&
      Number.isInteger(record.year) &&
      Number.isInteger(record.month) &&
      record.month >= 1 &&
      record.month <= 12 &&
      typeof record.month_name === "string" &&
      Number.isFinite(record.anomaly_celsius);

    if (!validRecord) {
      throw new Error(`NASA dataset record ${index + 1} is invalid.`);
    }

    const currentMonth = monthNumber(record);
    if (currentMonth <= lastMonth) {
      throw new Error("NASA dataset records are not in chronological order.");
    }
    lastMonth = currentMonth;
    minimum = Math.min(minimum, record.anomaly_celsius);
    maximum = Math.max(maximum, record.anomaly_celsius);
  }

  return { minimum, maximum };
}

function setStatus(message, status) {
  elements.statusLabel.textContent = message;
  elements.status.classList.toggle("is-ready", status === "ready");
  elements.status.classList.toggle("is-error", status === "error");
}

function updateReading() {
  const record = state.records[state.index];
  if (!record) return;

  elements.readingDate.textContent = formatMonth(record);
  elements.readingValue.innerHTML = `${formatAnomaly(record.anomaly_celsius)}<span> °C</span>`;
  elements.timeline.value = String(state.index);
  drawTimeline();
}

function drawTimeline() {
  const canvas = elements.chart;
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0 || state.records.length === 0) return;

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * pixelRatio);
  canvas.height = Math.round(bounds.height * pixelRatio);
  const context = canvas.getContext("2d");
  if (!context) {
    setPlaybackStatus("Your browser could not draw the timeline chart.", true);
    return;
  }
  context.scale(pixelRatio, pixelRatio);

  const width = bounds.width;
  const height = bounds.height;
  const padding = { top: 28, right: 3, bottom: 12, left: 3 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const range = state.maximum - state.minimum || 1;
  const monthStart = monthNumber(state.records[0]);
  const monthEnd = monthNumber(state.records[state.records.length - 1]);
  const monthSpan = Math.max(monthEnd - monthStart, 1);
  const x = (record) => padding.left + ((monthNumber(record) - monthStart) / monthSpan) * plotWidth;
  const y = (value) => padding.top + ((state.maximum - value) / range) * plotHeight;
  const zeroY = state.minimum <= 0 && state.maximum >= 0 ? y(0) : null;

  context.clearRect(0, 0, width, height);
  if (zeroY !== null) {
    context.beginPath();
    context.setLineDash([3, 5]);
    context.strokeStyle = "rgba(225, 230, 215, 0.17)";
    context.moveTo(padding.left, zeroY);
    context.lineTo(width - padding.right, zeroY);
    context.stroke();
    context.setLineDash([]);
  }

  context.beginPath();
  let previousMonth = null;
  state.records.forEach((record) => {
    const currentMonth = monthNumber(record);
    if (previousMonth === null || currentMonth - previousMonth !== 1) {
      context.moveTo(x(record), y(record.anomaly_celsius));
    } else {
      context.lineTo(x(record), y(record.anomaly_celsius));
    }
    previousMonth = currentMonth;
  });
  context.strokeStyle = "#d3f36b";
  context.lineWidth = 1.6;
  context.lineJoin = "round";
  context.stroke();

  const selected = state.records[state.index];
  if (selected) {
    const selectedX = x(selected);
    const selectedY = y(selected.anomaly_celsius);
    context.beginPath();
    context.moveTo(selectedX, padding.top);
    context.lineTo(selectedX, height - padding.bottom);
    context.strokeStyle = "rgba(211, 243, 107, 0.45)";
    context.lineWidth = 1;
    context.stroke();
    context.beginPath();
    context.arc(selectedX, selectedY, 4, 0, Math.PI * 2);
    context.fillStyle = "#d3f36b";
    context.fill();
    context.beginPath();
    context.arc(selectedX, selectedY, 7, 0, Math.PI * 2);
    context.strokeStyle = "rgba(211, 243, 107, 0.32)";
    context.lineWidth = 1;
    context.stroke();
  }
}

function updateAxis() {
  const firstYear = state.records[0].year;
  const lastYear = state.records[state.records.length - 1].year;
  const span = lastYear - firstYear;
  const step = Math.max(1, Math.ceil(span / 4 / 10) * 10);
  const labels = [];
  for (let year = firstYear; year <= lastYear; year += step) {
    labels.push(year);
  }
  if (labels[labels.length - 1] !== lastYear) labels.push(lastYear);
  elements.chartAxis.replaceChildren(
    ...labels.map((year) => {
      const label = document.createElement("span");
      label.textContent = String(year);
      return label;
    }),
  );
}

function setSelectedIndex(index, soundIfPlaying) {
  state.index = Math.max(0, Math.min(index, state.records.length - 1));
  state.lastSoundedIndex = -1;
  updateReading();
  if (state.playing && soundIfPlaying) {
    playCurrentRecord();
    scheduleNext();
  }
}

function ensureAudio() {
  if (!window.AudioContext) {
    throw new Error("Web Audio is not available in this browser.");
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContext();
    state.masterGain = state.audioContext.createGain();
    state.masterGain.gain.value = Number(elements.volume.value) * 0.18;
    state.masterGain.connect(state.audioContext.destination);
  }

  return state.audioContext.resume();
}

function normalizedValue(record) {
  const range = state.maximum - state.minimum;
  return range === 0 ? 0.5 : (record.anomaly_celsius - state.minimum) / range;
}

function playCurrentRecord() {
  const record = state.records[state.index];
  const context = state.audioContext;
  if (!record || !context || !state.masterGain) return;

  const normalized = normalizedValue(record);
  const now = context.currentTime;
  const duration = Math.min(0.38, (MONTH_DURATION_MS / Number(elements.speed.value)) / 1000 * 0.85);
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const tremolo = context.createGain();
  const pulse = context.createOscillator();
  const pulseDepth = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(
    MIN_FREQUENCY_HZ * Math.pow(2, normalized * PITCH_OCTAVES),
    now,
  );
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(450 + normalized * 3050, now);
  filter.Q.setValueAtTime(0.8, now);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(0.8, now + 0.035);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  tremolo.gain.setValueAtTime(0.76, now);
  pulse.frequency.setValueAtTime(1.5 + normalized * 5, now);
  pulseDepth.gain.setValueAtTime(0.22, now);

  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(tremolo);
  tremolo.connect(state.masterGain);
  pulse.connect(pulseDepth);
  pulseDepth.connect(tremolo.gain);

  oscillator.onended = () => {
    oscillator.disconnect();
    filter.disconnect();
    envelope.disconnect();
    tremolo.disconnect();
    pulse.disconnect();
    pulseDepth.disconnect();
  };
  oscillator.start(now);
  pulse.start(now);
  oscillator.stop(now + duration + 0.02);
  pulse.stop(now + duration + 0.02);
  state.lastSoundedIndex = state.index;
}

function clearTimer() {
  if (state.timer !== null) {
    window.clearTimeout(state.timer);
    state.timer = null;
  }
}

function scheduleNext() {
  clearTimer();
  if (!state.playing) return;

  const interval = MONTH_DURATION_MS / Number(elements.speed.value);
  state.timer = window.setTimeout(() => {
    if (state.index >= state.records.length - 1) {
      state.playing = false;
      state.timer = null;
      updatePlayButton();
      setPlaybackStatus("End of record. Seek to another month or play again from the beginning.");
      return;
    }

    state.index += 1;
    updateReading();
    playCurrentRecord();
    scheduleNext();
  }, interval);
}

function updatePlayButton() {
  const label = state.playing ? "Pause" : "Play Earth";
  elements.playLabel.textContent = label;
  elements.playButton.setAttribute("aria-label", state.playing ? "Pause playback" : "Play Earth");
  elements.playButton.querySelector(".play-icon").textContent = state.playing ? "Ⅱ" : "▶";
}

async function startPlayback() {
  try {
    await ensureAudio();
    if (state.index >= state.records.length - 1) {
      state.index = 0;
      state.lastSoundedIndex = -1;
      updateReading();
    }
    state.playing = true;
    updatePlayButton();
    if (state.lastSoundedIndex !== state.index) playCurrentRecord();
    setPlaybackStatus(`Playing ${formatMonth(state.records[state.index])}.`);
    scheduleNext();
  } catch (error) {
    setPlaybackStatus(error.message || "Audio could not be started.", true);
  }
}

function pausePlayback() {
  state.playing = false;
  clearTimer();
  updatePlayButton();
  setPlaybackStatus(`Paused at ${formatMonth(state.records[state.index])}.`);
}

function stopPlayback() {
  state.playing = false;
  clearTimer();
  state.lastSoundedIndex = -1;
  state.index = 0;
  updateReading();
  updatePlayButton();
  setPlaybackStatus("Stopped. The timeline is back at the first available observation.");
}

function onSeek() {
  setSelectedIndex(Number(elements.timeline.value), true);
  if (!state.playing) {
    setPlaybackStatus(`Selected ${formatMonth(state.records[state.index])}. Press Play Earth to listen.`);
  }
}

function updateVolume() {
  if (!state.masterGain || !state.audioContext) return;
  state.masterGain.gain.setTargetAtTime(
    Number(elements.volume.value) * 0.18,
    state.audioContext.currentTime,
    0.025,
  );
}

function enableControls() {
  elements.timeline.max = String(state.records.length - 1);
  elements.timeline.disabled = false;
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.speed.disabled = false;
  elements.volume.disabled = false;
}

async function loadDataset() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`NASA dataset request failed (${response.status}).`);
    }

    const dataset = await response.json();
    const { minimum, maximum } = validateDataset(dataset);
    state.records = dataset.records;
    state.minimum = minimum;
    state.maximum = maximum;

    const first = state.records[0];
    const last = state.records[state.records.length - 1];
    elements.range.textContent = `${first.year} — ${last.year}`;
    elements.timelineHintEnd.textContent = `${state.records.length.toLocaleString()} observations`;
    elements.timelineEnd.textContent = String(last.year);
    elements.observationCount.textContent = state.records.length.toLocaleString();
    updateAxis();
    enableControls();
    updateReading();
    setStatus("NASA data ready", "ready");
    setPlaybackStatus(`Ready · ${state.records.length.toLocaleString()} monthly observations · ${formatMonth(first)} to ${formatMonth(last)}.`);
  } catch (error) {
    setStatus("NASA data unavailable", "error");
    setPlaybackStatus(
      `${error.message || "The NASA dataset could not be loaded."} Run the app using the local server instructions in README.`,
      true,
    );
    elements.range.textContent = "Data could not be loaded";
  }
}

elements.playButton.addEventListener("click", () => {
  if (state.playing) pausePlayback();
  else startPlayback();
});
elements.stopButton.addEventListener("click", stopPlayback);
elements.timeline.addEventListener("input", onSeek);
elements.speed.addEventListener("change", () => {
  if (state.playing) scheduleNext();
});
elements.volume.addEventListener("input", updateVolume);
window.addEventListener("resize", drawTimeline);

loadDataset();
