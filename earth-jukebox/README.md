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
- Chart cursor, measurement, date, and sound all use the same observation.
- Play, pause/resume, stop, seek, playback speeds (0.5×–4×), and volume controls.
- Responsive desktop and mobile layouts, keyboard-operable controls, and a visible first-30-seconds demo flow.
- Accessible explanation of the measurement, data source, transformation, and scientific limitations.
- Reproducible, dependency-free static production build.

## Scientific source and limits

- **Dataset:** NASA GISTEMP v4 global mean land–ocean temperature anomalies, in °C relative to 1951–1980; monthly observations from the preserved source data.
- **Processing:** The original NASA CSV remains in `data/raw/`. The standardized JSON in `data/processed/` excludes missing observations; it does not replace them with zero or interpolate values.
- **Sonification:** Pitch, tremolo rate, and filter cutoff are artistic mappings normalized over the observed record's minimum and maximum. They are not additional scientific measurements.
- **Geography:** This is a global series without geographic resolution; the application does not imply location or use spatial audio.
- **Video:** The NASA Climate Spiral asset is not synchronized to the audio or timeline. No frame-to-month timing is inferred.
- **Browser:** Audio requires a browser with Web Audio support and a user gesture to start. Browsers may require serving the files over HTTP rather than opening the HTML directly.

For source details, see [docs/data_sources.md](docs/data_sources.md).
