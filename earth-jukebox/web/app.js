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
  climateSpectrumCanvas: document.querySelector("#climate-spectrum-canvas"),
  annualCanvas: document.querySelector("#annual-canvas"),
  seasonalCanvas: document.querySelector("#seasonal-canvas"),
  trendValue: document.querySelector("#trend-value"),
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
  activeNotes: new Set(),
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
  calculateClimateSpectrum();
  calculateClimateSummaries();
  drawSurface();
  drawTimeline();
  drawClimateSpectrum();
  drawAnnualChart();
  drawSeasonalChart();
}

function calculateClimateSpectrum() {
  const records = visibleRecords();
  const segmentLength = Math.min(256, 2 ** Math.floor(Math.log2(records.length)));
  if (segmentLength < 32) {
    state.powerSpectrum = [];
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

  for (let start = 0; start + segmentLength <= records.length; start += hop) {
    const values = records.slice(start, start + segmentLength).map((record) => record.anomaly_celsius);
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

    for (let bin = 0; bin <= segmentLength / 2; bin += 1) {
      let real = 0;
      let imaginary = 0;
      for (let index = 0; index < segmentLength; index += 1) {
        const angle = (2 * Math.PI * bin * index) / segmentLength;
        real += detrended[index] * Math.cos(angle);
        imaginary -= detrended[index] * Math.sin(angle);
      }
      let power = (real * real + imaginary * imaginary) / (sampleRate * windowEnergy);
      if (bin !== 0 && bin !== segmentLength / 2) power *= 2;
      powers[bin] += power;
    }
    segmentCount += 1;
  }

  state.powerSpectrum = Array.from(powers, (power, bin) => ({
    frequency: (bin * sampleRate) / segmentLength,
    density: segmentCount ? power / segmentCount : 0,
  }));
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

  const count = state.annualMeans.length;
  const meanYear = state.annualMeans.reduce((sum, item) => sum + item.year, 0) / (count || 1);
  const meanAnomaly = state.annualMeans.reduce((sum, item) => sum + item.mean, 0) / (count || 1);
  let covariance = 0;
  let variance = 0;
  for (const item of state.annualMeans) {
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
  elements.readingValue.innerHTML = `${formatAnomaly(record.anomaly_celsius)}<span> °C</span>`;
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
  elements.surfaceTooltip.innerHTML =
    `<strong>${formatMonth(point.record)}</strong><br>${formatAnomaly(point.record.anomaly_celsius)} °C anomaly`;
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

  const padding = { top: 28, right: 3, bottom: 12, left: 3 };
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

function setSelectedIndex(index, soundIfPlaying) {
  stopActiveNotes();
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
    state.activeNotes.delete(activeNote);
    oscillator.disconnect();
    filter.disconnect();
    envelope.disconnect();
    tremolo.disconnect();
    pulse.disconnect();
    pulseDepth.disconnect();
  };
  const activeNote = { oscillator, pulse, envelope };
  state.activeNotes.add(activeNote);
  oscillator.start(now);
  pulse.start(now);
  oscillator.stop(now + duration + 0.02);
  pulse.stop(now + duration + 0.02);
  state.lastSoundedIndex = state.index;
}

function stopActiveNotes() {
  if (!state.audioContext) return;
  const now = state.audioContext.currentTime;
  for (const note of state.activeNotes) {
    note.envelope.gain.cancelScheduledValues(now);
    note.envelope.gain.setTargetAtTime(0.0001, now, 0.006);
    note.oscillator.stop(now + 0.025);
    note.pulse.stop(now + 0.025);
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
