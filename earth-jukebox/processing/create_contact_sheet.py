
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.image as mpimg

folder = Path("assets/nasa/preview_frames")

files = sorted(
    folder.glob("frame_*.jpg")
)

if not files:
    raise FileNotFoundError("No preview frames found.")

fig, axes = plt.subplots(
    1,
    len(files),
    figsize=(18, 5)
)

for ax, file in zip(axes, files):
    image = mpimg.imread(file)
    ax.imshow(image)
    ax.set_title(file.stem)
    ax.axis("off")

plt.tight_layout()

output = folder / "contact_sheet.jpg"

plt.savefig(
    output,
    dpi=150,
    bbox_inches="tight"
)

plt.close()

print("Contact sheet saved:", output)
print("Frames included:", len(files))
