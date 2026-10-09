# Veyra — Motion-Graphics Ads

Two fully code-rendered ads in Veyra's brand system.

| Film | File | Length | Concept |
|------|------|--------|---------|
| 1 — Product film | `out/veyra_ad_2min.mp4` (copy at `marketing/veyra_ad_2min.mp4`) | 120 s | Problem → reframe → product tour → offer → CTA. Kinetic type + animated app UI. |
| 2 — "Meet Amara" | `out/veyra_ad_amara_80s.mp4` (copy at `marketing/veyra_ad_amara_80s.mp4`) | 80 s | Narrator-led character story: a freelancer's chaos, the subscription trap (HoneyBook, Dubsado, Bonsai, ClickUp), the 5-year math ($2,400 vs $79), the privacy switch, the payoff. |

Both: 1920×1080 · 30 fps · H.264 + AAC · cream drafting paper `#fbfaf8`,
ink `#17150f`, bronze `#8a6320`, amber `#b8842a`, Fraunces / Inter / IBM Plex
Mono. Only Veyra's own copy and claims are used — no invented testimonials.

## Film 2 — how it works

A pure motion-graphics cut driven by a **virtual camera** (`CAM` /
`PUNCHES` in `storyboard2.py`): slow push-ins, hard punch-in cuts that land
on beats of the narrator voice, pull-back reveals on the wordmark, and
hit-zooms on impacts. The scene renders at 4K and the camera crops/scales
to 1080p, so punches stay sharp.

- **Amara** appears as a clean circle portrait (`portrait()`) — happy while
  things are fine, worried when the chaos chips close in. No rig, no limbs,
  nothing to break.
- **Narrator voice**: Microsoft neural voice `en-US-AndrewNeural` via
  edge-tts. Each line is synthesized separately, measured, and the whole
  scene timeline is generated from the audio (`vo_synth.py` →
  `vo2/timings.py`), so every camera beat lands on the voice.
- **Competitor beat**: punch-ins onto each card as it's named (HoneyBook,
  Dubsado, Bonsai, ClickUp) + recurring "$ / MO" meters that fill and
  recharge forever, then a hit-zoom on the "NOT YOUR CLOUD" stamp. No logo
  artwork is copied — names only.
- **The math**: the camera pushes in on the counter as it climbs to $2,400,
  then cuts to the $79 card with the "KEEP $2,321" chip.
- **Music** (`audio2.py`): 100 BPM F-major score, ducked 4.5 dB under every
  narrator line; full-band release at "Then Amara found Veyra."

## Rebuild pipeline

```bash
pip install pillow numpy scipy edge-tts   # once
# Film 1
python render.py all && python audio.py
ffmpeg -framerate 30 -i frames/f_%05d.png -i audio/track.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart -shortest out/veyra_ad_2min.mp4
# Film 2
python vo_synth.py      # narrator + timeline + lip-sync envelope
python render2.py all   # frames2/ (~2 min, 10 workers)
python audio2.py        # vo + score + sfx -> audio/track2.wav
ffmpeg -framerate 30 -i frames2/f_%05d.png -i audio/track2.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart -shortest out/veyra_ad_amara_80s.mp4
```

## Files

- `engine.py` — drawing primitives, easing, typography, widgets
- `storyboard.py` / `render.py` — film 1 scenes + cue sheet (ad-1 SFX)
- `avatar.py` — Amara, the animated avatar
- `vo_synth.py` → `vo2/` — narrator lines, `timings.py`, `mouth.npy`
- `storyboard2.py` / `render2.py` — film 2 scenes (reads `vo2/timings.py`)
- `audio.py` / `audio2.py` — synth toolkit, film scores, SFX engines
- `fonts/` — Fraunces, Inter, IBM Plex Mono (OFL, from google/fonts)

Preview any moment without a full render:
`python render2.py stills 4.5 31.0 54.5` → `qa2/*.png`.
