"""Generate the typing timeline and all sound effects for the scene.

Single source of truth for timing:
  * writes src/timeline.json  (read by the Remotion/Canvas animation)
  * writes public/sfx.wav     (48 kHz stereo, mixed soundtrack)

Every sound is synthesised from noise / sine waves with numpy only,
so the result is deterministic and can be tweaked by editing the
constants below and re-running:  python3 sfx/build_audio.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from lib import SR, band, crickets, key_click, pink, place, room_reverb, write_wav

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
DURATION = 4.0
SEED = 7

# ---------------------------------------------------------------------------
# Timeline
# ---------------------------------------------------------------------------
# Typing bursts (start, end) in seconds. Between them the character pauses
# and reads the screen; at ENTER_T she confirms with the Enter key.
BURSTS = [(0.12, 1.42), (1.98, 3.12)]
PAUSE = (1.42, 1.98)
ENTER_T = 3.42
BLINKS = [1.66, 3.74]


def build_timeline(rng: np.random.Generator) -> dict:
    keys: list[dict] = []
    last_hand = "L"
    last_finger_time: dict[tuple[str, int], float] = {}

    for t0, t1 in BURSTS:
        t = t0
        while t < t1:
            word = int(rng.integers(3, 7))
            for _ in range(word):
                if t >= t1:
                    break
                hand = last_hand if rng.random() > 0.68 else ("R" if last_hand == "L" else "L")
                # pick a finger that hasn't been used too recently on this hand
                for _try in range(6):
                    finger = int(rng.integers(0, 3))
                    if t - last_finger_time.get((hand, finger), -1) > 0.17:
                        break
                row = int(rng.choice([0, 1, 2], p=[0.18, 0.5, 0.32]))
                keys.append({"t": round(t, 4), "hand": hand, "finger": finger, "row": row, "kind": "key"})
                last_finger_time[(hand, finger)] = t
                last_hand = hand
                t += float(rng.uniform(0.085, 0.145))
            if t < t1 - 0.1:
                t += float(rng.uniform(0.02, 0.06))
                keys.append({"t": round(t, 4), "hand": "R", "finger": -1, "row": 0, "kind": "space"})
                t += float(rng.uniform(0.11, 0.17))

    keys.append({"t": ENTER_T, "hand": "R", "finger": 2, "row": 1, "kind": "enter"})
    return {
        "fps": FPS,
        "duration": DURATION,
        "keys": keys,
        "pause": list(PAUSE),
        "enter": ENTER_T,
        "blinks": BLINKS,
    }


def build_audio(timeline: dict, rng: np.random.Generator) -> np.ndarray:
    n = int(DURATION * SR)
    keys_bus = np.zeros((n, 2))

    for k in timeline["keys"]:
        sig = key_click(rng, k["kind"])
        if k["kind"] == "enter":
            gain = 0.48
        elif k["kind"] == "space":
            gain = 0.40
        else:
            gain = rng.uniform(0.26, 0.36)
        # the laptop sits slightly right of centre; left/right hands spread a little
        pan = 0.18 + (0.06 if k["hand"] == "R" else -0.06) + rng.uniform(-0.02, 0.02)
        place(keys_bus, sig, k["t"], gain, pan)

    keys_bus = room_reverb(keys_bus, rng)

    amb = np.zeros((n, 2))
    # room tone: soft pink noise, darker on one side
    for c in range(2):
        amb[:, c] += band(pink(n, rng), 40, 900) * 0.022
    # laptop fan: gentle band of noise with slow wobble
    t = np.arange(n) / SR
    fan = band(rng.standard_normal(n), 260, 1400) * (1 + 0.12 * np.sin(2 * np.pi * 0.7 * t))
    fan = fan / np.max(np.abs(fan)) * 0.012
    amb[:, 0] += fan * 0.8
    amb[:, 1] += fan * 1.0
    # distant crickets outside the window (window is right of frame)
    cr = crickets(n, rng)
    cr = cr / (np.max(np.abs(cr)) + 1e-9) * 0.018
    amb[:, 0] += cr * 0.55
    amb[:, 1] += cr * 1.0

    mix = keys_bus + amb

    # fades
    fi, fo = int(0.05 * SR), int(0.25 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5

    # gentle soft-limiter: lifts the quieter keystrokes, tames the Enter peak
    mix /= np.max(np.abs(mix))
    drive = 2.2
    mix = np.tanh(mix * drive) / np.tanh(drive)
    mix *= 10 ** (-1.0 / 20) / np.max(np.abs(mix))
    return mix


def main() -> None:
    rng = np.random.default_rng(SEED)
    timeline = build_timeline(rng)
    (ROOT / "src").mkdir(exist_ok=True)
    (ROOT / "src" / "timeline.json").write_text(json.dumps(timeline, indent=2) + "\n")
    audio = build_audio(timeline, rng)
    write_wav(ROOT / "public" / "sfx.wav", audio)
    print(f"{len(timeline['keys'])} keystrokes -> src/timeline.json, public/sfx.wav")


if __name__ == "__main__":
    main()
