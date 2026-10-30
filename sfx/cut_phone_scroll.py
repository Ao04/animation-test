"""Sound for the cut "phoneScroll" (reads the cut's timeline.json).

Outputs public/cuts/phone_scroll.wav (48 kHz stereo). Run:
    python3 sfx/cut_phone_scroll.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from lib import SR, band, env_exp, key_click, pink, place, room_reverb, write_wav

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src/cuts/phoneScroll/timeline.json").read_text())
SEED = 21

# character sits a little left of centre, the phone left-centre, the clock right
PAN_BODY = -0.15
PAN_PHONE = -0.08
PAN_CLOCK = 0.25


def hann_env(n: int) -> np.ndarray:
    return np.sin(np.pi * np.arange(n) / max(n - 1, 1)) ** 2


def breath(rng, dur: float, lo: float, hi: float, attack: float) -> np.ndarray:
    """Airy breath noise with a shaped envelope (attack fraction of the duration)."""
    n = int(dur * SR)
    x = band(rng.standard_normal(n), lo, hi)
    t = np.linspace(0, 1, n)
    env = np.where(t < attack, (t / attack) ** 1.5, ((1 - t) / (1 - attack)) ** 2)
    return x / (np.max(np.abs(x)) + 1e-9) * env


def buzz(rng, dur: float) -> np.ndarray:
    """Phone vibration motor rattling on a wooden table."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 168 + 4 * np.sin(2 * np.pi * 3 * t)
    phase = 2 * np.pi * np.cumsum(f) / SR
    motor = np.tanh(3.5 * np.sin(phase))  # square-ish
    rattle = band(rng.standard_normal(n), 300, 2400) * (0.5 + 0.5 * np.sign(np.sin(phase)))
    x = band(motor, 120, 3000) + rattle * 0.35
    a = int(0.012 * SR)
    env = np.ones(n)
    env[:a] = np.linspace(0, 1, a)
    env[-a:] = np.linspace(1, 0, a)
    return x / (np.max(np.abs(x)) + 1e-9) * env


def rustle(rng, dur: float) -> np.ndarray:
    """Fabric rustle: grains of filtered noise under a slow envelope."""
    n = int(dur * SR)
    x = band(rng.standard_normal(n), 900, 7000)
    grains = np.convolve(np.abs(rng.standard_normal(n)) ** 3, np.hanning(int(0.012 * SR)), "same")
    grains /= np.max(grains) + 1e-9
    x = x * (0.25 + grains) * hann_env(n)
    return x / (np.max(np.abs(x)) + 1e-9)


def creak(rng) -> np.ndarray:
    """Floor-chair hinge creak (stick-slip pulses) + soft cushion thump."""
    n = int(0.32 * SR)
    out = np.zeros(n)
    t = 0.0
    rate = 55.0
    while t < 0.22:
        i = int(t * SR)
        m = int(0.006 * SR)
        if i + m < n:
            out[i : i + m] += band(rng.standard_normal(m), 600, 2600) * env_exp(m, 0.0015) * (1 - t / 0.25)
        rate = max(30.0, rate - 1.2)
        t += 1 / rate * rng.uniform(0.85, 1.15)
    m = int(0.12 * SR)
    tt = np.arange(m) / SR
    out[:m] += (np.sin(2 * np.pi * 85 * tt) * env_exp(m, 0.035, 0.004) * 1.6 + band(rng.standard_normal(m), 90, 500) * env_exp(m, 0.03) * 0.8)
    return out / (np.max(np.abs(out)) + 1e-9)


def tick(rng, bright: float = 1.0) -> np.ndarray:
    n = int(0.03 * SR)
    x = band(rng.standard_normal(n), 1500 * bright, 7000) * env_exp(n, 0.0012)
    tt = np.arange(n) / SR
    x += np.sin(2 * np.pi * 2900 * bright * tt) * env_exp(n, 0.004) * 0.3
    return x / (np.max(np.abs(x)) + 1e-9)


def swipe(rng) -> np.ndarray:
    n = int(0.08 * SR)
    x = band(rng.standard_normal(n), 2500, 8000) * hann_env(n)
    x[: int(0.004 * SR)] += band(rng.standard_normal(int(0.004 * SR)), 3000, 9000) * 2
    return x / (np.max(np.abs(x)) + 1e-9)


def main() -> None:
    rng = np.random.default_rng(SEED)
    dur = TL["duration"]
    n = int(dur * SR)
    foley = np.zeros((n, 2))

    for k in TL["keys"]:
        place(foley, key_click(rng, "key"), k["t"], rng.uniform(0.2, 0.26), 0.08 if k["hand"] == "near" else 0.02)

    s0, s1, s2 = TL["sigh"]
    place(foley, breath(rng, s1 - s0, 700, 3800, 0.8), s0, 0.05, PAN_BODY)  # inhale
    place(foley, breath(rng, s2 - s1 + 0.1, 280, 2200, 0.12), s1, 0.13, PAN_BODY)  # exhale

    for a, b in TL["buzz"]:
        place(foley, buzz(rng, b - a), a, 0.055, PAN_PHONE)

    r0, r1 = TL["reach"]
    place(foley, rustle(rng, r1 - r0 + 0.1), r0, 0.05, PAN_BODY)
    # picking the phone up: a small tap + slide off the wood
    place(foley, tick(rng, 0.7), r1, 0.09, PAN_PHONE)
    m = int(0.09 * SR)
    place(foley, band(rng.standard_normal(m), 800, 4000) * hann_env(m), r1 + 0.02, 0.035, PAN_PHONE)

    l0, l1 = TL["lift"]
    place(foley, rustle(rng, l1 - l0 + 0.15), l0, 0.08, PAN_BODY)
    place(foley, creak(rng), TL["creak"], 0.11, PAN_BODY - 0.1)

    for s in TL["scrolls"]:
        place(foley, swipe(rng), s, 0.022, PAN_BODY + 0.05)

    for c in TL["ticks"]:
        place(foley, tick(rng), c, 0.05, PAN_CLOCK)

    foley = room_reverb(foley, rng, length=0.3, mix=0.2)

    amb = np.zeros((n, 2))
    t = np.arange(n) / SR
    for c in range(2):
        amb[:, c] += band(pink(n, rng), 30, 700) * 0.007  # room tone + distant city
    hum = sum(np.sin(2 * np.pi * f * t + p) * g for f, p, g in ((50, 0.3, 1.0), (100, 1.1, 0.5), (150, 2.0, 0.25)))
    amb += (hum * 0.0012)[:, None]  # fridge in the kitchenette
    # a car passing far away outside (window is on the right)
    car = band(rng.standard_normal(n), 250, 1800) * np.exp(-((t - 2.2) / 0.9) ** 2)
    car = car / np.max(np.abs(car)) * 0.006
    pan = np.clip((t - 1.0) / 2.4, 0, 1) * 0.6 + 0.2
    amb[:, 0] += car * np.cos((pan + 1) * np.pi / 4)
    amb[:, 1] += car * np.sin((pan + 1) * np.pi / 4)

    mix = foley + amb
    # short fades only to avoid clicks: cuts are meant to be edited
    fi = int(0.01 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[-fi:] *= np.linspace(1, 0, fi)[:, None]
    mix /= np.max(np.abs(mix))
    drive = 1.8
    mix = np.tanh(mix * drive) / np.tanh(drive)
    mix *= 10 ** (-1.0 / 20) / np.max(np.abs(mix))

    out = ROOT / "public/cuts/phone_scroll.wav"
    write_wav(out, mix)
    print(f"-> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
