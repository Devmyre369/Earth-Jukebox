# EARTH JUKEBOX

EARTH JUKEBOX sonifies NASA GISTEMP v4 monthly global temperature anomalies. Synthesized audio is an artistic rendering of measurements, not a recording of Earth or an acoustic measurement.

## Run locally (Windows PowerShell)

From the `earth-jukebox` project directory:

```powershell
python -m processing.build_site
python -m http.server 8000 --directory dist
```

Open <http://localhost:8000/>. Stop the local server with `Ctrl+C`.

The production build validates and copies the bundled NASA JSON and static frontend into `dist`. No frontend package installation or backend service is required. Python is only needed to build and serve the static files.

## Listen and explore

1. Select an observation on the timeline and note its anomaly in °C relative to 1951–1980.
2. Press **Play Earth**. The selected date, timeline, scientific plots, and generated audio follow the same playback index. Use the timeline to seek, **Pause**/**Play Earth** to pause and resume, **Stop** to return to the first observation, and **Speed** to change the interval between observations.
3. Open **EARTH SOUND STUDIO** to choose a palette or individual instrument. The scientific measurements and mappings do not change.
4. Adjust layer and master levels, disable or solo layers, mute, or enable optional reverb and delay. **Reset sound** restores the Scientific palette defaults. **Preview** auditions an isolated synthesized sound-design tone and does not advance or change the data timeline.
5. View the live waveform, frequency spectrum, and spectrogram. They are read from the Web Audio analyser connected to the audible output, including any active preview. Audio frequency is distinct from climate variability frequency.

### Palettes

- **Scientific:** piano, wooden ticks, and harmonic drone; dry and restrained.
- **Ambient:** soft strings, heartbeat-style pulse, and ambient pad; gentle space.
- **Orchestral:** soft strings, soft percussion, and atmospheric strings.
- **Electronic:** synth lead, electronic percussion, and evolving synth texture.
- **Cinematic:** bell, minimal electronic beat, and soft cinematic texture.

Changing a palette or instrument changes synthesis and optional effects only. A manual instrument, level, enable, or effect edit changes the palette label to **Custom**.

## Data-to-sound mapping

- **Earth Melody — pitch:** the observed monthly anomaly is normalized against the record's minimum and maximum, then mapped exponentially to oscillator frequency. Lower and higher anomalies remain distinguishable.
- **Earth Pulse — rhythm and intensity:** the absolute difference from the previous *consecutive observed month* is normalized against the largest consecutive-month change in the bundled record. It controls pulse rate and strength. No prior month, unchanged observations, or a gap produce no pulse event.
- **Earth Atmosphere — timbre:** the population standard deviation of up to 12 consecutive observations ending at the selected month controls harmonic richness and low-pass brightness. A gap is not bridged; fewer than two observations yield no atmosphere voice.
- Playback speed changes the shared interval between observations. Instrument envelopes, layer gains, and effect sends use smoothed transitions. A dynamics compressor limits combined output peaks.

Annual means, seasonal means, trend, and the temperature power spectrum are calculated indicators, not raw NASA observations. The power spectrum is computed from contiguous monthly records and uses cycles per year; it is not an audio spectrum. The NASA Climate Spiral is not synchronized to the timeline.

## Data source and integrity

The application uses the checked-in standardized monthly JSON at `data/processed/global_temperature_monthly.json`, sourced from [NASA GISTEMP](https://data.giss.nasa.gov/gistemp/). It preserves the supplied observation values, dates, and omissions. The dataset is global and has no geographic coordinates. The 3D-style surface is a 2D-canvas projection of the monthly record, not a geographic globe or WebGL model.

## Validation

```powershell
node --check web\app.js
python -m processing.build_site
```

## Current limitations

- Instruments are synthesized with the Web Audio API; they are not sampled recordings of physical instruments or environmental sounds.
- The surface is rendered with Canvas 2D and does not encode geographic locations.
- Earth Drift/spatial motion is not implemented.
- No NASA video frame-to-month synchronization is claimed.
- Web Audio requires browser support and a user gesture to start playback or preview.
