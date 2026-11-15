# EARTH JUKEBOX

**Hear the climate record, month by month.**

EARTH JUKEBOX turns NASA GISTEMP v4 global temperature anomalies into an interactive, data-driven sound. It is an artistic sonification of measurements, **not a recording of the planet**.

## Run locally

From the repository root, build the static application and start a local HTTP server:

```powershell
python -m processing.build_site
python -m http.server 8000 --directory dist
```

Open [http://localhost:8000](http://localhost:8000). Use a modern browser with Web Audio support and turn on audio after pressing **Play Earth**. The app loads its bundled NASA JSON, so the browser does not need external data access.

To regenerate the standardized JSON from the preserved NASA source CSV before building:

```powershell
python -m pip install pandas
python -m processing.generate_dataset
python -m processing.build_site
python -m http.server 8000 --directory dist
```

The static build uses only Python's standard library. The optional JSON regeneration uses the existing Pandas-based data pipeline; no frontend packages or build dependencies are added.

## 30-second demonstration

1. **0–10 seconds:** Point out that the number is a temperature *anomaly* in °C relative to 1951–1980, not an absolute temperature.
2. **10–20 seconds:** Press **Play Earth**. Each note is one available month; the chart cursor and displayed date move with that same observation.
3. **20–30 seconds:** Listen for pitch, pulse, and brightness changing with the measurements. Pause, seek, or change playback speed to explore.

## Completed experience

- NASA GISTEMP v4 monthly JSON loads from the locally bundled dataset; the client checks its structure and chronological order.
- Web Audio sonifies each selected observation. Higher anomalies within the observed series produce higher pitch, faster tremolo, and a brighter low-pass filter.
- Interactive Canvas 3D climate surface and monthly-bar view use the actual year/month/anomaly observations. Drag to rotate, scroll to zoom, Shift-drag to pan; select a point to seek. Missing values are left as gaps.
- One selected observation synchronizes the climate surface, timeline, current reading, audio parameter readouts, and sound. Year-range controls filter the visual analyses; they do not alter or fabricate the source record.
- Live waveform, audio spectrum, and rolling spectrogram are read from a Web Audio `AnalyserNode` connected to the audible output.
- Temperature power spectrum uses a Welch periodogram: contiguous monthly runs only, per-segment linear detrending, Hann windows up to 256 months, 50% overlap, and averaged one-sided power spectral density. Frequency is cycles/year, not audio Hz; density is °C²/(cycle/year).
- Annual averages use the available observations in each displayed year; calendar-month averages are derived from available values. A simple OLS fit across annual averages is labeled as a descriptive indicator, not attribution or projection.
- Click the annual or calendar-month charts to select the corresponding closest actual monthly record. Full-screen buttons, reset camera, mesh/observation visibility, and 3D surface/bar views are available.
- Play, pause/resume, stop, seek, playback speeds (0.5×–4×), and volume controls.
- Responsive desktop and mobile layouts, keyboard-operable controls, and a visible first-30-seconds demo flow.
- Accessible explanation of the measurement, data source, transformation, and scientific limitations.
- Reproducible, dependency-free static production build. No frontend packages or external charting or 3D library are required; Canvas 2D provides the interactive 3D projection and 2D scientific charts.

## Scientific source and limits

- **Dataset:** NASA GISTEMP v4 global mean land–ocean temperature anomalies, in °C relative to 1951–1980; monthly observations from the preserved source data.
- **Processing:** The original NASA CSV remains in `data/raw/`. The standardized JSON in `data/processed/` excludes missing observations; it does not replace them with zero or interpolate values.
- **Sonification:** Across the observed record's minimum-to-maximum range, pitch maps exponentially from 220 to about 562 Hz; tremolo rate and filter cutoff map linearly from 1.5–6.5 Hz and 450–3,500 Hz. These are artistic mappings, not additional scientific measurements.
- **Derived analyses:** The power spectrum, annual means, calendar-month means, and OLS slope are calculated indicators, not fields provided by NASA. Welch frequency is climate-series variability in cycles/year, never acoustic frequency. Annual values with fewer source months are means of the months actually present.
- **Audio visualization:** Waveform, spectrum, and spectrogram measure the generated Web Audio output. They are unavailable until playback creates/resumes the audio context; they do not represent climate measurements.
- **Rendering:** The interactive 3D view is an orthographic/perspective Canvas 2D projection, not a WebGL surface. It supports pointer rotation, zoom, pan, data selection, and a 2D-rendered fallback, but not a geographic globe or spatially resolved climate field.
- **Audio layers:** Earth Melody (oscillator pitch), Earth Pulse (tremolo), and Earth Atmosphere (filter cutoff) are implemented. Earth Drift/spatial motion is not implemented and is displayed as inactive.
- **Geography:** This is a global series without geographic resolution; the application does not imply location or use spatial audio.
- **Video:** The NASA Climate Spiral asset is not synchronized to the audio or timeline. No frame-to-month timing is inferred.
- **Browser:** Audio requires a browser with Web Audio support and a user gesture to start. Browsers may require serving the files over HTTP rather than opening the HTML directly.

For source details, see [docs/data_sources.md](docs/data_sources.md).
