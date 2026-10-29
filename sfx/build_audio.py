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
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48_000
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


# ---------------------------------------------------------------------------
# DSP helpers (numpy only)
# ---------------------------------------------------------------------------

def band(x: np.ndarray, lo: float, hi: float, soft: float = 0.25) -> np.ndarray:
    """Zero-phase band-pass through an FFT mask with soft (log-domain) edges."""
    n = len(x)
    pad = 1 << int(np.ceil(np.log2(max(n, 2) * 2)))
    spec = np.fft.rfft(x, pad)
    f = np.fft.rfftfreq(pad, 1 / SR)
    lf = np.log2(np.maximum(f, 1.0))
    mask = np.ones_like(f)
    if lo > 0:
        mask *= 1 / (1 + np.exp(-(lf - np.log2(lo)) / soft))
    if hi < SR / 2:
        mask *= 1 / (1 + np.exp((lf - np.log2(hi)) / soft))
    return np.fft.irfft(spec * mask, pad)[:n]


def env_exp(n: int, tau: float, attack: float = 0.0004) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1) if attack > 0 else 1.0
    return a * np.exp(-t / tau)


def pink(n: int, rng: np.random.Generator) -> np.ndarray:
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec /= np.sqrt(np.maximum(f, 20.0))
    y = np.fft.irfft(spec, n)
    return y / (np.max(np.abs(y)) + 1e-9)


def place(buf: np.ndarray, sig: np.ndarray, t: float, gain: float, pan: float) -> None:
    """Add a mono signal into the stereo buffer at time t with constant-power pan."""
    i = int(round(t * SR))
    if i >= buf.shape[0]:
        return
    sig = sig[: buf.shape[0] - i]
    ang = (pan + 1) * np.pi / 4
    buf[i : i + len(sig), 0] += sig * gain * np.cos(ang)
    buf[i : i + len(sig), 1] += sig * gain * np.sin(ang)


# ---------------------------------------------------------------------------
# Sound designs
# ---------------------------------------------------------------------------

def key_click(rng: np.random.Generator, kind: str) -> np.ndarray:
    """A laptop scissor-switch key: bright tick + soft plastic thock + release."""
    n = int(0.16 * SR)
    out = np.zeros(n)
    jitter = rng.uniform(0.85, 1.18)

    if kind == "space":
        body_f, body_tau, tick_gain, thump_f = 900 * jitter, 0.022, 0.7, 150 * jitter
    elif kind == "enter":
        body_f, body_tau, tick_gain, thump_f = 1000 * jitter, 0.020, 1.0, 170 * jitter
    else:
        body_f, body_tau, tick_gain, thump_f = 1500 * jitter, 0.011, 0.85, 230 * jitter

    # bright transient
    m = int(0.012 * SR)
    tick = band(rng.standard_normal(m), 2600 * jitter, 7500) * env_exp(m, 0.0016)
    out[:m] += tick * tick_gain * 2.2

    # plastic body
    m = int(0.08 * SR)
    body = band(rng.standard_normal(m), body_f * 0.35, body_f * 1.6) * env_exp(m, body_tau, 0.0008)
    out[:m] += body * 1.4

    # low desk thump
    t = np.arange(m) / SR
    out[:m] += np.sin(2 * np.pi * thump_f * t) * env_exp(m, body_tau * 1.2, 0.001) * 0.35

    if kind == "space":
        # stabiliser rattle: second softer hit a few ms later
        d = int(0.007 * SR)
        mm = int(0.02 * SR)
        out[d : d + mm] += band(rng.standard_normal(mm), 1800, 5000) * env_exp(mm, 0.003) * 0.6

    # key release (the key coming back up)
    rel = int(rng.uniform(0.07, 0.1) * SR)
    mm = int(0.012 * SR)
    out[rel : rel + mm] += band(rng.standard_normal(mm), 3200, 8000) * env_exp(mm, 0.0012) * 0.55

    return out / (np.max(np.abs(out)) + 1e-9)


def crickets(n: int, rng: np.random.Generator) -> np.ndarray:
    """Faint distant crickets heard through the window."""
    out = np.zeros(n)
    for f0, period, phase in ((4300, 0.92, 0.21), (4750, 1.13, 0.63)):
        t_chirp = phase
        while t_chirp < n / SR:
            pulses = int(rng.integers(3, 5))
            for p in range(pulses):
                st = int((t_chirp + p * 0.034) * SR)
                m = int(0.018 * SR)
                if st + m >= n:
                    break
                tt = np.arange(m) / SR
                win = np.sin(np.pi * np.arange(m) / m) ** 2
                out[st : st + m] += np.sin(2 * np.pi * f0 * tt) * win
            t_chirp += period * rng.uniform(0.93, 1.07)
    return band(out, 2500, 7000)


def room_reverb(x: np.ndarray, rng: np.random.Generator, length: float = 0.32, mix: float = 0.16) -> np.ndarray:
    """Small bedroom reverb: convolution with a decaying filtered-noise impulse response."""
    m = int(length * SR)
    ir = rng.standard_normal(m) * np.exp(-np.arange(m) / (0.07 * SR))
    ir = band(ir, 250, 5000)
    ir[: int(0.004 * SR)] = 0  # pre-delay
    ir /= np.sqrt(np.sum(ir**2))
    out = np.empty_like(x)
    for c in range(x.shape[1]):
        nfft = 1 << int(np.ceil(np.log2(len(x) + m)))
        wet = np.fft.irfft(np.fft.rfft(x[:, c], nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x)]
        out[:, c] = x[:, c] + wet * mix
    return out


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


def write_wav(path: Path, data: np.ndarray) -> None:
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


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
