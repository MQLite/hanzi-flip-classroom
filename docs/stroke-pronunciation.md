# Mandarin stroke recordings

`撇` is explicitly synthesized as **piě (third tone)**. The generator wraps every
occurrence in `<phoneme alphabet="x-microsoft-sapi" ph="pie 3">撇</phoneme>` and
calls `System.Speech.Synthesis.SpeechSynthesizer.SpeakSsml`. The text inside the
element, filenames, and the catalog's displayed stroke names remain Chinese.
This covers 撇、横撇、撇折、撇点、横折折撇、横撇弯钩、竖折撇.

Microsoft documents [SpeakSsml and SSML 1.0](https://learn.microsoft.com/en-us/dotnet/api/system.speech.synthesis.speechsynthesizer.speakssml?view=netframework-4.8.1)
and [zh-CN SAPI numbered Pinyin tones](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-ssml-phonetic-sets#zh-cn).
The second reference describes the Speech service's phone notation; local
compatibility with the Windows Huihui Desktop engine was verified directly,
including the desktop `x-microsoft-sapi` alphabet spelling.

## Rebuild and verify

On Windows with the **Microsoft Huihui Desktop** Mandarin voice installed:

```powershell
./scripts/prepare-stroke-audio.ps1 -PlanOnly  # Inspect all SSML without a voice or writes.
./scripts/prepare-stroke-audio.ps1
npx vitest run tests/stroke-pronunciation.test.js tests/stroke-audio.test.js
```

The generator requires a `zh-CN` voice and stages all 29 WAV files before replacing
the published assets. It rejects invalid WAV, non-16-bit PCM, durations below
150 ms, RMS at or below 0.005, or peaks at or below 0.05 (normalized full scale).
The manifest stores each exact SSML request, SHA-256, byte count, audio metrics,
voice ID, rate, pronunciation overrides, documentation sources, and asset version
`mandarin-pie3-v1`. Windows speech enumeration can differ in a sandbox; run with
access to the installed native voice if the sandbox only exposes an English voice.
No network speech service, credentials, or additional paid dependency is used.

## Verification evidence

Native Huihui Desktop synthesis at rate -2 succeeded for all 29 recordings.
The regression suite checks the complete catalog asset set, every 撇 occurrence's
executable `pie 3` phoneme, the generator's independently rebuilt SSML plan,
non-silent PCM samples, and matching manifest hashes and measurements.

A native control experiment synthesized the same `撇折` request with `pie 1` and
`pie 3`, changing only the tone digit. The final `撇折.wav` exactly matches the
`pie 3` control SHA-256:

```text
pie 1: aa61b07431c01bd9ba7549cdb314fe1b466ffc873ad44f4e8ea05fd4b1c3f1f6
pie 3: 07c9a5534d36bea95df1bb59e68b7700837fce74d8ca4f4c3ad7358ae60e1c51
```

A 40 ms normalized-autocorrelation analysis, sampled every 10 ms, estimated
the first syllable at 0.24 / 0.29 / 0.34 / 0.39 seconds as:

| Request | Estimated F0 (Hz) |
| --- | --- |
| `pie 1` | 248 / 245 / 245 / 242 |
| `pie 3` and final WAV | 212 / 202 / 175 / 159 |

The changed waveform and falling first-syllable pitch support that the engine
applied the requested tone override. This is technical verification, not a claim
of subjective listening or an independent human pronunciation review.
