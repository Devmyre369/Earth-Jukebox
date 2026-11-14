
import subprocess
from pathlib import Path
import imageio_ffmpeg

video = Path(
    "assets/nasa/GISTEMP_Spiral_English_degC_2160p60.mp4"
)

output_dir = Path("assets/nasa/preview_frames")
output_dir.mkdir(parents=True, exist_ok=True)

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

timestamps = [0, 7.5, 15, 22.5, 29]

for timestamp in timestamps:
    output_file = output_dir / f"frame_{timestamp:04.1f}s.jpg"

    command = [
        ffmpeg,
        "-y",
        "-ss", str(timestamp),
        "-i", str(video),
        "-frames:v", "1",
        "-q:v", "2",
        str(output_file)
    ]

    subprocess.run(
        command,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    print(f"Extracted: {output_file}")

print("\nPreview extraction completed.")
