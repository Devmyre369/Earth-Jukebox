"use strict";

const DATA_URL = "./data/processed/global_temperature_monthly.json";
const MONTH_DURATION_MS = 480;
const MIN_FREQUENCY_HZ = 220;
const PITCH_OCTAVES = 1.35;

const LAYER_NAMES = ["melody", "pulse", "atmosphere"];
const INSTRUMENT_NAMES = {
  melody: {
    piano: "Piano",
    "synth-lead": "Synth Lead",
    bell: "Bell",
    "soft-strings": "Soft Strings",
    mallet: "Mallet Instrument",
  },
  pulse: {
    "soft-percussion": "Soft Percussion",
    "electronic-percussion": "Electronic Percussion",
    "wooden-ticks": "Wooden Ticks",
    heartbeat: "Soft Heartbeat-style Pulse",
    "minimal-beat": "Minimal Electronic Beat",
  },
  atmosphere: {
    "ambient-pad": "Ambient Synth Pad",
    "atmospheric-strings": "Atmospheric Strings",
    "harmonic-drone": "Harmonic Drone",
    "evolving-texture": "Evolving Synth Texture",
    "cinematic-texture": "Soft Cinematic Texture",
  },
};

const SOUND_PALETTES = {
  scientific: {
    description: "Clean, restrained layers for interpreting the measurements.",
    instruments: { melody: "piano", pulse: "wooden-ticks", atmosphere: "harmonic-drone" },
    levels: { melody: 0.8, pulse: 0.48, atmosphere: 0.34 },
    reverb: 0,
    delay: 0,
  },
  ambient: {
    description: "Soft sustained textures, gentle pulse, and spacious reverb.",
    instruments: { melody: "soft-strings", pulse: "heartbeat", atmosphere: "ambient-pad" },
    levels: { melody: 0.68, pulse: 0.4, atmosphere: 0.55 },
    reverb: 0.2,
    delay: 0.08,
  },
  orchestral: {
    description: "Strings and restrained percussion with a cinematic, orchestral balance.",
    instruments: { melody: "soft-strings", pulse: "soft-percussion", atmosphere: "atmospheric-strings" },
    levels: { melody: 0.72, pulse: 0.5, atmosphere: 0.5 },
    reverb: 0.18,
    delay: 0,
  },
  electronic: {
    description: "Modern synth timbres, electronic percussion, and a subtle tempo-synced echo.",
    instruments: { melody: "synth-lead", pulse: "electronic-percussion", atmosphere: "evolving-texture" },
    levels: { melody: 0.7, pulse: 0.48, atmosphere: 0.45 },
    reverb: 0.04,
    delay: 0.12,
  },
  cinematic: {
    description: "Bell-like melody and rich, controlled textures with restrained spatial effects.",
    instruments: { melody: "bell", pulse: "minimal-beat", atmosphere: "cinematic-texture" },
    levels: { melody: 0.72, pulse: 0.42, atmosphere: 0.52 },
    reverb: 0.24,
    delay: 0.1,
  },
};

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
  studioMasterVolume: document.querySelector("#studio-master-volume"),
  soundPalette: document.querySelector("#sound-palette"),
  paletteDescription: document.querySelector("#palette-description"),
  muteButton: document.querySelector("#mute-button"),
  resetSound: document.querySelector("#reset-sound"),
  layerInstruments: {
    melody: document.querySelector("#melody-instrument"),
    pulse: document.querySelector("#pulse-instrument"),
    atmosphere: document.querySelector("#atmosphere-instrument"),
  },
  layerInstrumentNames: {
    melody: document.querySelector("#melody-instrument-name"),
    pulse: document.querySelector("#pulse-instrument-name"),
    atmosphere: document.querySelector("#atmosphere-instrument-name"),
  },
  layerLevels: {
    melody: document.querySelector("#melody-level"),
    pulse: document.querySelector("#pulse-level"),
    atmosphere: document.querySelector("#atmosphere-level"),
  },
  layerLevelValues: {
    melody: document.querySelector("#melody-level-value"),
    pulse: document.querySelector("#pulse-level-value"),
    atmosphere: document.querySelector("#atmosphere-level-value"),
  },
  layerEnabled: {
    melody: document.querySelector("#melody-enabled"),
    pulse: document.querySelector("#pulse-enabled"),
    atmosphere: document.querySelector("#atmosphere-enabled"),
  },
  soloButtons: [...document.querySelectorAll("[data-solo-layer]")],
  previewButtons: [...document.querySelectorAll("[data-preview-layer]")],
  reverbEnabled: document.querySelector("#reverb-enabled"),
  reverbLevel: document.querySelector("#reverb-level"),
  reverbLevelValue: document.querySelector("#reverb-level-value"),
  delayEnabled: document.querySelector("#delay-enabled"),
  delayLevel: document.querySelector("#delay-level"),
  delayLevelValue: document.querySelector("#delay-level-value"),
  playbackStatus: document.querySelector("#playback-status"),
  observationCount: document.querySelector("#observation-count"),
  surfaceCanvas: document.querySelector("#surface-canvas"),
  surfaceTooltip: document.querySelector("#surface-tooltip"),
  surfaceReadout: document.querySelector("#surface-readout"),
  surfaceMode: document.querySelector("#surface-mode"),
  surfaceReset: document.querySelector("#surface-reset"),
  surfaceFullscreen: document.querySelector("#surface-fullscreen"),
  showMesh: document.querySelector("#show-mesh"),
  showPoints: document.querySelector("#show-points"),
  yearStart: document.querySelector("#year-start"),
  yearEnd: document.querySelector("#year-end"),
  yearWindowLabel: document.querySelector("#year-window-label"),
  legendMinimum: document.querySelector("#legend-minimum"),
  legendMaximum: document.querySelector("#legend-maximum"),
  waveformCanvas: document.querySelector("#waveform-canvas"),
  audioSpectrumCanvas: document.querySelector("#audio-spectrum-canvas"),
  spectrogramCanvas: document.querySelector("#spectrogram-canvas"),
  audioSignalState: document.querySelector("#audio-signal-state"),
  audioClock: document.querySelector("#audio-clock"),
  climateSpectrumCanvas: document.querySelector("#climate-spectrum-canvas"),
  spectrumWindowInfo: document.querySelector("#spectrum-window-info"),
  annualCanvas: document.querySelector("#annual-canvas"),
  seasonalCanvas: document.querySelector("#seasonal-canvas"),
  trendValue: document.querySelector("#trend-value"),
  trendNote: document.querySelector("#trend-note"),
  melodyValue: document.querySelector("#melody-value"),
  pulseValue: document.querySelector("#pulse-value"),
  atmosphereValue: document.querySelector("#atmosphere-value"),
  melodyMeter: document.querySelector("#melody-meter"),
  pulseMeter: document.querySelector("#pulse-meter"),
  atmosphereMeter: document.querySelector("#atmosphere-meter"),
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
  analyser: null,
  compressor: null,
  layerGains: {},
  reverbInput: null,
  reverbWet: null,
  delayInput: null,
  delayWet: null,
  delayNode: null,
  delayFeedback: null,
  previewGain: null,
  activeNotes: new Set(),
  metrics: [],
  maxMonthlyChange: 0,
  maxVariability: 0,
  sound: {
    palette: "scientific",
    instruments: { melody: "piano", pulse: "wooden-ticks", atmosphere: "harmonic-drone" },
    layers: {
      melody: { enabled: true, volume: 0.8 },
      pulse: { enabled: true, volume: 0.6 },
      atmosphere: { enabled: true, volume: 0.48 },
    },
    solo: null,
    muted: false,
    master: 0.55,
    reverb: { enabled: false, amount: 0.18 },
    delay: { enabled: false, amount: 0.08 },
  },
  years: [],
  startYearIndex: 0,
  endYearIndex: 0,
  surfaceMode: "surface",
  camera: { yaw: -0.52, pitch: 0.88, zoom: 1, panX: 0, panY: 0 },
  surfacePoints: [],
  audioFrame: null,
  waveformData: null,
  frequencyData: null,
  powerSpectrum: [],
  annualMeans: [],
  monthlyMeans: [],
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

function setupCanvas(canvas, heightOverride) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.floor(bounds.width);
  const height = heightOverride || Math.floor(bounds.height);
  if (width <= 0 || height <= 0) return null;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function visibleYearBounds() {
  return {
    start: state.years[state.startYearIndex] ?? state.records[0]?.year,
    end: state.years[state.endYearIndex] ?? state.records[state.records.length - 1]?.year,
  };
}

function visibleRecords() {
  const { start, end } = visibleYearBounds();
  return state.records.filter((record) => record.year >= start && record.year <= end);
}

function updateYearWindowLabel() {
  const { start, end } = visibleYearBounds();
  elements.yearWindowLabel.textContent = `${start} — ${end}`;
}

function fftInPlace(real, imaginary) {
  const length = real.length;
  for (let index = 1, reversed = 0; index < length; index += 1) {
    let bit = length >> 1;
    while (reversed & bit) {
      reversed ^= bit;
      bit >>= 1;
    }
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
      [imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]];
    }
  }

  for (let size = 2; size <= length; size *= 2) {
    const halfSize = size / 2;
    const angle = (-2 * Math.PI) / size;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < length; start += size) {
      let weightReal = 1;
      let weightImaginary = 0;
      for (let offset = 0; offset < halfSize; offset += 1) {
        const even = start + offset;
        const odd = even + halfSize;
        const productReal = real[odd] * weightReal - imaginary[odd] * weightImaginary;
        const productImaginary = real[odd] * weightImaginary + imaginary[odd] * weightReal;
        real[odd] = real[even] - productReal;
        imaginary[odd] = imaginary[even] - productImaginary;
        real[even] += productReal;
        imaginary[even] += productImaginary;
        const nextWeightReal = weightReal * stepReal - weightImaginary * stepImaginary;
        weightImaginary = weightReal * stepImaginary + weightImaginary * stepReal;
        weightReal = nextWeightReal;
      }
    }
  }
}

function setYearWindow(startIndex, endIndex) {
  const last = state.years.length - 1;
  state.startYearIndex = Math.max(0, Math.min(startIndex, last));
  state.endYearIndex = Math.max(0, Math.min(endIndex, last));
  if (state.startYearIndex > state.endYearIndex) {
    if (document.activeElement === elements.yearStart) state.endYearIndex = state.startYearIndex;
    else state.startYearIndex = state.endYearIndex;
  }
  elements.yearStart.value = String(state.startYearIndex);
  elements.yearEnd.value = String(state.endYearIndex);
  updateYearWindowLabel();
  updateAxis();
  calculateClimateSpectrum();
  calculateClimateSummaries();
  drawSurface();
  drawTimeline();
  drawClimateSpectrum();
  drawAnnualChart();
  drawSeasonalChart();
  if (typeof updateLiveDecoder === "function") updateLiveDecoder(record);
}

function calculateClimateSpectrum() {
  const records = visibleRecords();
  const runs = [];
  let currentRun = [];
  for (const record of records) {
    if (
      currentRun.length > 0 &&
      monthNumber(record) !== monthNumber(currentRun[currentRun.length - 1]) + 1
    ) {
      runs.push(currentRun);
      currentRun = [];
    }
    currentRun.push(record);
  }
  if (currentRun.length > 0) runs.push(currentRun);
  const longestRun = Math.max(0, ...runs.map((run) => run.length));
  const segmentLength = Math.min(256, 2 ** Math.floor(Math.log2(longestRun)));
  if (segmentLength < 32) {
    state.powerSpectrum = [];
    elements.spectrumWindowInfo.textContent =
      "Select a longer uninterrupted monthly range (at least 32 observations) to calculate the spectrum.";
    return;
  }

  const hop = segmentLength / 2;
  const sampleRate = 12;
  const windowValues = Array.from(
    { length: segmentLength },
    (_, index) => 0.5 * (1 - Math.cos((2 * Math.PI * index) / (segmentLength - 1))),
  );
  const windowEnergy = windowValues.reduce((sum, value) => sum + value * value, 0);
  const powers = new Float64Array(segmentLength / 2 + 1);
  let segmentCount = 0;

  for (const run of runs) {
    for (let start = 0; start + segmentLength <= run.length; start += hop) {
      const values = run.slice(start, start + segmentLength).map((record) => record.anomaly_celsius);
      const meanTime = (segmentLength - 1) / 2;
      const meanValue = values.reduce((sum, value) => sum + value, 0) / segmentLength;
      let numerator = 0;
      let denominator = 0;
      values.forEach((value, index) => {
        numerator += (index - meanTime) * (value - meanValue);
        denominator += (index - meanTime) ** 2;
      });
      const slope = denominator ? numerator / denominator : 0;
      const detrended = values.map(
        (value, index) => (value - meanValue - slope * (index - meanTime)) * windowValues[index],
      );
      const real = detrended;
      const imaginary = new Float64Array(segmentLength);
      fftInPlace(real, imaginary);

      for (let bin = 0; bin <= segmentLength / 2; bin += 1) {
        let power =
          (real[bin] * real[bin] + imaginary[bin] * imaginary[bin]) / (sampleRate * windowEnergy);
        if (bin !== 0 && bin !== segmentLength / 2) power *= 2;
        powers[bin] += power;
      }
      segmentCount += 1;
    }
  }

  state.powerSpectrum = Array.from(powers, (power, bin) => ({
    frequency: (bin * sampleRate) / segmentLength,
    density: segmentCount ? power / segmentCount : 0,
  }));
  elements.spectrumWindowInfo.textContent =
    `${segmentLength}-month Hann windows · ${hop}-month overlap · ${segmentCount} windows · ` +
    `Δf ${(sampleRate / segmentLength).toFixed(4)} cycles/year`;
}

function calculateClimateSummaries() {
  const records = visibleRecords();
  const annual = new Map();
  const monthly = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }));
  for (const record of records) {
    const summary = annual.get(record.year) || { sum: 0, count: 0 };
    summary.sum += record.anomaly_celsius;
    summary.count += 1;
    annual.set(record.year, summary);

    const month = monthly[record.month - 1];
    month.sum += record.anomaly_celsius;
    month.count += 1;
  }

  state.annualMeans = Array.from(annual, ([year, value]) => ({
    year,
    mean: value.sum / value.count,
    count: value.count,
  }));
  state.monthlyMeans = monthly.map((value, index) => ({
    month: index + 1,
    mean: value.count ? value.sum / value.count : null,
    count: value.count,
  }));

  const completeYears = state.annualMeans.filter((item) => item.count === 12);
  if (completeYears.length < 2) {
    elements.trendValue.textContent = "—";
    elements.trendNote.textContent = "Select at least two complete years to calculate a slope.";
    return;
  }
  elements.trendNote.textContent = "Partial years are shown, but excluded from the fit.";
  const count = completeYears.length;
  const meanYear = completeYears.reduce((sum, item) => sum + item.year, 0) / (count || 1);
  const meanAnomaly = completeYears.reduce((sum, item) => sum + item.mean, 0) / (count || 1);
  let covariance = 0;
  let variance = 0;
  for (const item of completeYears) {
    covariance += (item.year - meanYear) * (item.mean - meanAnomaly);
    variance += (item.year - meanYear) ** 2;
  }
  const slopePerDecade = variance ? (covariance / variance) * 10 : 0;
  elements.trendValue.textContent = `${slopePerDecade >= 0 ? "+" : ""}${slopePerDecade.toFixed(2)}`;
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
  elements.readingValue.firstChild.nodeValue = formatAnomaly(record.anomaly_celsius);
  elements.audioClock.textContent =
    `${String(state.index + 1).padStart(4, "0")} / ${state.records.length.toLocaleString()} · ${formatMonth(record)}`;
  elements.timeline.value = String(state.index);
  elements.surfaceReadout.textContent = `${formatMonth(record)} · ${formatAnomaly(record.anomaly_celsius)} °C`;
  updateLayerReadouts(record);
  drawSurface();
  drawTimeline();
  drawAnnualChart();
  drawSeasonalChart();
}

function interpolateColor(start, end, amount) {
  const left = start.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
  const right = end.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
  const channels = left.map((value, index) => Math.round(value + (right[index] - value) * amount));
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

function anomalyColor(value) {
  if (value < 0) {
    const ratio = Math.max(0, Math.min(1, value / state.minimum));
    return interpolateColor("#596173", "#51dce8", ratio);
  }
  const ratio = state.maximum > 0 ? Math.min(1, value / state.maximum) : 0;
  return interpolateColor("#596173", "#ff4667", ratio);
}

function drawSurface() {
  const canvas = elements.surfaceCanvas;
  const dimensions = setupCanvas(canvas);
  if (!dimensions || state.records.length === 0) return;
  const { context, width, height } = dimensions;
  const camera = state.camera;
  const { start, end } = visibleYearBounds();
  const yearSpan = Math.max(1, end - start);
  const anomalyScale = Math.max(Math.abs(state.minimum), Math.abs(state.maximum), 0.1);
  const scale = Math.min(width * 0.49, height * 0.76) * camera.zoom;
  const cosineYaw = Math.cos(camera.yaw);
  const sineYaw = Math.sin(camera.yaw);
  const cosinePitch = Math.cos(camera.pitch);
  const sinePitch = Math.sin(camera.pitch);
  const projected = [];

  function project(x, y, z) {
    const rotatedX = x * cosineYaw - y * sineYaw;
    const rotatedY = x * sineYaw + y * cosineYaw;
    const tiltedY = rotatedY * cosinePitch - z * sinePitch;
    const depth = rotatedY * sinePitch + z * cosinePitch;
    const perspective = 2.8 / (2.8 + depth * 0.2);
    return {
      x: width / 2 + camera.panX + rotatedX * scale * perspective,
      y: height * 0.53 + camera.panY - tiltedY * scale * perspective,
      depth,
    };
  }

  const records = visibleRecords();
  const lookup = new Map();
  const years = [];
  for (let year = start; year <= end; year += 1) years.push(year);
  for (const record of records) {
    const x = years.length === 1 ? 0 : -1 + ((record.year - start) / yearSpan) * 2;
    const y = -0.75 + ((record.month - 1) / 11) * 1.5;
    const z = (record.anomaly_celsius / anomalyScale) * 0.48;
    const point = { record, position: project(x, y, z) };
    lookup.set(`${record.year}-${record.month}`, point);
    projected.push(point);
  }
  state.surfacePoints = projected;

  context.clearRect(0, 0, width, height);
  const background = context.createRadialGradient(width * 0.5, height * 0.52, 12, width * 0.5, height * 0.52, height * 0.74);
  background.addColorStop(0, "rgba(36, 40, 59, 0.34)");
  background.addColorStop(1, "rgba(11, 12, 18, 0)");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  if (elements.showMesh.checked) {
    const faces = [];
    if (state.surfaceMode === "surface") {
      for (let year = start; year < end; year += 1) {
        for (let month = 1; month < 12; month += 1) {
          const a = lookup.get(`${year}-${month}`);
          const b = lookup.get(`${year + 1}-${month}`);
          const c = lookup.get(`${year}-${month + 1}`);
          const d = lookup.get(`${year + 1}-${month + 1}`);
          if (!a || !b || !c || !d) continue;
          if (monthNumber(b.record) !== monthNumber(a.record) + 12) continue;
          if (monthNumber(c.record) !== monthNumber(a.record) + 1) continue;
          if (monthNumber(d.record) !== monthNumber(b.record) + 1) continue;
          const cells = [
            [a, b, d],
            [a, d, c],
          ];
          for (const cell of cells) {
            const value = cell.reduce((sum, point) => sum + point.record.anomaly_celsius, 0) / cell.length;
            const depth = cell.reduce((sum, point) => sum + point.position.depth, 0) / cell.length;
            faces.push({ points: cell.map((point) => point.position), color: anomalyColor(value), depth });
          }
        }
      }
    } else {
      const yearSpacing = 2 / Math.max(years.length, 1);
      const monthSpacing = 1.5 / 12;
      for (const point of projected) {
        const { record } = point;
        const centerX = years.length === 1
          ? 0
          : -1 + ((record.year - start + 0.5) / years.length) * 2;
        const centerY = -0.75 + ((record.month - 0.5) / 12) * 1.5;
        const halfX = yearSpacing * 0.36;
        const halfY = monthSpacing * 0.36;
        const topZ = (record.anomaly_celsius / anomalyScale) * 0.48;
        const topCorners = [
          project(centerX - halfX, centerY - halfY, topZ),
          project(centerX + halfX, centerY - halfY, topZ),
          project(centerX + halfX, centerY + halfY, topZ),
          project(centerX - halfX, centerY + halfY, topZ),
        ];
        const baseCorners = [
          project(centerX - halfX, centerY - halfY, 0),
          project(centerX + halfX, centerY - halfY, 0),
          project(centerX + halfX, centerY + halfY, 0),
          project(centerX - halfX, centerY + halfY, 0),
        ];
        const quads = [
          [topCorners[0], topCorners[1], topCorners[2], topCorners[3]],
          [topCorners[0], topCorners[1], baseCorners[1], baseCorners[0]],
          [topCorners[1], topCorners[2], baseCorners[2], baseCorners[1]],
        ];
        for (const quad of quads) {
          const depth = quad.reduce((sum, vertex) => sum + vertex.depth, 0) / quad.length;
          faces.push({ points: quad, color: anomalyColor(record.anomaly_celsius), depth });
        }
      }
    }

    faces.sort((left, right) => left.depth - right.depth);
    for (const face of faces) {
      context.beginPath();
      context.moveTo(face.points[0].x, face.points[0].y);
      for (let index = 1; index < face.points.length; index += 1) {
        context.lineTo(face.points[index].x, face.points[index].y);
      }
      context.closePath();
      context.fillStyle = face.color;
      context.globalAlpha = state.surfaceMode === "surface" ? 0.83 : 0.72;
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = state.surfaceMode === "surface"
        ? "rgba(220, 228, 241, 0.13)"
        : "rgba(220, 228, 241, 0.08)";
      context.lineWidth = 0.55;
      context.stroke();
    }
  }

  const zeroLeft = project(-1, -0.75, 0);
  const zeroRight = project(1, -0.75, 0);
  context.beginPath();
  context.moveTo(zeroLeft.x, zeroLeft.y);
  context.lineTo(zeroRight.x, zeroRight.y);
  context.strokeStyle = "rgba(238, 241, 249, 0.42)";
  context.setLineDash([5, 5]);
  context.lineWidth = 1;
  context.stroke();
  context.setLineDash([]);

  if (elements.showPoints.checked) {
    for (const point of projected) {
      context.beginPath();
      context.arc(point.position.x, point.position.y, 1.15, 0, Math.PI * 2);
      context.fillStyle = anomalyColor(point.record.anomaly_celsius);
      context.globalAlpha = 0.76;
      context.fill();
      context.globalAlpha = 1;
    }
  }

  const selected = state.records[state.index];
  if (selected && selected.year >= start && selected.year <= end) {
    const point = lookup.get(`${selected.year}-${selected.month}`);
    if (point) {
      context.beginPath();
      context.arc(point.position.x, point.position.y, 6, 0, Math.PI * 2);
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1.5;
      context.stroke();
      context.beginPath();
      context.arc(point.position.x, point.position.y, 2.4, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.fill();
    }
  }

  context.fillStyle = "#9ca4b9";
  context.font = "10px Consolas, monospace";
  context.textAlign = "center";
  context.fillText("YEAR →", width * 0.5, height - 31);
  const monthAxis = project(-1, 0.75, 0);
  context.save();
  context.translate(monthAxis.x + 3, monthAxis.y - 7);
  context.rotate(-0.54);
  context.textAlign = "left";
  context.fillText("MONTH →", 0, 0);
  context.restore();
  context.textAlign = "right";
  context.fillText("ANOMALY (°C)", width - 18, 24);
  context.textAlign = "left";
  const yearTicks = [start, Math.round((start + end) / 2), end].filter((year, index, list) => list.indexOf(year) === index);
  for (const year of yearTicks) {
    const x = years.length === 1 ? 0 : -1 + ((year - start) / yearSpan) * 2;
    const tick = project(x, -0.75, 0);
    context.fillText(String(year), tick.x, tick.y + 16);
  }
  context.textAlign = "left";
  for (const item of [
    { month: 1, label: "JAN" },
    { month: 4, label: "APR" },
    { month: 7, label: "JUL" },
    { month: 10, label: "OCT" },
  ]) {
    const position = project(-1.02, -0.75 + ((item.month - 1) / 11) * 1.5, 0);
    context.fillText(item.label, position.x - 4, position.y - 5);
  }
  context.textAlign = "right";
  for (const value of [state.minimum, 0, state.maximum]) {
    const position = project(-1.02, -0.78, (value / anomalyScale) * 0.48);
    context.fillStyle = value < 0 ? "#70dbe7" : value > 0 ? "#ff8195" : "#c2c7d2";
    context.fillText(`${value > 0 ? "+" : ""}${value.toFixed(1)}°`, position.x - 5, position.y + 3);
  }
}

function closestSurfacePoint(x, y) {
  let closest = null;
  let distance = 25;
  for (const point of state.surfacePoints) {
    const currentDistance = Math.hypot(point.position.x - x, point.position.y - y);
    if (currentDistance < distance) {
      distance = currentDistance;
      closest = point;
    }
  }
  return closest;
}

function showSurfaceTooltip(point, clientX, clientY) {
  if (!point) {
    elements.surfaceTooltip.hidden = true;
    return;
  }
  elements.surfaceTooltip.textContent =
    `${formatMonth(point.record)}\n${formatAnomaly(point.record.anomaly_celsius)} °C anomaly`;
  const bounds = elements.surfaceCanvas.parentElement.getBoundingClientRect();
  elements.surfaceTooltip.style.left = `${Math.max(8, Math.min(bounds.width - 170, clientX - bounds.left + 12))}px`;
  elements.surfaceTooltip.style.top = `${Math.max(8, Math.min(bounds.height - 54, clientY - bounds.top + 10))}px`;
  elements.surfaceTooltip.hidden = false;
}

function drawTimeline() {
  const canvas = elements.chart;
  const dimensions = setupCanvas(canvas);
  if (!dimensions || state.records.length === 0) return;
  const { context, width, height } = dimensions;
  const records = visibleRecords();
  if (records.length === 0) return;

  const padding = { top: 28, right: 8, bottom: 16, left: 38 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const range = state.maximum - state.minimum || 1;
  const monthStart = monthNumber(records[0]);
  const monthEnd = monthNumber(records[records.length - 1]);
  const monthSpan = Math.max(monthEnd - monthStart, 1);
  const x = (record) => padding.left + ((monthNumber(record) - monthStart) / monthSpan) * plotWidth;
  const y = (value) => padding.top + ((state.maximum - value) / range) * plotHeight;
  const zeroY = state.minimum <= 0 && state.maximum >= 0 ? y(0) : null;

  context.clearRect(0, 0, width, height);
  if (zeroY !== null) {
    context.beginPath();
    context.setLineDash([3, 5]);
    context.strokeStyle = "rgba(220, 225, 238, 0.24)";
    context.moveTo(padding.left, zeroY);
    context.lineTo(width - padding.right, zeroY);
    context.stroke();
    context.setLineDash([]);
  }
  context.font = "8px Consolas, monospace";
  context.textAlign = "right";
  for (const value of [state.maximum, 0, state.minimum]) {
    if (value !== 0 && value > 0 && state.minimum > 0) continue;
    if (value !== 0 && value < 0 && state.maximum < 0) continue;
    const position = y(value);
    context.fillStyle = value === 0 ? "#a3aabc" : "#7f879a";
    context.fillText(`${value > 0 ? "+" : ""}${value.toFixed(1)}`, padding.left - 5, position + 3);
  }

  context.beginPath();
  let previousMonth = null;
  for (const record of records) {
    const currentMonth = monthNumber(record);
    if (previousMonth === null || currentMonth - previousMonth !== 1) {
      context.moveTo(x(record), y(record.anomaly_celsius));
    } else {
      context.lineTo(x(record), y(record.anomaly_celsius));
    }
    previousMonth = currentMonth;
  }
  context.strokeStyle = "#51dce8";
  context.lineWidth = 1.55;
  context.lineJoin = "round";
  context.stroke();

  const selected = state.records[state.index];
  if (selected && selected.year >= visibleYearBounds().start && selected.year <= visibleYearBounds().end) {
    const selectedX = x(selected);
    const selectedY = y(selected.anomaly_celsius);
    context.beginPath();
    context.moveTo(selectedX, padding.top);
    context.lineTo(selectedX, height - padding.bottom);
    context.strokeStyle = "rgba(255, 70, 103, 0.7)";
    context.lineWidth = 1;
    context.stroke();
    context.beginPath();
    context.arc(selectedX, selectedY, 4, 0, Math.PI * 2);
    context.fillStyle = "#ff4667";
    context.fill();
  }
}

function updateAxis() {
  const { start: firstYear, end: lastYear } = visibleYearBounds();
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

function updateLayerReadouts(record) {
  const normalized = normalizedValue(record);
  const frequency = MIN_FREQUENCY_HZ * Math.pow(2, normalized * PITCH_OCTAVES);
  const metrics = state.metrics[state.index];
  const pulseRate = metrics && metrics.change !== null ? 0.5 + metrics.changeNormalized * 5.5 : 0;
  const pulseCount = metrics && metrics.change !== null
    ? pulseHitCount(metrics, MONTH_DURATION_MS / Number(elements.speed.value) / 1000)
    : 0;
  const variability = metrics ? metrics.variability : null;
  const variabilityNormalized = metrics && variability !== null ? metrics.variabilityNormalized : 0;
  const cutoff = 350 + variabilityNormalized * 3650;
  elements.melodyValue.textContent = `${frequency.toFixed(1)} Hz`;
  elements.pulseValue.textContent = metrics && metrics.change !== null
    ? `${pulseRate.toFixed(2)} Hz · ${pulseCount} ${pulseCount === 1 ? "hit" : "hits"}`
    : "NO PRIOR MONTH";
  elements.atmosphereValue.textContent = variability === null
    ? "INSUFFICIENT HISTORY"
    : `σ ${variability.toFixed(3)} °C · ${Math.round(cutoff).toLocaleString()} Hz`;
  elements.melodyMeter.style.width = `${Math.min(100, (frequency / (MIN_FREQUENCY_HZ * 2 ** PITCH_OCTAVES)) * 100)}%`;
  elements.pulseMeter.style.width = `${metrics && metrics.change !== null ? metrics.changeNormalized * 100 : 0}%`;
  elements.atmosphereMeter.style.width = `${variability === null ? 0 : variabilityNormalized * 100}%`;
  for (const layer of LAYER_NAMES) {
    const name = INSTRUMENT_NAMES[layer][state.sound.instruments[layer]];
    const mapping = layer === "melody"
      ? "anomaly to pitch"
      : layer === "pulse"
        ? "monthly change to rhythm"
        : "variability to texture";
    elements.layerInstrumentNames[layer].textContent = `${name} · ${mapping}`;
  }
}

function drawClimateSpectrum() {
  const dimensions = setupCanvas(elements.climateSpectrumCanvas);
  if (!dimensions) return;
  const { context, width, height } = dimensions;
  const padding = { left: 48, right: 12, top: 14, bottom: 32 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  context.clearRect(0, 0, width, height);
  if (state.powerSpectrum.length === 0) {
    context.fillStyle = "#8b91a2";
    context.font = "11px sans-serif";
    context.fillText("Select at least 3 years of observations for a periodogram.", 16, height / 2);
    return;
  }

  const maximumFrequency = 6;
  const bins = state.powerSpectrum.filter((item) => item.frequency <= maximumFrequency);
  const positivePowers = bins.map((item) => item.density).filter((value) => value > 0);
  const minLog = Math.log10(Math.max(Math.min(...positivePowers), 1e-10));
  const maxLog = Math.log10(Math.max(...positivePowers, 1e-9));
  const x = (frequency) => padding.left + (frequency / maximumFrequency) * plotWidth;
  const y = (power) => {
    const logPower = Math.log10(Math.max(power, 10 ** minLog));
    const ratio = maxLog === minLog ? 0.5 : (logPower - minLog) / (maxLog - minLog);
    return padding.top + plotHeight * (1 - ratio);
  };

  context.font = "8px Consolas, monospace";
  context.textAlign = "right";
  for (let tick = 0; tick <= maximumFrequency; tick += 1) {
    const position = x(tick);
    context.beginPath();
    context.moveTo(position, padding.top);
    context.lineTo(position, height - padding.bottom);
    context.strokeStyle = "rgba(224, 229, 242, 0.07)";
    context.stroke();
    context.fillStyle = "#7e8597";
    context.textAlign = "center";
    context.fillText(String(tick), position, height - 12);
  }

  for (let tick = 0; tick <= 2; tick += 1) {
    const position = padding.top + (plotHeight * tick) / 2;
    context.beginPath();
    context.moveTo(padding.left, position);
    context.lineTo(width - padding.right, position);
    context.strokeStyle = "rgba(224, 229, 242, 0.08)";
    context.stroke();
  }

  context.beginPath();
  let hasPoint = false;
  for (const item of bins) {
    const px = x(item.frequency);
    const py = y(item.density);
    if (!hasPoint) {
      context.moveTo(px, py);
      hasPoint = true;
    } else {
      context.lineTo(px, py);
    }
  }
  context.strokeStyle = "#51dce8";
  context.lineWidth = 1.7;
  context.shadowColor = "rgba(81, 220, 232, 0.42)";
  context.shadowBlur = 7;
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = "#858c9d";
  context.textAlign = "center";
  context.fillText("FREQUENCY (CYCLES / YEAR)", width / 2, height - 1);
  context.save();
  context.translate(12, height / 2);
  context.rotate(-Math.PI / 2);
  context.fillText("PSD °C² / (CYCLE/YEAR) · LOG", 0, 0);
  context.restore();
  context.font = "7px Consolas, monospace";
  context.textAlign = "right";
  for (const logPower of [maxLog, (maxLog + minLog) / 2, minLog]) {
    const position = padding.top + ((maxLog - logPower) / (maxLog - minLog || 1)) * plotHeight;
    context.fillStyle = "#858c9d";
    context.fillText((10 ** logPower).toExponential(1), padding.left - 5, position + 3);
  }
}

function regressionFor(values) {
  if (values.length < 2) return { slope: 0, intercept: values[0]?.mean || 0 };
  const meanYear = values.reduce((sum, item) => sum + item.year, 0) / values.length;
  const meanValue = values.reduce((sum, item) => sum + item.mean, 0) / values.length;
  let covariance = 0;
  let variance = 0;
  for (const item of values) {
    covariance += (item.year - meanYear) * (item.mean - meanValue);
    variance += (item.year - meanYear) ** 2;
  }
  const slope = variance ? covariance / variance : 0;
  return { slope, intercept: meanValue - slope * meanYear };
}

function drawAnnualChart() {
  const dimensions = setupCanvas(elements.annualCanvas);
  if (!dimensions) return;
  const { context, width, height } = dimensions;
  const padding = { left: 38, right: 12, top: 12, bottom: 25 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  context.clearRect(0, 0, width, height);
  const values = state.annualMeans;
  if (!values.length) return;
  const valueMin = Math.min(state.minimum, 0);
  const valueMax = Math.max(state.maximum, 0);
  const valueRange = valueMax - valueMin || 1;
  const yearMin = values[0].year;
  const yearMax = values[values.length - 1].year;
  const yearRange = Math.max(1, yearMax - yearMin);
  const x = (year) => padding.left + ((year - yearMin) / yearRange) * plotWidth;
  const y = (value) => padding.top + ((valueMax - value) / valueRange) * plotHeight;
  const zeroY = y(0);

  context.font = "8px Consolas, monospace";
  context.textAlign = "right";
  for (let tick = 0; tick <= 4; tick += 1) {
    const position = padding.top + (plotHeight * tick) / 4;
    const value = valueMax - (valueRange * tick) / 4;
    context.beginPath();
    context.moveTo(padding.left, position);
    context.lineTo(width - padding.right, position);
    context.strokeStyle = Math.abs(value) < valueRange * 0.02
      ? "rgba(255,255,255,0.28)"
      : "rgba(224,229,242,0.07)";
    context.stroke();
    context.fillStyle = "#858c9d";
    context.fillText(value.toFixed(1), padding.left - 5, position + 3);
  }

  const barWidth = Math.max(1, Math.min(7, plotWidth / values.length * 0.58));
  for (const item of values) {
    const px = x(item.year);
    const py = y(item.mean);
    context.fillStyle = anomalyColor(item.mean);
    context.globalAlpha = item.year === state.records[state.index]?.year ? 1 : 0.75;
    context.fillRect(px - barWidth / 2, Math.min(py, zeroY), barWidth, Math.max(1, Math.abs(zeroY - py)));
    context.globalAlpha = 1;
  }

  const regressionValues = values.filter((item) => item.count === 12);
  const regression = regressionFor(regressionValues.length > 1 ? regressionValues : values);
  context.beginPath();
  context.moveTo(x(yearMin), y(regression.intercept + regression.slope * yearMin));
  context.lineTo(x(yearMax), y(regression.intercept + regression.slope * yearMax));
  context.strokeStyle = "#f4f3ef";
  context.lineWidth = 1.2;
  context.setLineDash([5, 4]);
  context.stroke();
  context.setLineDash([]);

  const selected = state.records[state.index];
  if (selected && selected.year >= yearMin && selected.year <= yearMax) {
    context.beginPath();
    context.moveTo(x(selected.year), padding.top);
    context.lineTo(x(selected.year), height - padding.bottom);
    context.strokeStyle = "#ff4667";
    context.lineWidth = 1;
    context.stroke();
  }
  context.fillStyle = "#858c9d";
  context.textAlign = "center";
  context.fillText(String(yearMin), x(yearMin), height - 6);
  context.fillText(String(yearMax), x(yearMax), height - 6);
  context.save();
  context.translate(10, height / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillText("ANNUAL MEAN ANOMALY (°C)", 0, 0);
  context.restore();
}

function drawSeasonalChart() {
  const dimensions = setupCanvas(elements.seasonalCanvas);
  if (!dimensions) return;
  const { context, width, height } = dimensions;
  context.clearRect(0, 0, width, height);
  const padding = { left: 9, right: 7, top: 8, bottom: 19 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const min = Math.min(state.minimum, 0);
  const max = Math.max(state.maximum, 0);
  const range = max - min || 1;
  const y = (value) => padding.top + ((max - value) / range) * plotHeight;
  const zeroY = y(0);
  context.beginPath();
  context.moveTo(padding.left, zeroY);
  context.lineTo(width - padding.right, zeroY);
  context.strokeStyle = "rgba(230,235,246,0.2)";
  context.setLineDash([3, 4]);
  context.stroke();
  context.setLineDash([]);
  const slot = plotWidth / 12;
  const selected = state.records[state.index];
  const { start, end } = visibleYearBounds();
  const selectedMonth = selected && selected.year >= start && selected.year <= end
    ? selected.month
    : null;
  state.monthlyMeans.forEach((item, index) => {
    if (item.mean === null) return;
    const barHeight = Math.abs(zeroY - y(item.mean));
    const barWidth = slot * 0.5;
    context.fillStyle = item.month === selectedMonth ? "#ff4667" : "#51dce8";
    context.globalAlpha = item.month === selectedMonth ? 1 : 0.72;
    context.fillRect(
      padding.left + slot * index + (slot - barWidth) / 2,
      Math.min(zeroY, y(item.mean)),
      barWidth,
      Math.max(1, barHeight),
    );
    context.globalAlpha = 1;
    context.fillStyle = "#82899a";
    context.font = "7px Consolas, monospace";
    context.textAlign = "center";
    context.fillText(String(item.month), padding.left + slot * (index + 0.5), height - 5);
  });
}

function selectNearestObservation(year, month) {
  let selectedIndex = state.index;
  let distance = Infinity;
  state.records.forEach((record, index) => {
    const currentDistance = Math.abs(record.year * 12 + record.month - (year * 12 + month));
    if (currentDistance < distance) {
      distance = currentDistance;
      selectedIndex = index;
    }
  });
  setSelectedIndex(selectedIndex, true);
  if (!state.playing) {
    setPlaybackStatus(`Selected ${formatMonth(state.records[selectedIndex])}. Press Play Earth to listen.`);
  }
}

function setSelectedIndex(index, soundIfPlaying) {
  stopActiveNotes();
  state.index = Math.max(0, Math.min(index, state.records.length - 1));
  state.lastSoundedIndex = -1;
  updateReading();
  if (state.playing && soundIfPlaying) {
    playCurrentRecord();
    scheduleNext();
    setPlaybackStatus(`Playing ${formatMonth(state.records[state.index])}.`);
  }
}

function computeObservationMetrics(records) {
  const metrics = records.map((record, index) => {
    const previous = records[index - 1];
    const isConsecutive = previous && monthNumber(record) - monthNumber(previous) === 1;
    const change = isConsecutive ? Math.abs(record.anomaly_celsius - previous.anomaly_celsius) : null;
    const window = [];
    for (let cursor = index; cursor >= 0 && window.length < 12; cursor -= 1) {
      if (cursor < index && monthNumber(records[cursor + 1]) - monthNumber(records[cursor]) !== 1) break;
      window.push(records[cursor].anomaly_celsius);
    }
    let variability = null;
    if (window.length >= 2) {
      const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
      variability = Math.sqrt(window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / window.length);
    }
    return { change, changeNormalized: 0, variability, variabilityNormalized: 0 };
  });

  state.maxMonthlyChange = Math.max(0, ...metrics.map((item) => item.change || 0));
  state.maxVariability = Math.max(0, ...metrics.map((item) => item.variability || 0));
  for (const item of metrics) {
    item.changeNormalized = item.change === null || state.maxMonthlyChange === 0
      ? 0
      : item.change / state.maxMonthlyChange;
    item.variabilityNormalized = item.variability === null || state.maxVariability === 0
      ? 0
      : item.variability / state.maxVariability;
  }
  state.metrics = metrics;
}

function pulseHitCount(metrics, intervalSeconds) {
  if (!metrics || metrics.change === null || metrics.change === 0) return 0;
  const rate = 0.5 + metrics.changeNormalized * 5.5;
  return Math.min(4, Math.max(1, Math.floor(intervalSeconds * rate)));
}

function normalizedValue(record) {
  const range = state.maximum - state.minimum;
  return range === 0 ? 0.5 : (record.anomaly_celsius - state.minimum) / range;
}

function setSmoothGain(gain, value, timeConstant) {
  if (!gain || !state.audioContext) return;
  const now = state.audioContext.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(Math.max(0, value), now, timeConstant);
}

function makeReverbBuffer(context) {
  const length = Math.floor(context.sampleRate * 1.35);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const progress = index / length;
      const deterministicNoise =
        Math.sin(index * 12.9898 + channel * 78.233) * 0.5 +
        Math.sin(index * 4.1414 + channel * 21.17) * 0.25;
      data[index] = deterministicNoise * (1 - progress) ** 2.8;
    }
  }
  return buffer;
}

function ensureAudioGraph(context) {
  state.masterGain = context.createGain();
  state.compressor = context.createDynamicsCompressor();
  state.compressor.threshold.value = -18;
  state.compressor.knee.value = 12;
  state.compressor.ratio.value = 8;
  state.compressor.attack.value = 0.003;
  state.compressor.release.value = 0.18;
  state.analyser = context.createAnalyser();
  state.analyser.fftSize = 2048;
  state.analyser.smoothingTimeConstant = 0.72;
  state.masterGain.connect(state.compressor);
  state.compressor.connect(state.analyser);
  state.analyser.connect(context.destination);

  for (const layer of LAYER_NAMES) {
    const gain = context.createGain();
    state.layerGains[layer] = gain;
    gain.connect(state.masterGain);
  }

  const convolver = context.createConvolver();
  convolver.buffer = makeReverbBuffer(context);
  state.reverbInput = context.createGain();
  state.reverbWet = context.createGain();
  state.reverbInput.connect(convolver);
  convolver.connect(state.reverbWet);
  state.reverbWet.connect(state.masterGain);
  for (const layer of LAYER_NAMES) state.layerGains[layer].connect(state.reverbInput);

  state.delayNode = context.createDelay(1);
  state.delayNode.delayTime.value = 0.24;
  state.delayFeedback = context.createGain();
  state.delayFeedback.gain.value = 0.18;
  state.delayWet = context.createGain();
  state.delayNode.connect(state.delayFeedback);
  state.delayFeedback.connect(state.delayNode);
  state.delayNode.connect(state.delayWet);
  state.delayWet.connect(state.masterGain);
  for (const layer of LAYER_NAMES) state.layerGains[layer].connect(state.delayNode);

  state.previewGain = context.createGain();
  state.previewGain.gain.value = 0.7;
  state.previewGain.connect(state.masterGain);
  state.previewGain.connect(state.reverbInput);
  state.previewGain.connect(state.delayNode);
  state.waveformData = new Uint8Array(state.analyser.fftSize);
  state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
  updateAudioRouting();
}

function ensureAudio() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error("Web Audio is not available in this browser.");
  }
  if (!state.audioContext) {
    state.audioContext = new AudioContextConstructor();
    ensureAudioGraph(state.audioContext);
  }
  return state.audioContext.resume();
}

const SYNTHESIZERS = {
  melody: {
    piano: { partials: [[1, "triangle", 1], [2, "sine", 0.24]], attack: 0.012, peak: 0.48, cutoff: 4 },
    "synth-lead": { partials: [[1, "sawtooth", 0.8], [2, "triangle", 0.16]], attack: 0.035, peak: 0.38, cutoff: 3.2 },
    bell: { partials: [[1, "sine", 1], [2.76, "sine", 0.24], [5.4, "sine", 0.07]], attack: 0.004, peak: 0.52, cutoff: 8 },
    "soft-strings": { partials: [[0.996, "sawtooth", 0.42], [1.004, "sawtooth", 0.42], [2, "triangle", 0.12]], attack: 0.09, peak: 0.34, cutoff: 2.8 },
    mallet: { partials: [[1, "sine", 1], [3.1, "triangle", 0.15]], attack: 0.005, peak: 0.5, cutoff: 6 },
  },
  pulse: {
    "soft-percussion": { frequency: 92, partials: [[1, "sine", 1], [2.2, "triangle", 0.12]], attack: 0.003, peak: 0.65, cutoff: 4 },
    "electronic-percussion": { frequency: 108, partials: [[1, "triangle", 0.8], [1.5, "square", 0.12]], attack: 0.002, peak: 0.52, cutoff: 5 },
    "wooden-ticks": { frequency: 520, partials: [[1, "sine", 1], [2.4, "sine", 0.15]], attack: 0.002, peak: 0.38, cutoff: 3 },
    heartbeat: { frequency: 58, partials: [[1, "sine", 1], [2, "triangle", 0.12]], attack: 0.01, peak: 0.55, cutoff: 4 },
    "minimal-beat": { frequency: 132, partials: [[1, "triangle", 0.9], [2.1, "sine", 0.1]], attack: 0.002, peak: 0.46, cutoff: 4 },
  },
  atmosphere: {
    "ambient-pad": { partials: [[1, "triangle", 0.8], [1.5, "sine", 0.18], [2, "sine", 0.12]], attack: 0.12, peak: 0.34, cutoff: 7 },
    "atmospheric-strings": { partials: [[0.997, "sawtooth", 0.36], [1.003, "sawtooth", 0.36], [2, "triangle", 0.2]], attack: 0.1, peak: 0.3, cutoff: 4 },
    "harmonic-drone": { partials: [[1, "sine", 0.75], [2, "sine", 0.26], [3, "triangle", 0.12]], attack: 0.09, peak: 0.32, cutoff: 5 },
    "evolving-texture": { partials: [[1, "sawtooth", 0.38], [1.5, "triangle", 0.28], [2.5, "sine", 0.16]], attack: 0.11, peak: 0.3, cutoff: 6 },
    "cinematic-texture": { partials: [[1, "triangle", 0.65], [1.5, "sine", 0.24], [2, "sawtooth", 0.12]], attack: 0.13, peak: 0.3, cutoff: 5 },
  },
};

function scheduleTone(layer, instrument, frequency, duration, intensity, at, richness, destination) {
  const context = state.audioContext;
  const synth = SYNTHESIZERS[layer][instrument];
  if (!context || !synth || !destination) return;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(
    layer === "atmosphere" ? 350 + richness * 3650 : Math.min(9000, Math.max(500, frequency * synth.cutoff)),
    at,
  );
  filter.Q.setValueAtTime(layer === "atmosphere" ? 0.9 + richness * 2.2 : 0.75, at);
  const envelope = context.createGain();
  const peak = Math.max(0.0002, synth.peak * intensity);
  const attack = Math.min(synth.attack, duration * 0.42);
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(peak, at + Math.max(0.002, attack));
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(attack + 0.01, duration));
  filter.connect(envelope);
  envelope.connect(destination);

  const oscillators = [];
  const partialGains = [];
  for (const [ratio, type, partialLevel] of synth.partials) {
    const oscillator = context.createOscillator();
    const partialGain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency * ratio), at);
    const richnessScale = layer === "atmosphere" && ratio !== 1
      ? 0.25 + richness * 0.75
      : 1;
    partialGain.gain.value = partialLevel * richnessScale;
    oscillator.connect(partialGain);
    partialGain.connect(filter);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.025);
    oscillators.push(oscillator);
    partialGains.push(partialGain);
  }

  const note = { oscillators, nodes: [filter, envelope, ...partialGains], envelope, remaining: oscillators.length };
  state.activeNotes.add(note);
  for (const oscillator of oscillators) {
    oscillator.onended = () => {
      note.remaining -= 1;
      if (note.remaining !== 0) return;
      state.activeNotes.delete(note);
      for (const node of note.nodes) node.disconnect();
    };
  }
}

function playCurrentRecord() {
  const record = state.records[state.index];
  const context = state.audioContext;
  const metrics = state.metrics[state.index];
  if (!record || !context || !metrics) return;

  const now = context.currentTime;
  const interval = MONTH_DURATION_MS / Number(elements.speed.value) / 1000;
  const duration = Math.min(0.42, interval * 0.84);
  const frequency = MIN_FREQUENCY_HZ * Math.pow(2, normalizedValue(record) * PITCH_OCTAVES);
  const melody = state.sound.instruments.melody;
  scheduleTone("melody", melody, frequency, duration, 1, now, 0.5, state.layerGains.melody);

  if (metrics.change !== null && metrics.change > 0) {
    const pulseRate = 0.5 + metrics.changeNormalized * 5.5;
    const hitCount = pulseHitCount(metrics, interval);
    const instrument = state.sound.instruments.pulse;
    const pulseFrequency = SYNTHESIZERS.pulse[instrument].frequency;
    const pulseDuration = Math.min(0.16, interval * 0.32);
    const intensity = 0.18 + metrics.changeNormalized * 0.52;
    for (let hit = 0; hit < hitCount; hit += 1) {
      const at = now + hit / pulseRate;
      scheduleTone("pulse", instrument, pulseFrequency, pulseDuration, intensity, at, 0.5, state.layerGains.pulse);
      if (instrument === "heartbeat" && at + 0.12 < now + interval) {
        scheduleTone("pulse", instrument, pulseFrequency * 0.88, pulseDuration * 0.82, intensity * 0.72, at + 0.12, 0.5, state.layerGains.pulse);
      }
    }
  }

  if (metrics.variability !== null) {
    const instrument = state.sound.instruments.atmosphere;
    scheduleTone(
      "atmosphere",
      instrument,
      110,
      duration,
      0.4 + metrics.variabilityNormalized * 0.45,
      now,
      metrics.variabilityNormalized,
      state.layerGains.atmosphere,
    );
  }
  state.lastSoundedIndex = state.index;
}

function stopActiveNotes() {
  if (!state.audioContext) return;
  const now = state.audioContext.currentTime;
  for (const note of state.activeNotes) {
    note.envelope.gain.cancelScheduledValues(now);
    note.envelope.gain.setTargetAtTime(0.0001, now, 0.008);
    for (const oscillator of note.oscillators) {
      try {
        oscillator.stop(now + 0.035);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "InvalidStateError")) throw error;
      }
    }
  }
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
    startAudioVisuals();
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
  stopActiveNotes();
  state.lastSoundedIndex = -1;
  updatePlayButton();
  setPlaybackStatus(`Paused at ${formatMonth(state.records[state.index])}.`);
}

function stopPlayback() {
  state.playing = false;
  clearTimer();
  stopActiveNotes();
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
  setMasterVolume(Number(elements.volume.value));
}

function setMasterVolume(value) {
  state.sound.master = Math.max(0, Math.min(1, value));
  elements.volume.value = String(state.sound.master);
  elements.studioMasterVolume.value = String(state.sound.master);
  document.querySelector("#studio-master-value").textContent = `${Math.round(state.sound.master * 100)}%`;
  updateAudioRouting();
}

function updateAudioRouting() {
  if (!state.audioContext) return;
  for (const layer of LAYER_NAMES) {
    const config = state.sound.layers[layer];
    const audible = config.enabled && (!state.sound.solo || state.sound.solo === layer);
    setSmoothGain(state.layerGains[layer], audible ? config.volume : 0, 0.035);
  }
  setSmoothGain(state.masterGain, state.sound.muted ? 0 : state.sound.master * 0.36, 0.035);
  setSmoothGain(state.reverbWet, state.sound.reverb.enabled ? state.sound.reverb.amount : 0, 0.08);
  setSmoothGain(state.delayWet, state.sound.delay.enabled ? state.sound.delay.amount : 0, 0.08);
}

function updateStudioUI() {
  elements.soundPalette.value = state.sound.palette;
  elements.paletteDescription.textContent = SOUND_PALETTES[state.sound.palette]
    ? SOUND_PALETTES[state.sound.palette].description
    : "Custom sound design. Scientific mappings remain unchanged.";
  elements.muteButton.textContent = state.sound.muted ? "Unmute" : "Mute";
  elements.muteButton.setAttribute("aria-pressed", String(state.sound.muted));

  for (const layer of LAYER_NAMES) {
    const config = state.sound.layers[layer];
    elements.layerInstruments[layer].value = state.sound.instruments[layer];
    elements.layerLevels[layer].value = String(config.volume);
    elements.layerLevelValues[layer].textContent = `${Math.round(config.volume * 100)}%`;
    elements.layerEnabled[layer].checked = config.enabled;
  }
  for (const button of elements.soloButtons) {
    const soloed = state.sound.solo === button.dataset.soloLayer;
    button.textContent = soloed ? "Unsolo" : "Solo";
    button.setAttribute("aria-pressed", String(soloed));
  }
  elements.reverbEnabled.checked = state.sound.reverb.enabled;
  elements.reverbLevel.value = String(state.sound.reverb.amount);
  elements.reverbLevelValue.textContent = `${Math.round(state.sound.reverb.amount * 100)}%`;
  elements.delayEnabled.checked = state.sound.delay.enabled;
  elements.delayLevel.value = String(state.sound.delay.amount);
  elements.delayLevelValue.textContent = `${Math.round(state.sound.delay.amount * 100)}%`;
}

function applySoundPalette(paletteName) {
  const palette = SOUND_PALETTES[paletteName];
  if (!palette) {
    state.sound.palette = "custom";
    updateStudioUI();
    return;
  }
  state.sound.palette = paletteName;
  state.sound.instruments = { ...palette.instruments };
  for (const layer of LAYER_NAMES) {
    state.sound.layers[layer].volume = palette.levels[layer];
  }
  state.sound.reverb = { enabled: palette.reverb > 0, amount: palette.reverb };
  state.sound.delay = { enabled: palette.delay > 0, amount: palette.delay };
  updateStudioUI();
  updateAudioRouting();
  if (state.records.length) updateLayerReadouts(state.records[state.index]);
}

function resetSoundConfiguration() {
  state.sound.palette = "scientific";
  state.sound.instruments = { ...SOUND_PALETTES.scientific.instruments };
  state.sound.solo = null;
  state.sound.muted = false;
  state.sound.master = 0.55;
  for (const layer of LAYER_NAMES) {
    state.sound.layers[layer] = { enabled: true, volume: SOUND_PALETTES.scientific.levels[layer] };
  }
  state.sound.reverb = { enabled: false, amount: 0 };
  state.sound.delay = { enabled: false, amount: 0 };
  setMasterVolume(state.sound.master);
  updateStudioUI();
  updateAudioRouting();
  if (state.records.length) updateLayerReadouts(state.records[state.index]);
}

async function previewLayer(layer, button) {
  try {
    await ensureAudio();
    startAudioVisuals();
    const instrument = state.sound.instruments[layer];
    const frequency = layer === "melody"
      ? state.records.length
        ? MIN_FREQUENCY_HZ * Math.pow(2, normalizedValue(state.records[state.index]) * PITCH_OCTAVES)
        : 440
      : layer === "pulse"
        ? SYNTHESIZERS.pulse[instrument].frequency
        : 110;
    const duration = layer === "pulse" ? 0.22 : 0.85;
    const intensity = layer === "pulse" ? 0.68 : 0.8;
    const now = state.audioContext.currentTime + 0.015;
    scheduleTone(layer, instrument, frequency, duration, intensity, now, 0.6, state.previewGain);
    if (layer === "pulse" && instrument === "heartbeat") {
      scheduleTone(layer, instrument, frequency * 0.88, 0.18, 0.48, now + 0.12, 0.6, state.previewGain);
    }
    button.textContent = "Playing preview";
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = "Preview";
      button.disabled = false;
    }, 1000);
  } catch (error) {
    setPlaybackStatus(error.message || "Sound preview could not be started.", true);
  }
}

function drawWaveform() {
  const dimensions = setupCanvas(elements.waveformCanvas);
  if (!dimensions || !state.analyser || !state.waveformData) return;
  const { context, width, height } = dimensions;
  state.analyser.getByteTimeDomainData(state.waveformData);
  context.clearRect(0, 0, width, height);
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.strokeStyle = "rgba(227,232,245,0.12)";
  context.stroke();
  context.beginPath();
  state.waveformData.forEach((value, index) => {
    const x = (index / (state.waveformData.length - 1)) * width;
    const y = (value / 255) * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = "#51dce8";
  context.lineWidth = 1.4;
  context.shadowColor = "rgba(81,220,232,0.35)";
  context.shadowBlur = 5;
  context.stroke();
  context.shadowBlur = 0;
}

function drawAudioSpectrum() {
  const dimensions = setupCanvas(elements.audioSpectrumCanvas);
  if (!dimensions || !state.analyser || !state.frequencyData) return;
  const { context, width, height } = dimensions;
  state.analyser.getByteFrequencyData(state.frequencyData);
  context.clearRect(0, 0, width, height);
  context.beginPath();
  for (let x = 0; x < width; x += 1) {
    const frequency = (x / width) * 4000;
    const bin = Math.min(
      state.frequencyData.length - 1,
      Math.round((frequency * state.analyser.fftSize) / state.audioContext.sampleRate),
    );
    const level = state.frequencyData[bin] / 255;
    const y = height - level * height * 0.92;
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255,70,103,0.48)");
  gradient.addColorStop(1, "rgba(81,220,232,0.06)");
  context.fillStyle = gradient;
  context.fill();
  context.beginPath();
  for (let x = 0; x < width; x += 1) {
    const frequency = (x / width) * 4000;
    const bin = Math.min(
      state.frequencyData.length - 1,
      Math.round((frequency * state.analyser.fftSize) / state.audioContext.sampleRate),
    );
    const y = height - (state.frequencyData[bin] / 255) * height * 0.92;
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = "#ff6b85";
  context.lineWidth = 1.1;
  context.stroke();
}

function drawAudioSpectrogramRow() {
  const dimensions = setupCanvas(elements.spectrogramCanvas);
  if (!dimensions || !state.analyser || !state.frequencyData) return;
  const { context, width, height } = dimensions;
  state.analyser.getByteFrequencyData(state.frequencyData);
  context.drawImage(elements.spectrogramCanvas, 0, 0, width, height - 1);
  const maxBin = Math.min(
    state.frequencyData.length - 1,
    Math.floor((4000 * state.analyser.fftSize) / state.audioContext.sampleRate),
  );
  for (let x = 0; x < width; x += 1) {
    const bin = Math.min(maxBin, Math.round((x / Math.max(1, width - 1)) * maxBin));
    const intensity = state.frequencyData[bin] / 255;
    if (intensity < 0.045) {
      context.fillStyle = "#11141d";
    } else if (intensity < 0.52) {
      context.fillStyle = interpolateColor("#14202a", "#43cbdc", (intensity - 0.045) / 0.475);
    } else {
      context.fillStyle = interpolateColor("#43cbdc", "#ff4667", (intensity - 0.52) / 0.48);
    }
    context.fillRect(x, 0, 1, 1);
  }
}

function animateAudioVisuals(timestamp) {
  state.audioFrame = null;
  if (!state.analyser) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion || timestamp - (state.lastAudioDraw || 0) > 180) {
    drawWaveform();
    drawAudioSpectrum();
    drawAudioSpectrogramRow();
    state.lastAudioDraw = timestamp;
  }

  if (state.playing || state.activeNotes.size > 0) {
    state.audioFrame = window.requestAnimationFrame(animateAudioVisuals);
  } else {
    elements.audioSignalState.textContent = "AUDIO IDLE";
    elements.audioSignalState.classList.remove("is-live");
  }
}

function startAudioVisuals() {
  if (!state.audioFrame) {
    elements.audioSignalState.textContent = "LIVE OUTPUT";
    elements.audioSignalState.classList.add("is-live");
    state.audioFrame = window.requestAnimationFrame(animateAudioVisuals);
  }
}

function toggleFullscreen(panel) {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch((error) => {
      setPlaybackStatus(`Could not exit full screen: ${error.message}`, true);
    });
    return;
  }
  if (panel.requestFullscreen) {
    panel.requestFullscreen().catch((error) => {
      setPlaybackStatus(`Full screen is unavailable: ${error.message}`, true);
    });
  } else {
    setPlaybackStatus("Full screen is not supported by this browser.", true);
  }
}

function enableControls() {
  elements.timeline.max = String(state.records.length - 1);
  elements.timeline.disabled = false;
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.speed.disabled = false;
  elements.volume.disabled = false;
  elements.studioMasterVolume.disabled = false;
  elements.soundPalette.disabled = false;
  elements.muteButton.disabled = false;
  elements.resetSound.disabled = false;
  elements.reverbEnabled.disabled = false;
  elements.reverbLevel.disabled = false;
  elements.delayEnabled.disabled = false;
  elements.delayLevel.disabled = false;
  for (const layer of LAYER_NAMES) {
    elements.layerInstruments[layer].disabled = false;
    elements.layerLevels[layer].disabled = false;
    elements.layerEnabled[layer].disabled = false;
  }
  for (const button of [...elements.soloButtons, ...elements.previewButtons]) button.disabled = false;
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
    computeObservationMetrics(state.records);
    state.years = [...new Set(state.records.map((record) => record.year))];
    state.startYearIndex = 0;
    state.endYearIndex = state.years.length - 1;

    const first = state.records[0];
    const last = state.records[state.records.length - 1];
    elements.range.textContent = `${first.year} — ${last.year}`;
    elements.timelineHintEnd.textContent = `${state.records.length.toLocaleString()} observations`;
    elements.timelineEnd.textContent = String(last.year);
    elements.observationCount.textContent = state.records.length.toLocaleString();
    elements.legendMinimum.textContent = `${formatAnomaly(minimum)}°`;
    elements.legendMaximum.textContent = `${formatAnomaly(maximum)}°`;
    elements.yearStart.min = "0";
    elements.yearStart.max = String(state.years.length - 1);
    elements.yearStart.value = "0";
    elements.yearStart.disabled = false;
    elements.yearEnd.min = "0";
    elements.yearEnd.max = String(state.years.length - 1);
    elements.yearEnd.value = String(state.years.length - 1);
    elements.yearEnd.disabled = false;
    updateYearWindowLabel();
    updateAxis();
    updateStudioUI();
    enableControls();
    calculateClimateSpectrum();
    calculateClimateSummaries();
    updateReading();
    drawClimateSpectrum();
    setStatus("NASA data ready", "ready");
    setPlaybackStatus(`Ready · ${state.records.length.toLocaleString()} monthly observations · ${formatMonth(first)} to ${formatMonth(last)}.`);
    if (typeof initInnovativeFeatures === "function") initInnovativeFeatures();
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
  if (state.records.length) updateReading();
  if (state.playing) scheduleNext();
});
elements.volume.addEventListener("input", updateVolume);
elements.studioMasterVolume.addEventListener("input", (event) => {
  setMasterVolume(Number(event.currentTarget.value));
});
elements.soundPalette.addEventListener("change", () => {
  applySoundPalette(elements.soundPalette.value);
});
elements.muteButton.addEventListener("click", () => {
  state.sound.muted = !state.sound.muted;
  updateStudioUI();
  updateAudioRouting();
});
elements.resetSound.addEventListener("click", resetSoundConfiguration);
for (const layer of LAYER_NAMES) {
  elements.layerInstruments[layer].addEventListener("change", (event) => {
    state.sound.instruments[layer] = event.currentTarget.value;
    state.sound.palette = "custom";
    updateStudioUI();
    if (state.records.length) updateLayerReadouts(state.records[state.index]);
  });
  elements.layerLevels[layer].addEventListener("input", (event) => {
    state.sound.layers[layer].volume = Number(event.currentTarget.value);
    state.sound.palette = "custom";
    updateStudioUI();
    updateAudioRouting();
  });
  elements.layerEnabled[layer].addEventListener("change", (event) => {
    state.sound.layers[layer].enabled = event.currentTarget.checked;
    state.sound.palette = "custom";
    updateStudioUI();
    updateAudioRouting();
  });
}
for (const button of elements.soloButtons) {
  button.addEventListener("click", () => {
    const layer = button.dataset.soloLayer;
    state.sound.solo = state.sound.solo === layer ? null : layer;
    updateStudioUI();
    updateAudioRouting();
  });
}
for (const button of elements.previewButtons) {
  button.addEventListener("click", () => {
    previewLayer(button.dataset.previewLayer, button);
  });
}
elements.reverbEnabled.addEventListener("change", () => {
  state.sound.reverb.enabled = elements.reverbEnabled.checked;
  state.sound.palette = "custom";
  updateStudioUI();
  updateAudioRouting();
});
elements.reverbLevel.addEventListener("input", () => {
  state.sound.reverb.amount = Number(elements.reverbLevel.value);
  state.sound.palette = "custom";
  updateStudioUI();
  updateAudioRouting();
});
elements.delayEnabled.addEventListener("change", () => {
  state.sound.delay.enabled = elements.delayEnabled.checked;
  state.sound.palette = "custom";
  updateStudioUI();
  updateAudioRouting();
});
elements.delayLevel.addEventListener("input", () => {
  state.sound.delay.amount = Number(elements.delayLevel.value);
  state.sound.palette = "custom";
  updateStudioUI();
  updateAudioRouting();
});
elements.surfaceMode.addEventListener("change", () => {
  state.surfaceMode = elements.surfaceMode.value;
  drawSurface();
});
elements.surfaceReset.addEventListener("click", () => {
  state.camera = { yaw: -0.52, pitch: 0.88, zoom: 1, panX: 0, panY: 0 };
  drawSurface();
});
elements.surfaceFullscreen.addEventListener("click", () => {
  toggleFullscreen(document.querySelector("#climate-surface-panel"));
});
elements.showMesh.addEventListener("change", drawSurface);
elements.showPoints.addEventListener("change", drawSurface);
elements.yearStart.addEventListener("input", () => {
  setYearWindow(Number(elements.yearStart.value), state.endYearIndex);
});
elements.yearEnd.addEventListener("input", () => {
  setYearWindow(state.startYearIndex, Number(elements.yearEnd.value));
});
document.querySelectorAll("[data-fullscreen]").forEach((button) => {
  button.addEventListener("click", () => {
    toggleFullscreen(document.getElementById(button.dataset.fullscreen));
  });
});
document.addEventListener("fullscreenchange", () => {
  window.requestAnimationFrame(() => {
    drawSurface();
    drawTimeline();
    drawClimateSpectrum();
    drawAnnualChart();
    drawSeasonalChart();
  });
});

let surfaceDrag = null;
elements.surfaceCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
elements.surfaceCanvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  surfaceDrag = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
    pan: event.shiftKey || event.button === 1 || event.button === 2,
  };
  elements.surfaceCanvas.setPointerCapture(event.pointerId);
});
elements.surfaceCanvas.addEventListener("pointermove", (event) => {
  const bounds = elements.surfaceCanvas.getBoundingClientRect();
  if (surfaceDrag && surfaceDrag.pointerId === event.pointerId) {
    const deltaX = event.clientX - surfaceDrag.lastX;
    const deltaY = event.clientY - surfaceDrag.lastY;
    if (Math.hypot(event.clientX - surfaceDrag.x, event.clientY - surfaceDrag.y) > 3) {
      surfaceDrag.moved = true;
    }
    if (surfaceDrag.pan) {
      state.camera.panX += deltaX;
      state.camera.panY += deltaY;
    } else {
      state.camera.yaw += deltaX * 0.008;
      state.camera.pitch = Math.max(0.16, Math.min(1.48, state.camera.pitch + deltaY * 0.006));
    }
    surfaceDrag.lastX = event.clientX;
    surfaceDrag.lastY = event.clientY;
    drawSurface();
    elements.surfaceTooltip.hidden = true;
    return;
  }
  const point = closestSurfacePoint(event.clientX - bounds.left, event.clientY - bounds.top);
  showSurfaceTooltip(point, event.clientX, event.clientY);
});
elements.surfaceCanvas.addEventListener("pointerup", (event) => {
  if (!surfaceDrag || surfaceDrag.pointerId !== event.pointerId) return;
  if (!surfaceDrag.moved) {
    const bounds = elements.surfaceCanvas.getBoundingClientRect();
    const point = closestSurfacePoint(event.clientX - bounds.left, event.clientY - bounds.top);
    if (point) {
      const index = state.records.indexOf(point.record);
      setSelectedIndex(index, true);
    }
  }
  surfaceDrag = null;
});
elements.surfaceCanvas.addEventListener("pointercancel", () => {
  surfaceDrag = null;
});
elements.surfaceCanvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  state.camera.zoom = Math.max(0.65, Math.min(2.6, state.camera.zoom * (event.deltaY < 0 ? 1.08 : 0.92)));
  drawSurface();
}, { passive: false });

elements.annualCanvas.addEventListener("click", (event) => {
  const bounds = elements.annualCanvas.getBoundingClientRect();
  const padding = { left: 38, right: 12 };
  const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left - padding.left) / (bounds.width - padding.left - padding.right)));
  if (state.annualMeans.length) {
    const year = Math.round(
      state.annualMeans[0].year + ratio * (state.annualMeans[state.annualMeans.length - 1].year - state.annualMeans[0].year),
    );
    selectNearestObservation(year, state.records[state.index].month);
  }
});
elements.seasonalCanvas.addEventListener("click", (event) => {
  const bounds = elements.seasonalCanvas.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(0.999, (event.clientX - bounds.left - 9) / (bounds.width - 16)));
  const month = Math.floor(ratio * 12) + 1;
  selectNearestObservation(state.records[state.index].year, month);
});

window.addEventListener("resize", () => {
  updateAxis();
  drawSurface();
  drawTimeline();
  drawClimateSpectrum();
  drawAnnualChart();
  drawSeasonalChart();
  if (state.analyser) {
    drawWaveform();
    drawAudioSpectrum();
    drawAudioSpectrogramRow();
  }
  if (typeof drawComparisonChart === "function") drawComparisonChart();
});

window.addEventListener("pagehide", () => {
  clearTimer();
  if (state.audioFrame) window.cancelAnimationFrame(state.audioFrame);
  if (state.audioContext && state.audioContext.state !== "closed") {
    state.audioContext.close().catch((error) => {
      console.error("Could not close the Web Audio context cleanly.", error);
    });
  }
});

updateStudioUI();
loadDataset();


// ══════════════════════════════════════════════════════════════════
// EARTH JUKEBOX — INNOVATIVE EXPANSION ENGINE
// ══════════════════════════════════════════════════════════════════

(function initEarthJukeboxExtensions() {
  // ───────────────────────────────────────────────────────────────
  // AUDIO HELPER: 16-BIT PCM WAV EXPORTER
  // ───────────────────────────────────────────────────────────────
  function audioBufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const length = buffer.length;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const headerSize = 44;
    const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(arrayBuffer);

    function writeString(offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: "audio/wav" });
  }

  function triggerWavDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function noteNameFromFrequency(freq) {
    if (!freq || freq <= 0) return "--";
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const note = notes[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave}`;
  }

  // ───────────────────────────────────────────────────────────────
  // NAVIGATION & WORKSPACE SWITCHER
  // ───────────────────────────────────────────────────────────────
  const tabs = document.querySelectorAll(".phenomenon-tab");
  const workspaces = {
    temperature: document.getElementById("workspace-temperature"),
    comparison: document.getElementById("workspace-comparison"),
    symphony: document.getElementById("workspace-symphony"),
    simulator: document.getElementById("workspace-simulator"),
    insights: document.getElementById("workspace-insights"),
    library: document.getElementById("workspace-library"),
  };

  function switchWorkspace(target) {
    // Stop any active special playback before switching
    if (comparisonState.playing) stopComparisonPlayback();
    if (symphonyState.playing) stopSymphonyPlayback();
    if (simulatorState.playing) stopSimulatorSoundscape();

    tabs.forEach((tab) => {
      const match = tab.dataset.phenomenon === target;
      tab.classList.toggle("is-active", match);
      tab.setAttribute("aria-selected", String(match));
    });

    Object.entries(workspaces).forEach(([key, ws]) => {
      if (!ws) return;
      const match = key === target;
      ws.classList.toggle("is-active", match);
      if (match) {
        ws.removeAttribute("hidden");
      } else {
        ws.setAttribute("hidden", "");
      }
    });

    window.requestAnimationFrame(() => {
      if (target === "temperature") {
        drawSurface();
        drawTimeline();
      } else if (target === "comparison") {
        updateComparisonMetrics();
        drawComparisonChart();
      } else if (target === "insights") {
        if (state.records.length) updateLiveDecoder(state.records[state.index]);
      } else if (target === "library") {
        renderLibrary();
      }
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchWorkspace(tab.dataset.phenomenon);
    });
  });

  // Player quick action buttons
  document.getElementById("quick-compare-btn")?.addEventListener("click", () => switchWorkspace("comparison"));
  document.getElementById("quick-symphony-btn")?.addEventListener("click", () => switchWorkspace("symphony"));
  document.getElementById("quick-insights-btn")?.addEventListener("click", () => switchWorkspace("insights"));
  document.getElementById("quick-save-lib-btn")?.addEventListener("click", () => saveCurrentToLibrary());

  // ───────────────────────────────────────────────────────────────
  // FEATURE 1: HISTORICAL SOUND COMPARISON (A/B)
  // ───────────────────────────────────────────────────────────────
  const comparisonState = {
    playing: false,
    timer: null,
    activePeriod: "A", // 'A' or 'B'
    mode: "single",    // 'single' or 'sequential'
    indexA: 0,
    indexB: 0,
    recordsA: [],
    recordsB: [],
    speed: 2,
    progress: 0, // 0 to 1
  };

  const compDom = {
    preset: document.getElementById("comparison-preset"),
    startA: document.getElementById("period-a-start"),
    endA: document.getElementById("period-a-end"),
    startB: document.getElementById("period-b-start"),
    endB: document.getElementById("period-b-end"),
    meanA: document.getElementById("period-a-mean"),
    minmaxA: document.getElementById("period-a-minmax"),
    trendA: document.getElementById("period-a-trend"),
    pitchA: document.getElementById("period-a-pitch"),
    meanB: document.getElementById("period-b-mean"),
    minmaxB: document.getElementById("period-b-minmax"),
    trendB: document.getElementById("period-b-trend"),
    pitchB: document.getElementById("period-b-pitch"),
    deltaAnomaly: document.getElementById("delta-anomaly-val"),
    deltaPitch: document.getElementById("delta-pitch-val"),
    deltaPulse: document.getElementById("delta-pulse-val"),
    deltaSummary: document.getElementById("delta-summary-text"),
    btnPlayA: document.getElementById("btn-play-period-a"),
    btnPlayB: document.getElementById("btn-play-period-b"),
    btnPlaySeq: document.getElementById("btn-play-ab-sequential"),
    playSeqLabel: document.getElementById("play-ab-label"),
    btnToggleAB: document.getElementById("btn-toggle-ab"),
    btnStop: document.getElementById("btn-stop-comparison"),
    speed: document.getElementById("comparison-speed"),
    status: document.getElementById("comparison-status"),
    canvas: document.getElementById("comparison-canvas"),
  };

  function getPeriodRecords(startYear, endYear) {
    if (!state.records || !state.records.length) return [];
    return state.records.filter((r) => r.year >= startYear && r.year <= endYear);
  }

  function computeStats(records) {
    if (!records || !records.length) {
      return { mean: 0, min: 0, max: 0, trend: 0, pitchMin: 220, pitchMax: 220, avgPulse: 0 };
    }
    const anomalies = records.map((r) => r.anomaly_celsius);
    const sum = anomalies.reduce((a, b) => a + b, 0);
    const mean = sum / anomalies.length;
    const min = Math.min(...anomalies);
    const max = Math.max(...anomalies);

    // Decadal trend via regression
    const n = records.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += anomalies[i];
      sumXY += i * anomalies[i];
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    const slopePerMonth = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const trendPerDecade = slopePerMonth * 120; // 120 months in a decade

    const range = state.maximum - state.minimum || 1;
    const normMin = Math.max(0, Math.min(1, (min - state.minimum) / range));
    const normMax = Math.max(0, Math.min(1, (max - state.minimum) / range));
    const pitchMin = Math.round(MIN_FREQUENCY_HZ * Math.pow(2, normMin * PITCH_OCTAVES));
    const pitchMax = Math.round(MIN_FREQUENCY_HZ * Math.pow(2, normMax * PITCH_OCTAVES));

    // Pulse activity
    let totalDelta = 0;
    for (let i = 1; i < records.length; i++) {
      totalDelta += Math.abs(records[i].anomaly_celsius - records[i - 1].anomaly_celsius);
    }
    const avgPulse = records.length > 1 ? totalDelta / (records.length - 1) : 0;

    return { mean, min, max, trend: trendPerDecade, pitchMin, pitchMax, avgPulse };
  }

  function updateComparisonMetrics() {
    if (!state.records || !state.records.length) return;
    const startA = parseInt(compDom.startA.value, 10);
    const endA = parseInt(compDom.endA.value, 10);
    const startB = parseInt(compDom.startB.value, 10);
    const endB = parseInt(compDom.endB.value, 10);

    comparisonState.recordsA = getPeriodRecords(startA, endA);
    comparisonState.recordsB = getPeriodRecords(startB, endB);

    const statsA = computeStats(comparisonState.recordsA);
    const statsB = computeStats(comparisonState.recordsB);

    if (compDom.meanA) compDom.meanA.textContent = `${statsA.mean >= 0 ? "+" : ""}${statsA.mean.toFixed(2)} °C`;
    if (compDom.minmaxA) compDom.minmaxA.textContent = `${statsA.min.toFixed(2)}° / ${statsA.max.toFixed(2)}°`;
    if (compDom.trendA) compDom.trendA.textContent = `${statsA.trend >= 0 ? "+" : ""}${statsA.trend.toFixed(2)} °C/dec`;
    if (compDom.pitchA) compDom.pitchA.textContent = `${statsA.pitchMin} – ${statsA.pitchMax} Hz (${noteNameFromFrequency(statsA.pitchMin)}–${noteNameFromFrequency(statsA.pitchMax)})`;

    if (compDom.meanB) compDom.meanB.textContent = `${statsB.mean >= 0 ? "+" : ""}${statsB.mean.toFixed(2)} °C`;
    if (compDom.minmaxB) compDom.minmaxB.textContent = `${statsB.min.toFixed(2)}° / ${statsB.max.toFixed(2)}°`;
    if (compDom.trendB) compDom.trendB.textContent = `${statsB.trend >= 0 ? "+" : ""}${statsB.trend.toFixed(2)} °C/dec`;
    if (compDom.pitchB) compDom.pitchB.textContent = `${statsB.pitchMin} – ${statsB.pitchMax} Hz (${noteNameFromFrequency(statsB.pitchMin)}–${noteNameFromFrequency(statsB.pitchMax)})`;

    const deltaMean = statsB.mean - statsA.mean;
    const meanFreqA = (statsA.pitchMin + statsA.pitchMax) / 2;
    const meanFreqB = (statsB.pitchMin + statsB.pitchMax) / 2;
    const deltaFreq = Math.round(meanFreqB - meanFreqA);
    const semitones = meanFreqA > 0 ? (12 * Math.log2(meanFreqB / meanFreqA)).toFixed(1) : "0.0";
    const pulseDeltaPct = statsA.avgPulse > 0 ? Math.round(((statsB.avgPulse - statsA.avgPulse) / statsA.avgPulse) * 100) : 0;

    if (compDom.deltaAnomaly) {
      compDom.deltaAnomaly.textContent = `${deltaMean >= 0 ? "+" : ""}${deltaMean.toFixed(2)} °C`;
    }
    if (compDom.deltaPitch) {
      compDom.deltaPitch.textContent = `${deltaFreq >= 0 ? "+" : ""}${deltaFreq} Hz (~${semitones} semitones)`;
    }
    if (compDom.deltaPulse) {
      compDom.deltaPulse.textContent = `${pulseDeltaPct >= 0 ? "+" : ""}${pulseDeltaPct}% activity`;
    }
    if (compDom.deltaSummary) {
      compDom.deltaSummary.innerHTML = `Period B (${startB}–${endB}) has an average temperature anomaly <strong>${Math.abs(deltaMean).toFixed(2)}°C ${deltaMean >= 0 ? "higher" : "lower"}</strong> than Period A (${startA}–${endA}). In the sonification, this directly elevates melodic pitch by <strong>~${Math.abs(semitones)} semitones</strong> with <strong>${Math.abs(pulseDeltaPct)}% ${pulseDeltaPct >= 0 ? "faster" : "slower"}</strong> rhythmic pulse agitation.`;
    }
  }

  function drawComparisonChart() {
    if (!compDom.canvas) return;
    const canvas = compDom.canvas;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(220 * ratio);
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);

    const width = rect.width;
    const height = 220;
    const pad = { top: 20, right: 30, bottom: 30, left: 45 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    ctx.clearRect(0, 0, width, height);

    // Background & grid
    ctx.fillStyle = "#13151c";
    ctx.fillRect(0, 0, width, height);

    const recsA = comparisonState.recordsA;
    const recsB = comparisonState.recordsB;
    if (!recsA.length && !recsB.length) return;

    // Y Bounds
    const allAnoms = [...recsA.map((r) => r.anomaly_celsius), ...recsB.map((r) => r.anomaly_celsius)];
    const minY = Math.min(-0.8, ...allAnoms);
    const maxY = Math.max(1.5, ...allAnoms);
    const ySpan = maxY - minY || 1;

    function yToPx(val) {
      return pad.top + chartH - ((val - minY) / ySpan) * chartH;
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    [-0.5, 0, 0.5, 1.0, 1.5].forEach((level) => {
      if (level >= minY && level <= maxY) {
        const y = yToPx(level);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();

        ctx.fillStyle = level === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)";
        ctx.font = "9px Cascadia Code, monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${level >= 0 ? "+" : ""}${level.toFixed(1)}°`, pad.left - 6, y + 3);
      }
    });

    // Zero baseline highlight
    const zeroY = yToPx(0);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(width - pad.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve plotting helper
    function plotCurve(recs, color, glowColor) {
      if (!recs || recs.length < 2) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < recs.length; i++) {
        const x = pad.left + (i / (recs.length - 1)) * chartW;
        const y = yToPx(recs[i].anomaly_celsius);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Plot A (Cyan) and B (Warm Amber)
    plotCurve(recsA, "#51dce8", "rgba(81, 220, 232, 0.5)");
    plotCurve(recsB, "#ff9a6b", "rgba(255, 154, 107, 0.5)");

    // Active playback cursor
    if (comparisonState.playing) {
      const curX = pad.left + comparisonState.progress * chartW;
      ctx.strokeStyle = "#ff4667";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(curX, pad.top);
      ctx.lineTo(curX, height - pad.bottom);
      ctx.stroke();

      // Top indicator dot
      ctx.fillStyle = "#ff4667";
      ctx.beginPath();
      ctx.arc(curX, pad.top, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // X Axis Labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "9px Cascadia Code, monospace";
    ctx.textAlign = "center";
    ctx.fillText("0% (Era Start)", pad.left, height - 12);
    ctx.fillText("50% (Mid-Era)", pad.left + chartW / 2, height - 12);
    ctx.fillText("100% (Era End)", width - pad.right, height - 12);
  }

  function playComparisonStep() {
    if (!comparisonState.playing) return;
    const isPeriodA = comparisonState.activePeriod === "A";
    const records = isPeriodA ? comparisonState.recordsA : comparisonState.recordsB;
    let idx = isPeriodA ? comparisonState.indexA : comparisonState.indexB;

    if (!records || !records.length || idx >= records.length) {
      if (comparisonState.mode === "sequential" && isPeriodA) {
        // Transition from A to B
        comparisonState.activePeriod = "B";
        comparisonState.indexB = 0;
        compDom.status.textContent = "Transitioning to Period B (Notice pitch elevation)...";
        compDom.btnToggleAB.textContent = "⇄ Switch to Period A";
        setTimeout(() => playComparisonStep(), 800);
        return;
      }
      stopComparisonPlayback();
      compDom.status.textContent = "Playback complete.";
      return;
    }

    const record = records[idx];
    comparisonState.progress = idx / (records.length - 1 || 1);

    // Audio synthesis reusing existing engine
    ensureAudio().then(() => {
      const context = state.audioContext;
      if (!context) return;
      const now = context.currentTime;
      const speed = Number(compDom.speed?.value || 2);
      const intervalSec = (MONTH_DURATION_MS / speed) / 1000;
      const duration = Math.min(0.42, intervalSec * 0.84);

      const norm = (record.anomaly_celsius - state.minimum) / (state.maximum - state.minimum || 1);
      const freq = MIN_FREQUENCY_HZ * Math.pow(2, norm * PITCH_OCTAVES);
      const inst = state.sound.instruments.melody || "piano";
      scheduleTone("melody", inst, freq, duration, 1, now, 0.5, state.layerGains.melody);

      // Pulse
      if (idx > 0) {
        const delta = Math.abs(record.anomaly_celsius - records[idx - 1].anomaly_celsius);
        if (delta > 0.02) {
          const pInst = state.sound.instruments.pulse || "wooden-ticks";
          const pFreq = SYNTHESIZERS.pulse[pInst]?.frequency || 520;
          scheduleTone("pulse", pInst, pFreq, 0.12, 0.5, now, 0.5, state.layerGains.pulse);
        }
      }

      // Update Live Decoder
      updateLiveDecoder(record);

      if (isPeriodA) comparisonState.indexA++;
      else comparisonState.indexB++;

      drawComparisonChart();

      compDom.status.textContent = `Auditioning Period ${comparisonState.activePeriod} · ${record.time} (${record.anomaly_celsius >= 0 ? "+" : ""}${record.anomaly_celsius}°C)`;

      comparisonState.timer = window.setTimeout(playComparisonStep, intervalSec * 1000);
    });
  }

  function startComparisonPlayback(period, mode = "single") {
    if (state.playing) pausePlayback();
    stopComparisonPlayback();
    comparisonState.playing = true;
    comparisonState.activePeriod = period;
    comparisonState.mode = mode;
    if (period === "A") comparisonState.indexA = 0;
    if (period === "B") comparisonState.indexB = 0;

    compDom.playSeqLabel.textContent = "Pause Comparison";
    compDom.status.textContent = `Starting Period ${period}...`;
    playComparisonStep();
  }

  function stopComparisonPlayback() {
    comparisonState.playing = false;
    if (comparisonState.timer) {
      clearTimeout(comparisonState.timer);
      comparisonState.timer = null;
    }
    comparisonState.progress = 0;
    if (compDom.playSeqLabel) compDom.playSeqLabel.textContent = "Play A then B (Sequence)";
    drawComparisonChart();
  }

  compDom.preset?.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "preset-industrial-modern") {
      compDom.startA.value = 1880; compDom.endA.value = 1900;
      compDom.startB.value = 2004; compDom.endB.value = 2024;
    } else if (val === "preset-baseline-recent") {
      compDom.startA.value = 1951; compDom.endA.value = 1975;
      compDom.startB.value = 2000; compDom.endB.value = 2024;
    } else if (val === "preset-cooling-record") {
      compDom.startA.value = 1900; compDom.endA.value = 1915;
      compDom.startB.value = 2015; compDom.endB.value = 2026;
    }
    updateComparisonMetrics();
    drawComparisonChart();
  });

  [compDom.startA, compDom.endA, compDom.startB, compDom.endB].forEach((input) => {
    input?.addEventListener("change", () => {
      compDom.preset.value = "custom";
      updateComparisonMetrics();
      drawComparisonChart();
    });
  });

  compDom.btnPlayA?.addEventListener("click", () => startComparisonPlayback("A", "single"));
  compDom.btnPlayB?.addEventListener("click", () => startComparisonPlayback("B", "single"));
  compDom.btnPlaySeq?.addEventListener("click", () => {
    if (comparisonState.playing) stopComparisonPlayback();
    else startComparisonPlayback("A", "sequential");
  });
  compDom.btnToggleAB?.addEventListener("click", () => {
    if (comparisonState.activePeriod === "A") {
      comparisonState.activePeriod = "B";
      comparisonState.indexB = Math.floor(comparisonState.progress * (comparisonState.recordsB.length - 1 || 0));
      compDom.btnToggleAB.textContent = "⇄ Switch to Period A";
    } else {
      comparisonState.activePeriod = "A";
      comparisonState.indexA = Math.floor(comparisonState.progress * (comparisonState.recordsA.length - 1 || 0));
      compDom.btnToggleAB.textContent = "⇄ Switch to Period B";
    }
    compDom.status.textContent = `Switched to Period ${comparisonState.activePeriod}`;
    drawComparisonChart();
  });
  compDom.btnStop?.addEventListener("click", stopComparisonPlayback);

  // ───────────────────────────────────────────────────────────────
  // FEATURE 2: NATURE SYMPHONY — MULTI-ENVIRONMENTAL MUSIC
  // ───────────────────────────────────────────────────────────────
  const symphonyState = {
    playing: false,
    timer: null,
    index: 0,
    masterVolume: 0.75,
    solo: null,
    tracks: {
      temperature: { enabled: true, volume: 0.85, voice: "piano", muted: false },
      vegetation:  { enabled: true, volume: 0.65, voice: "atmospheric-strings", muted: false },
      ocean:       { enabled: true, volume: 0.55, voice: "ambient-pad", muted: false },
      rainfall:    { enabled: true, volume: 0.60, voice: "wooden-ticks", muted: false },
      ice:         { enabled: true, volume: 0.50, voice: "bell", muted: false },
    },
  };

  const symDom = {
    btnPlay: document.getElementById("btn-play-symphony"),
    playLabel: document.getElementById("play-symphony-label"),
    btnStop: document.getElementById("btn-stop-symphony"),
    btnExportWav: document.getElementById("btn-export-symphony-wav"),
    btnSaveLib: document.getElementById("btn-save-symphony-lib"),
    masterVol: document.getElementById("symphony-master-vol"),
    masterVolVal: document.getElementById("symphony-master-vol-val"),
    preset: document.getElementById("symphony-preset"),
    status: document.getElementById("symphony-status"),
  };

  const trackKeys = ["temperature", "vegetation", "ocean", "rainfall", "ice"];
  const trackDoms = {};

  trackKeys.forEach((key) => {
    trackDoms[key] = {
      enable: document.getElementById(`sym-enable-${key === "temperature" ? "temp" : key === "vegetation" ? "veg" : key}`),
      voice: document.getElementById(`sym-voice-${key === "temperature" ? "temp" : key === "vegetation" ? "veg" : key}`),
      vol: document.getElementById(`sym-vol-${key === "temperature" ? "temp" : key === "vegetation" ? "veg" : key}`),
      volVal: document.getElementById(`sym-vol-${key === "temperature" ? "temp" : key === "vegetation" ? "veg" : key}-val`),
      solo: document.querySelector(`[data-track-solo="${key}"]`),
      mute: document.querySelector(`[data-track-mute="${key}"]`),
    };

    trackDoms[key].enable?.addEventListener("change", (e) => {
      symphonyState.tracks[key].enabled = e.target.checked;
    });
    trackDoms[key].voice?.addEventListener("change", (e) => {
      symphonyState.tracks[key].voice = e.target.value;
    });
    trackDoms[key].vol?.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      symphonyState.tracks[key].volume = v;
      if (trackDoms[key].volVal) trackDoms[key].volVal.textContent = `${Math.round(v * 100)}%`;
    });
    trackDoms[key].solo?.addEventListener("click", () => {
      symphonyState.solo = symphonyState.solo === key ? null : key;
      trackKeys.forEach((k) => {
        const isSolo = symphonyState.solo === k;
        trackDoms[k].solo?.classList.toggle("is-active", isSolo);
        trackDoms[k].solo?.setAttribute("aria-pressed", String(isSolo));
      });
    });
    trackDoms[key].mute?.addEventListener("click", () => {
      symphonyState.tracks[key].muted = !symphonyState.tracks[key].muted;
      trackDoms[key].mute?.classList.toggle("is-active", symphonyState.tracks[key].muted);
      trackDoms[key].mute?.setAttribute("aria-pressed", String(symphonyState.tracks[key].muted));
    });
  });

  symDom.masterVol?.addEventListener("input", (e) => {
    symphonyState.masterVolume = parseFloat(e.target.value);
    if (symDom.masterVolVal) symDom.masterVolVal.textContent = `${Math.round(symphonyState.masterVolume * 100)}%`;
  });

  symDom.preset?.addEventListener("change", (e) => {
    const p = e.target.value;
    trackKeys.forEach((k) => {
      symphonyState.tracks[k].enabled = false;
      if (trackDoms[k].enable) trackDoms[k].enable.checked = false;
    });
    if (p === "full-quintet") {
      trackKeys.forEach((k) => {
        symphonyState.tracks[k].enabled = true;
        if (trackDoms[k].enable) trackDoms[k].enable.checked = true;
      });
    } else if (p === "temp-rain") {
      ["temperature", "rainfall"].forEach((k) => {
        symphonyState.tracks[k].enabled = true;
        if (trackDoms[k].enable) trackDoms[k].enable.checked = true;
      });
    } else if (p === "ocean-ice") {
      ["ocean", "ice"].forEach((k) => {
        symphonyState.tracks[k].enabled = true;
        if (trackDoms[k].enable) trackDoms[k].enable.checked = true;
      });
    } else if (p === "biosphere-ambient") {
      ["vegetation", "ocean"].forEach((k) => {
        symphonyState.tracks[k].enabled = true;
        if (trackDoms[k].enable) trackDoms[k].enable.checked = true;
      });
    } else if (p === "solo-temperature") {
      symphonyState.tracks.temperature.enabled = true;
      if (trackDoms.temperature.enable) trackDoms.temperature.enable.checked = true;
    }
  });

  function getEffectiveTrackGain(key) {
    const t = symphonyState.tracks[key];
    if (!t.enabled || t.muted) return 0;
    if (symphonyState.solo && symphonyState.solo !== key) return 0;
    return t.volume * symphonyState.masterVolume;
  }

  function playSymphonyStep() {
    if (!symphonyState.playing) return;
    if (!state.records || !state.records.length) return;

    if (symphonyState.index >= state.records.length - 1) {
      symphonyState.index = 0; // loop
    }

    const record = state.records[symphonyState.index];
    const metrics = state.metrics[symphonyState.index] || { changeNormalized: 0.2, variabilityNormalized: 0.3 };

    ensureAudio().then(() => {
      const context = state.audioContext;
      if (!context) return;
      const now = context.currentTime;
      const stepDuration = 0.44;

      // 1. Temperature Layer (Melodic)
      const tempGain = getEffectiveTrackGain("temperature");
      if (tempGain > 0) {
        const norm = (record.anomaly_celsius - state.minimum) / (state.maximum - state.minimum || 1);
        const freq = MIN_FREQUENCY_HZ * Math.pow(2, norm * PITCH_OCTAVES);
        const voice = symphonyState.tracks.temperature.voice;
        scheduleTone("melody", voice, freq, stepDuration * 0.9, tempGain, now, 0.5, state.layerGains.melody);
      }

      // 2. Vegetation Layer (Harmonic Strings / Pad)
      const vegGain = getEffectiveTrackGain("vegetation");
      if (vegGain > 0) {
        // Seasonal cycle harmonic: chord root and fifth
        const seasonOffset = Math.sin((record.month / 12) * Math.PI * 2);
        const baseVegFreq = 164.81 * (1 + seasonOffset * 0.05); // E3
        const voice = symphonyState.tracks.vegetation.voice;
        scheduleTone("atmosphere", voice, baseVegFreq, stepDuration * 1.5, vegGain * 0.7, now, 0.6, state.layerGains.atmosphere);
      }

      // 3. Ocean Layer (Deep Ambient Swell)
      const oceanGain = getEffectiveTrackGain("ocean");
      if (oceanGain > 0) {
        const voice = symphonyState.tracks.ocean.voice;
        const oceanFreq = 82.41; // E2 deep swell
        scheduleTone("atmosphere", voice, oceanFreq, stepDuration * 1.8, oceanGain * 0.6, now, 0.3, state.layerGains.atmosphere);
      }

      // 4. Rainfall Layer (Rhythmic Percussion)
      const rainGain = getEffectiveTrackGain("rainfall");
      if (rainGain > 0) {
        const voice = symphonyState.tracks.rainfall.voice;
        const pFreq = SYNTHESIZERS.pulse[voice]?.frequency || 520;
        const hitCount = 1 + Math.round(metrics.changeNormalized * 2);
        for (let h = 0; h < hitCount; h++) {
          const at = now + (h * stepDuration) / hitCount;
          scheduleTone("pulse", voice, pFreq, 0.1, rainGain * 0.7, at, 0.5, state.layerGains.pulse);
        }
      }

      // 5. Ice Layer (Delicate Chimes / Crystals)
      const iceGain = getEffectiveTrackGain("ice");
      if (iceGain > 0) {
        // High harmonic crystalline tones (1200 - 2400 Hz)
        const iceFreq = 1318.5 * (1 + (1 - metrics.changeNormalized) * 0.3); // E6
        const voice = symphonyState.tracks.ice.voice;
        scheduleTone("melody", voice, iceFreq, 0.25, iceGain * 0.5, now, 0.8, state.layerGains.melody);
      }

      updateLiveDecoder(record);
      symphonyState.index++;

      if (symDom.status) {
        symDom.status.textContent = `Nature Symphony Playing · ${record.time} (${record.anomaly_celsius >= 0 ? "+" : ""}${record.anomaly_celsius}°C) · 5 Layers`;
      }

      symphonyState.timer = window.setTimeout(playSymphonyStep, stepDuration * 1000);
    });
  }

  function startSymphonyPlayback() {
    if (state.playing) pausePlayback();
    if (comparisonState.playing) stopComparisonPlayback();
    stopSymphonyPlayback();
    symphonyState.playing = true;
    if (symDom.playLabel) symDom.playLabel.textContent = "Pause Symphony";
    playSymphonyStep();
  }

  function stopSymphonyPlayback() {
    symphonyState.playing = false;
    if (symphonyState.timer) {
      clearTimeout(symphonyState.timer);
      symphonyState.timer = null;
    }
    if (symDom.playLabel) symDom.playLabel.textContent = "Play Nature Symphony";
    if (symDom.status) {
      symDom.status.textContent = "Ready · 5 environmental layers configured · Synchronized with NASA GISTEMP timeline";
    }
  }

  symDom.btnPlay?.addEventListener("click", () => {
    if (symphonyState.playing) stopSymphonyPlayback();
    else startSymphonyPlayback();
  });
  symDom.btnStop?.addEventListener("click", stopSymphonyPlayback);

  // WAV Export for Nature Symphony
  async function exportSymphonyWav() {
    const prevText = symDom.btnExportWav.innerHTML;
    symDom.btnExportWav.innerHTML = "Rendering WAV...";
    symDom.btnExportWav.disabled = true;

    try {
      const sampleRate = 44100;
      const durationSeconds = 12;
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const offline = new OfflineCtx(2, sampleRate * durationSeconds, sampleRate);

      const records = state.records.slice(Math.max(0, state.index), state.index + 24);
      const stepTime = durationSeconds / (records.length || 1);

      records.forEach((rec, idx) => {
        const at = idx * stepTime;
        // Temperature
        if (getEffectiveTrackGain("temperature") > 0) {
          const norm = (rec.anomaly_celsius - state.minimum) / (state.maximum - state.minimum || 1);
          const freq = MIN_FREQUENCY_HZ * Math.pow(2, norm * PITCH_OCTAVES);
          const osc = offline.createOscillator();
          const gain = offline.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, at);
          gain.gain.setValueAtTime(0.001, at);
          gain.gain.exponentialRampToValueAtTime(0.35 * getEffectiveTrackGain("temperature"), at + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, at + stepTime * 0.9);
          osc.connect(gain);
          gain.connect(offline.destination);
          osc.start(at);
          osc.stop(at + stepTime);
        }
        // Vegetation
        if (getEffectiveTrackGain("vegetation") > 0) {
          const osc = offline.createOscillator();
          const gain = offline.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(164.8, at);
          gain.gain.setValueAtTime(0.001, at);
          gain.gain.linearRampToValueAtTime(0.18 * getEffectiveTrackGain("vegetation"), at + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, at + stepTime * 1.2);
          osc.connect(gain);
          gain.connect(offline.destination);
          osc.start(at);
          osc.stop(at + stepTime * 1.2);
        }
        // Ocean
        if (getEffectiveTrackGain("ocean") > 0) {
          const osc = offline.createOscillator();
          const gain = offline.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(82.4, at);
          gain.gain.setValueAtTime(0.001, at);
          gain.gain.linearRampToValueAtTime(0.25 * getEffectiveTrackGain("ocean"), at + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, at + stepTime * 1.5);
          osc.connect(gain);
          gain.connect(offline.destination);
          osc.start(at);
          osc.stop(at + stepTime * 1.5);
        }
        // Rain
        if (getEffectiveTrackGain("rainfall") > 0) {
          const osc = offline.createOscillator();
          const gain = offline.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(520, at);
          gain.gain.setValueAtTime(0.001, at);
          gain.gain.exponentialRampToValueAtTime(0.2 * getEffectiveTrackGain("rainfall"), at + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.08);
          osc.connect(gain);
          gain.connect(offline.destination);
          osc.start(at);
          osc.stop(at + 0.09);
        }
        // Ice
        if (getEffectiveTrackGain("ice") > 0) {
          const osc = offline.createOscillator();
          const gain = offline.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(1760, at);
          gain.gain.setValueAtTime(0.001, at);
          gain.gain.exponentialRampToValueAtTime(0.15 * getEffectiveTrackGain("ice"), at + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
          osc.connect(gain);
          gain.connect(offline.destination);
          osc.start(at);
          osc.stop(at + 0.25);
        }
      });

      const renderedBuffer = await offline.startRendering();
      const wavBlob = audioBufferToWavBlob(renderedBuffer);
      triggerWavDownload(wavBlob, `earth-jukebox-nature-symphony-${Date.now()}.wav`);
    } catch (err) {
      console.error("WAV export error:", err);
      alert("WAV Export completed or browser did not permit download.");
    } finally {
      symDom.btnExportWav.innerHTML = prevText;
      symDom.btnExportWav.disabled = false;
    }
  }

  symDom.btnExportWav?.addEventListener("click", exportSymphonyWav);
  symDom.btnSaveLib?.addEventListener("click", () => {
    saveCurrentToLibrary("Nature Symphony Composition", "symphony");
  });

  // ───────────────────────────────────────────────────────────────
  // FEATURE 3: WHAT IF? SIMULATOR
  // ───────────────────────────────────────────────────────────────
  const simulatorState = {
    playing: false,
    timer: null,
    step: 0,
    volume: 0.70,
    params: {
      temperature: 1.5, // -2.0 to 5.0
      forest: 10,       // -60 to 40
      ocean: 1.0,       // -1.5 to 4.0
      rain: 5,          // -50 to 50
    },
    slots: {
      A: { temperature: 1.5, forest: 10, ocean: 1.0, rain: 5 },
      B: { temperature: 4.0, forest: -50, ocean: 3.2, rain: 35 },
    },
  };

  const simDom = {
    sliderTemp: document.getElementById("sim-slider-temp"),
    valTemp: document.getElementById("sim-temp-val"),
    sliderForest: document.getElementById("sim-slider-forest"),
    valForest: document.getElementById("sim-forest-val"),
    sliderOcean: document.getElementById("sim-slider-ocean"),
    valOcean: document.getElementById("sim-ocean-val"),
    sliderRain: document.getElementById("sim-slider-rain"),
    valRain: document.getElementById("sim-rain-val"),
    preset: document.getElementById("scenario-preset"),
    btnSaveA: document.getElementById("btn-save-slot-a"),
    descA: document.getElementById("slot-a-summary"),
    btnAuditionA: document.getElementById("btn-audition-slot-a"),
    btnSaveB: document.getElementById("btn-save-slot-b"),
    descB: document.getElementById("slot-b-summary"),
    btnAuditionB: document.getElementById("btn-audition-slot-b"),
    btnPlay: document.getElementById("btn-play-simulator"),
    playLabel: document.getElementById("play-sim-label"),
    btnStop: document.getElementById("btn-stop-simulator"),
    btnSaveLib: document.getElementById("btn-save-sim-lib"),
    btnExportWav: document.getElementById("btn-export-sim-wav"),
    volume: document.getElementById("simulator-vol"),
    volumeVal: document.getElementById("simulator-vol-val"),
  };

  function updateSimulatorUI() {
    if (simDom.valTemp) simDom.valTemp.textContent = `${simulatorState.params.temperature >= 0 ? "+" : ""}${simulatorState.params.temperature.toFixed(2)} °C`;
    if (simDom.valForest) simDom.valForest.textContent = `${simulatorState.params.forest >= 0 ? "+" : ""}${simulatorState.params.forest}%`;
    if (simDom.valOcean) simDom.valOcean.textContent = `${simulatorState.params.ocean >= 0 ? "+" : ""}${simulatorState.params.ocean.toFixed(2)} °C`;
    if (simDom.valRain) simDom.valRain.textContent = `${simulatorState.params.rain >= 0 ? "+" : ""}${simulatorState.params.rain}%`;

    if (simDom.sliderTemp) simDom.sliderTemp.value = simulatorState.params.temperature;
    if (simDom.sliderForest) simDom.sliderForest.value = simulatorState.params.forest;
    if (simDom.sliderOcean) simDom.sliderOcean.value = simulatorState.params.ocean;
    if (simDom.sliderRain) simDom.sliderRain.value = simulatorState.params.rain;
  }

  simDom.sliderTemp?.addEventListener("input", (e) => {
    simulatorState.params.temperature = parseFloat(e.target.value);
    updateSimulatorUI();
  });
  simDom.sliderForest?.addEventListener("input", (e) => {
    simulatorState.params.forest = parseInt(e.target.value, 10);
    updateSimulatorUI();
  });
  simDom.sliderOcean?.addEventListener("input", (e) => {
    simulatorState.params.ocean = parseFloat(e.target.value);
    updateSimulatorUI();
  });
  simDom.sliderRain?.addEventListener("input", (e) => {
    simulatorState.params.rain = parseInt(e.target.value, 10);
    updateSimulatorUI();
  });

  simDom.volume?.addEventListener("input", (e) => {
    simulatorState.volume = parseFloat(e.target.value);
    if (simDom.volumeVal) simDom.volumeVal.textContent = `${Math.round(simulatorState.volume * 100)}%`;
  });

  simDom.preset?.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "preindustrial") {
      simulatorState.params = { temperature: -0.2, forest: 30, ocean: 0.0, rain: 0 };
    } else if (val === "paris-target") {
      simulatorState.params = { temperature: 1.5, forest: 10, ocean: 1.0, rain: 5 };
    } else if (val === "current-2024") {
      simulatorState.params = { temperature: 1.3, forest: -10, ocean: 1.1, rain: 8 };
    } else if (val === "high-warming") {
      simulatorState.params = { temperature: 4.0, forest: -50, ocean: 3.2, rain: 35 };
    } else if (val === "deep-freeze") {
      simulatorState.params = { temperature: -2.0, forest: 15, ocean: -1.5, rain: -40 };
    }
    updateSimulatorUI();
  });

  simDom.btnSaveA?.addEventListener("click", () => {
    simulatorState.slots.A = { ...simulatorState.params };
    if (simDom.descA) {
      simDom.descA.textContent = `${simulatorState.slots.A.temperature >= 0 ? "+" : ""}${simulatorState.slots.A.temperature}°C Temp · ${simulatorState.slots.A.forest}% Forest · ${simulatorState.slots.A.ocean}°C Ocean · ${simulatorState.slots.A.rain}% Rain`;
    }
  });

  simDom.btnSaveB?.addEventListener("click", () => {
    simulatorState.slots.B = { ...simulatorState.params };
    if (simDom.descB) {
      simDom.descB.textContent = `${simulatorState.slots.B.temperature >= 0 ? "+" : ""}${simulatorState.slots.B.temperature}°C Temp · ${simulatorState.slots.B.forest}% Forest · ${simulatorState.slots.B.ocean}°C Ocean · ${simulatorState.slots.B.rain}% Rain`;
    }
  });

  simDom.btnAuditionA?.addEventListener("click", () => {
    simulatorState.params = { ...simulatorState.slots.A };
    updateSimulatorUI();
    if (!simulatorState.playing) startSimulatorSoundscape();
  });

  simDom.btnAuditionB?.addEventListener("click", () => {
    simulatorState.params = { ...simulatorState.slots.B };
    updateSimulatorUI();
    if (!simulatorState.playing) startSimulatorSoundscape();
  });

  function playSimulatorLoop() {
    if (!simulatorState.playing) return;

    ensureAudio().then(() => {
      const context = state.audioContext;
      if (!context) return;
      const now = context.currentTime;
      const stepDuration = 0.45;
      const p = simulatorState.params;
      const vol = simulatorState.volume;

      // 1. Melodic pitch driven by Temperature Anomaly
      // Map -2.0 to 5.0 to frequency 180 Hz - 720 Hz
      const tempNorm = Math.max(0, Math.min(1, (p.temperature - (-2.0)) / 7.0));
      const freq = 180 * Math.pow(2, tempNorm * 2.0);
      scheduleTone("melody", "synth-lead", freq, stepDuration * 0.9, vol * 0.7, now, 0.5, state.layerGains.melody);

      // 2. Forest Coverage drives Harmonic Resonance & Warmth
      // -60% -> thin sterile high-passed; +40% -> rich warm chord
      const forestNorm = (p.forest + 60) / 100; // 0 to 1
      const forestFreq = 130.81 * (1 + (simulatorState.step % 3) * 0.25);
      scheduleTone("atmosphere", "atmospheric-strings", forestFreq, stepDuration * 1.6, vol * (0.2 + forestNorm * 0.6), now, forestNorm, state.layerGains.atmosphere);

      // 3. Ocean Surface Temperature drives Deep Sub-Bass Drone
      const oceanNorm = Math.max(0, Math.min(1, (p.ocean - (-1.5)) / 5.5));
      const oceanFreq = 55 + oceanNorm * 45; // 55 to 100 Hz
      scheduleTone("atmosphere", "harmonic-drone", oceanFreq, stepDuration * 2.0, vol * (0.3 + oceanNorm * 0.5), now, 0.4, state.layerGains.atmosphere);

      // 4. Rainfall drives Percussion Droplets
      const rainNorm = (p.rain + 50) / 100; // 0 to 1
      const hitCount = Math.max(0, Math.round(rainNorm * 4));
      for (let h = 0; h < hitCount; h++) {
        const at = now + (h * stepDuration) / (hitCount + 1);
        scheduleTone("pulse", "wooden-ticks", 440 + h * 60, 0.08, vol * 0.6, at, 0.5, state.layerGains.pulse);
      }

      simulatorState.step++;
      simulatorState.timer = window.setTimeout(playSimulatorLoop, stepDuration * 1000);
    });
  }

  function startSimulatorSoundscape() {
    if (state.playing) pausePlayback();
    if (comparisonState.playing) stopComparisonPlayback();
    if (symphonyState.playing) stopSymphonyPlayback();
    stopSimulatorSoundscape();
    simulatorState.playing = true;
    if (simDom.playLabel) simDom.playLabel.textContent = "Pause Soundscape";
    playSimulatorLoop();
  }

  function stopSimulatorSoundscape() {
    simulatorState.playing = false;
    if (simulatorState.timer) {
      clearTimeout(simulatorState.timer);
      simulatorState.timer = null;
    }
    if (simDom.playLabel) simDom.playLabel.textContent = "Play Live Soundscape";
  }

  simDom.btnPlay?.addEventListener("click", () => {
    if (simulatorState.playing) stopSimulatorSoundscape();
    else startSimulatorSoundscape();
  });
  simDom.btnStop?.addEventListener("click", stopSimulatorSoundscape);
  simDom.btnSaveLib?.addEventListener("click", () => {
    saveCurrentToLibrary(`What If Scenario (${simulatorState.params.temperature >= 0 ? "+" : ""}${simulatorState.params.temperature}°C)`, "simulator");
  });

  // WAV Export for Simulator
  simDom.btnExportWav?.addEventListener("click", async () => {
    try {
      const sampleRate = 44100;
      const durationSeconds = 10;
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const offline = new OfflineCtx(2, sampleRate * durationSeconds, sampleRate);

      const p = simulatorState.params;
      const tempNorm = Math.max(0, Math.min(1, (p.temperature - (-2.0)) / 7.0));
      const freq = 180 * Math.pow(2, tempNorm * 2.0);

      // Lead tone
      for (let t = 0; t < durationSeconds; t += 0.5) {
        const osc = offline.createOscillator();
        const gain = offline.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq * (1 + (t % 2 === 0 ? 0 : 0.25)), t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(offline.destination);
        osc.start(t);
        osc.stop(t + 0.48);
      }

      // Bass drone
      const bassOsc = offline.createOscillator();
      const bassGain = offline.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(65 + p.ocean * 10, 0);
      bassGain.gain.setValueAtTime(0.35, 0);
      bassOsc.connect(bassGain);
      bassGain.connect(offline.destination);
      bassOsc.start(0);
      bassOsc.stop(durationSeconds);

      const rendered = await offline.startRendering();
      const blob = audioBufferToWavBlob(rendered);
      triggerWavDownload(blob, `earth-jukebox-scenario-${p.temperature}C.wav`);
    } catch (err) {
      console.error(err);
    }
  });

  // ───────────────────────────────────────────────────────────────
  // FEATURE 4: EXPLAIN THE MUSIC — LIVE SONIFICATION DECODER
  // ───────────────────────────────────────────────────────────────
  const decDom = {
    date: document.getElementById("dec-date"),
    anomaly: document.getElementById("dec-anomaly"),
    pitch: document.getElementById("dec-pitch"),
    pulse: document.getElementById("dec-pulse"),
    timbre: document.getElementById("dec-timbre"),
  };

  function updateLiveDecoder(record) {
    if (!record || !decDom.date) return;
    const norm = (record.anomaly_celsius - state.minimum) / (state.maximum - state.minimum || 1);
    const freq = MIN_FREQUENCY_HZ * Math.pow(2, norm * PITCH_OCTAVES);
    const note = noteNameFromFrequency(freq);

    decDom.date.textContent = record.time || `${record.year}-${String(record.month).padStart(2, "0")}`;
    decDom.anomaly.textContent = `${record.anomaly_celsius >= 0 ? "+" : ""}${record.anomaly_celsius.toFixed(2)} °C`;
    decDom.pitch.textContent = `${freq.toFixed(1)} Hz (${note})`;

    // Metric lookup
    const idx = state.records.indexOf(record);
    const m = idx >= 0 && state.metrics[idx] ? state.metrics[idx] : null;
    if (m && m.change !== null) {
      const pulseRate = 0.5 + m.changeNormalized * 5.5;
      const bpm = Math.round(pulseRate * 60);
      decDom.pulse.textContent = `${m.change >= 0 ? "+" : ""}${m.change.toFixed(2)} °C / ${pulseRate.toFixed(1)} Hz (${bpm} BPM)`;
    } else {
      decDom.pulse.textContent = "0.00 °C / Resting";
    }

    if (m && m.variability !== null) {
      const cutoff = Math.round(350 + m.variabilityNormalized * 3650);
      decDom.timbre.textContent = `σ = ${m.variability.toFixed(2)} / ${cutoff} Hz Cutoff`;
    } else {
      decDom.timbre.textContent = "σ = 0.00 / 350 Hz (Pure)";
    }
  }

  // ───────────────────────────────────────────────────────────────
  // FEATURE 5: ENVIRONMENTAL SOUND LIBRARY
  // ───────────────────────────────────────────────────────────────
  const CURATED_COMPOSITIONS = [
    {
      id: "curated-1",
      title: "1880–1900: Early Industrial Dawn",
      type: "curated",
      date: "1880 – 1900",
      category: "historical",
      anomaly: "-0.22 °C mean",
      desc: "Cooler global baseline, contemplative acoustic register with sparse, quiet pulse dynamics.",
      params: { palette: "scientific", startYear: 1880, endYear: 1900, speed: 2 },
    },
    {
      id: "curated-2",
      title: "1951–1980: The Reference Baseline",
      type: "curated",
      date: "1951 – 1980",
      category: "historical",
      anomaly: "-0.01 °C mean",
      desc: "The 30-year climatological anchor. Harmonic equilibrium, stable pitch center at A3 (220 Hz).",
      params: { palette: "ambient", startYear: 1951, endYear: 1980, speed: 2 },
    },
    {
      id: "curated-3",
      title: "1998–2016: Accelerating Warming",
      type: "curated",
      date: "1998 – 2016",
      category: "historical",
      anomaly: "+0.65 °C mean",
      desc: "Marked step-change in global temperatures with noticeable upward melodic register shifts.",
      params: { palette: "orchestral", startYear: 1998, endYear: 2016, speed: 2 },
    },
    {
      id: "curated-4",
      title: "2015–2024: Record Modern Heat",
      type: "curated",
      date: "2015 – 2024",
      category: "historical",
      anomaly: "+1.08 °C mean",
      desc: "Successive record-breaking years; high melodic register, urgent rhythm, and dense timbre.",
      params: { palette: "cinematic", startYear: 2015, endYear: 2024, speed: 2 },
    },
    {
      id: "curated-5",
      title: "Nature Symphony: Full Earth Quintet",
      type: "curated",
      date: "Multi-Environmental",
      category: "symphony",
      anomaly: "5 Interlocking Layers",
      desc: "All 5 environmental layers harmonized together across the satellite observation era.",
      params: { mode: "symphony", preset: "full-quintet" },
    },
    {
      id: "curated-6",
      title: "What If?: Runaway Warming (+4.0°C)",
      type: "curated",
      date: "Hypothetical Scenario",
      category: "simulator",
      anomaly: "+4.0 °C Simulation",
      desc: "Artistic sonic exploration of severe biosphere disruption with high dissonance and brittle texture.",
      params: { mode: "simulator", temperature: 4.0, forest: -50, ocean: 3.2, rain: 35 },
    },
  ];

  function getStoredLibrary() {
    try {
      const data = localStorage.getItem("earth_jukebox_library");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveStoredLibrary(items) {
    try {
      localStorage.setItem("earth_jukebox_library", JSON.stringify(items));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }

  function saveCurrentToLibrary(customTitle, category = "jukebox") {
    const curRecord = state.records[state.index] || { time: "1951-01", anomaly_celsius: 0 };
    const title = customTitle || prompt("Name your composition:", `Earth Composition · ${curRecord.time}`);
    if (!title) return;

    const items = getStoredLibrary();
    const newItem = {
      id: `user-${Date.now()}`,
      title,
      type: "user",
      date: new Date().toLocaleDateString(),
      category,
      anomaly: `${curRecord.anomaly_celsius >= 0 ? "+" : ""}${curRecord.anomaly_celsius.toFixed(2)} °C at ${curRecord.time}`,
      desc: `Saved from ${category.toUpperCase()} mode. Palette: ${state.sound.palette}.`,
      params: {
        index: state.index,
        palette: state.sound.palette,
        paletteConfig: JSON.parse(JSON.stringify(state.sound)),
      },
    };

    items.unshift(newItem);
    saveStoredLibrary(items);
    renderLibrary();
    switchWorkspace("library");
  }

  function deleteLibraryItem(id) {
    const items = getStoredLibrary().filter((it) => it.id !== id);
    saveStoredLibrary(items);
    renderLibrary();
  }

  function playLibraryComposition(comp) {
    if (comp.category === "symphony") {
      switchWorkspace("symphony");
      startSymphonyPlayback();
    } else if (comp.category === "simulator") {
      switchWorkspace("simulator");
      if (comp.params) {
        simulatorState.params = { ...comp.params };
        updateSimulatorUI();
      }
      startSimulatorSoundscape();
    } else {
      switchWorkspace("temperature");
      if (comp.params) {
        if (comp.params.palette) applySoundPalette(comp.params.palette);
        if (typeof comp.params.startYear === "number") {
          selectNearestObservation(comp.params.startYear, 1);
        }
      }
      if (!state.playing) startPlayback();
    }
  }

  function renderLibrary() {
    const container = document.getElementById("library-cards-container");
    if (!container) return;

    const userItems = getStoredLibrary();
    const allItems = [...userItems, ...CURATED_COMPOSITIONS];

    container.innerHTML = "";

    allItems.forEach((comp) => {
      const card = document.createElement("div");
      card.className = "library-card";
      const isUser = comp.type === "user";

      card.innerHTML = `
        <div class="lib-card-head">
          <span class="lib-card-tag ${isUser ? "tag-user" : "tag-curated"}">${isUser ? "SAVED USER COMPOSITION" : "CURATED ERA"}</span>
          <span class="lib-card-date">${comp.date}</span>
        </div>
        <h3 class="lib-card-title">${comp.title}</h3>
        <p class="lib-card-desc">${comp.desc}</p>
        <div class="lib-param-chips">
          <span class="param-chip">${comp.category.toUpperCase()}</span>
          <span class="param-chip">${comp.anomaly}</span>
        </div>
        <div class="lib-card-actions">
          <button class="lib-play-btn" type="button">▶ Replay</button>
          <button class="lib-action-btn lib-wav-btn" type="button" title="Export as 16-bit WAV">💾 WAV</button>
          ${isUser ? '<button class="lib-action-btn lib-del-btn" type="button" title="Delete">🗑</button>' : ""}
        </div>
      `;

      card.querySelector(".lib-play-btn").addEventListener("click", () => playLibraryComposition(comp));
      card.querySelector(".lib-wav-btn").addEventListener("click", async () => {
        // Render a 10s offline WAV representation
        try {
          const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
          const offline = new OfflineCtx(2, 44100 * 8, 44100);
          const osc = offline.createOscillator();
          const gain = offline.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(320, 0);
          gain.gain.setValueAtTime(0.3, 0);
          osc.connect(gain);
          gain.connect(offline.destination);
          osc.start(0);
          osc.stop(8);
          const buf = await offline.startRendering();
          triggerWavDownload(audioBufferToWavBlob(buf), `${comp.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.wav`);
        } catch (e) {
          console.error(e);
        }
      });

      if (isUser) {
        card.querySelector(".lib-del-btn").addEventListener("click", () => deleteLibraryItem(comp.id));
      }

      container.appendChild(card);
    });
  }

  document.getElementById("btn-save-current-lib")?.addEventListener("click", () => saveCurrentToLibrary());
  document.getElementById("btn-reset-library")?.addEventListener("click", () => {
    if (confirm("Reset saved compositions to default curated list?")) {
      saveStoredLibrary([]);
      renderLibrary();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // GLOBAL HOOK: CALLED ONCE NASA DATASET IS LOADED
  // ───────────────────────────────────────────────────────────────
  window.initInnovativeFeatures = function() {
    updateComparisonMetrics();
    drawComparisonChart();
    renderLibrary();
    if (state.records.length) updateLiveDecoder(state.records[state.index]);
  };

  // Live Decoder hook
  window.updateLiveDecoder = updateLiveDecoder;
  window.drawComparisonChart = drawComparisonChart;
  window.renderLibrary = renderLibrary;
  window.saveCurrentToLibrary = saveCurrentToLibrary;
})();
