param(
  [string]$VoiceName = 'Microsoft Huihui Desktop',
  [switch]$PlanOnly
)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path $PSScriptRoot -Parent
$catalogPath = Join-Path $projectPath 'src/data/character-forms.json'
$catalog = Get-Content -LiteralPath $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json
$audioPath = Join-Path $projectPath 'public/audio/stroke-names'

# Override the polyphonic character in every stroke name, rather than trusting
# the voice's word segmentation/dictionary to choose pie3 instead of pie1.
$characterOverrides = @([ordered]@{ text='撇'; phonemes='pie 3'; pinyin='piě'; tone=3 })
$recordings = @(foreach ($strokeName in $catalog.strokeNames) {
  $body = foreach ($character in $strokeName.ToCharArray()) {
    $text = [string]$character
    $escaped = [System.Security.SecurityElement]::Escape($text)
    $override = $characterOverrides | Where-Object { $_.text -eq $text }
    if ($override) { '<phoneme alphabet="x-microsoft-sapi" ph="' + $override.phonemes + '">' + $escaped + '</phoneme>' }
    else { $escaped }
  }
  [pscustomobject][ordered]@{
    name=$strokeName
    ssml=('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="' + [System.Security.SecurityElement]::Escape($VoiceName) + '">' + ($body -join '') + '</voice></speak>')
  }
})
$manifest = [ordered]@{
  schemaVersion=2
  assetVersion='mandarin-pie3-v1'
  voice=$VoiceName
  culture='zh-CN'
  rate=-2
  names=$catalog.strokeNames
  generator='Windows System.Speech / SpeakSsml'
  purpose='Mandarin stroke-name classroom recordings'
  pronunciation=[ordered]@{
    method='SSML phoneme override for every occurrence of 撇'
    alphabet='x-microsoft-sapi'
    characterOverrides=$characterOverrides
    affectedNames=@($catalog.strokeNames | Where-Object { $_.Contains('撇') })
    sources=@(
      [ordered]@{ title='System.Speech SpeakSsml'; url='https://learn.microsoft.com/en-us/dotnet/api/system.speech.synthesis.speechsynthesizer.speakssml?view=netframework-4.8.1' },
      [ordered]@{ title='Microsoft zh-CN SAPI phonetic alphabet and numbered tones'; url='https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-ssml-phonetic-sets#zh-cn' }
    )
  }
  recordings=$recordings
}
if ($PlanOnly) {
  $manifest | ConvertTo-Json -Depth 10
  return
}

function Get-WaveValidation([string]$Path) {
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -lt 44 -or [Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne 'RIFF' -or [Text.Encoding]::ASCII.GetString($bytes, 8, 4) -ne 'WAVE') { throw "Invalid WAV: $Path" }
  $format = $null
  $sampleStart = 0
  $sampleBytes = 0
  for ($offset = 12; $offset + 8 -le $bytes.Length;) {
    $kind = [Text.Encoding]::ASCII.GetString($bytes, $offset, 4)
    $size = [BitConverter]::ToUInt32($bytes, $offset + 4)
    $start = $offset + 8
    if ($start + $size -gt $bytes.Length) { throw "Truncated WAV: $Path" }
    if ($kind -eq 'fmt ') {
      $format = @{ encoding=[BitConverter]::ToUInt16($bytes,$start); channels=[BitConverter]::ToUInt16($bytes,$start+2); sampleRate=[BitConverter]::ToUInt32($bytes,$start+4); bits=[BitConverter]::ToUInt16($bytes,$start+14) }
    }
    if ($kind -eq 'data') { $sampleStart = $start; $sampleBytes = $size }
    $offset = $start + $size + ($size % 2)
  }
  if (!$format -or $format.encoding -ne 1 -or $format.bits -ne 16 -or $sampleBytes -eq 0 -or $sampleBytes % 2 -ne 0) { throw "Expected 16-bit PCM WAV: $Path" }
  $power = 0.0
  $peak = 0.0
  for ($offset = $sampleStart; $offset -lt $sampleStart + $sampleBytes; $offset += 2) {
    $sample = [BitConverter]::ToInt16($bytes, $offset) / 32768.0
    $power += $sample * $sample
    $peak = [Math]::Max($peak, [Math]::Abs($sample))
  }
  $rms = [Math]::Sqrt($power / ($sampleBytes / 2))
  $duration = $sampleBytes / ($format.sampleRate * $format.channels * 2.0)
  if ($duration -lt 0.15 -or $rms -le 0.005 -or $peak -le 0.05) { throw "Silent or incomplete speech recording: $Path" }
  [ordered]@{ durationSeconds=$duration; rms=$rms; peak=$peak }
}

Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Force -Path $audioPath | Out-Null
$speaker = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$stagingPath = Join-Path ([System.IO.Path]::GetTempPath()) ('stroke-audio-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stagingPath | Out-Null
try {
  $speaker.SelectVoice($VoiceName)
  if ($speaker.Voice.Culture.Name -ne 'zh-CN') { throw 'A zh-CN Mandarin voice is required; refusing a language fallback.' }
  $manifest.voiceId = $speaker.Voice.Id
  $speaker.Rate = $manifest.rate
  foreach ($recording in $recordings) {
    $outputPath = Join-Path $stagingPath ($recording.name + '.wav')
    $speaker.SetOutputToWaveFile($outputPath)
    $speaker.SpeakSsml($recording.ssml)
    $speaker.SetOutputToNull()
    $recording | Add-Member -NotePropertyName validation -NotePropertyValue (Get-WaveValidation $outputPath)
    $recording | Add-Member -NotePropertyName sha256 -NotePropertyValue ((Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant())
    $recording | Add-Member -NotePropertyName bytes -NotePropertyValue ((Get-Item -LiteralPath $outputPath).Length)
  }
  # Publish only after every recording has passed PCM/non-silence validation.
  foreach ($recording in $recordings) {
    Copy-Item -LiteralPath (Join-Path $stagingPath ($recording.name + '.wav')) -Destination (Join-Path $audioPath ($recording.name + '.wav')) -Force
  }
  $manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $audioPath 'manifest.json') -Encoding UTF8
} finally {
  $speaker.Dispose()
  foreach ($recording in $recordings) {
    $stagedFile = Join-Path $stagingPath ($recording.name + '.wav')
    if (Test-Path -LiteralPath $stagedFile) { Remove-Item -LiteralPath $stagedFile -Force }
  }
  Remove-Item -LiteralPath $stagingPath -Force
}
Write-Output ('Generated ' + $catalog.strokeNames.Count + ' Mandarin stroke-name WAV files.')
