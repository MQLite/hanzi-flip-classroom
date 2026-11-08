param([string]$VoiceName = 'Microsoft Huihui Desktop')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$projectPath = Split-Path $PSScriptRoot -Parent
$catalogPath = Join-Path $projectPath 'src/data/character-forms.json'
$catalog = Get-Content -LiteralPath $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json
$audioPath = Join-Path $projectPath 'public/audio/stroke-names'
New-Item -ItemType Directory -Force -Path $audioPath | Out-Null
$speaker = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $speaker.SelectVoice($VoiceName)
  $speaker.Rate = -2
  foreach ($strokeName in $catalog.strokeNames) {
    $outputPath = Join-Path $audioPath ($strokeName + '.wav')
    $speaker.SetOutputToWaveFile($outputPath)
    $speaker.Speak($strokeName)
    $speaker.SetOutputToNull()
  }
  @{voice=$VoiceName; culture='zh-CN'; rate=-2; names=$catalog.strokeNames; generator='Windows System.Speech'; purpose='Mandarin stroke-name classroom recordings'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $audioPath 'manifest.json') -Encoding UTF8
} finally { $speaker.Dispose() }
Write-Output ('Generated ' + $catalog.strokeNames.Count + ' Mandarin stroke-name WAV files.')
