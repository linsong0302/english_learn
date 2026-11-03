# Phoneme audio generator using Windows built-in SAPI (no account / key needed).
# Synthesizes each phoneme in src/data/phonemes.json via SSML <phoneme alphabet="sapi">
# with Microsoft Zira (or first en-US voice), writes 24kHz mono WAV to
# public/audio/phoneme/{audio}.wav, then normalizes peak loudness (fricatives like
# /th/ /s/ come out very quiet).
# Upgrade path: run gen-phoneme-audio.mjs (Azure neural, mp3) later - the app
# prefers .mp3 and falls back to these .wav files.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gen-phoneme-audio-sapi.ps1 [-Force]

param([switch]$Force)

$ErrorActionPreference = 'Stop'

# Compiled helper: normalize peak loudness of a 16-bit PCM wav in place.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
public static class WavGain {
    public static void Apply(string path, double targetPeak, double maxGain) {
        var bytes = File.ReadAllBytes(path);
        int idx = 12;
        while (idx + 8 <= bytes.Length) {
            string id = Encoding.ASCII.GetString(bytes, idx, 4);
            int size = BitConverter.ToInt32(bytes, idx + 4);
            if (id == "data") break;
            idx += 8 + size + (size % 2);
        }
        if (idx + 8 > bytes.Length) throw new IOException("data chunk not found: " + path);
        int start = idx + 8;
        int count = BitConverter.ToInt32(bytes, idx + 4);
        short peak = 0;
        for (int i = 0; i < count; i += 2) {
            short v = BitConverter.ToInt16(bytes, start + i);
            int a = v < 0 ? -v : v;
            if (a > peak) peak = (short)a;
        }
        double gain = Math.Min(maxGain, targetPeak / Math.Max(1, (int)peak));
        if (gain <= 1.001) return;
        for (int i = 0; i < count; i += 2) {
            int v = (int)Math.Round(BitConverter.ToInt16(bytes, start + i) * gain);
            if (v > 32767) v = 32767;
            if (v < -32768) v = -32768;
            bytes[start + i] = (byte)(v & 0xff);
            bytes[start + i + 1] = (byte)((v >> 8) & 0xff);
        }
        File.WriteAllBytes(path, bytes);
    }
}
'@

$appRoot = Split-Path -Parent $PSScriptRoot
$phonemes = Get-Content (Join-Path $appRoot 'src/data/phonemes.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$outDir = Join-Path $appRoot 'public/audio/phoneme'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# audio slug (ASCII filename from phonemes.json) -> SAPI phone symbol (en-US phone set)
$SYMS = @{
    ee = 'iy'; ih = 'ih'; eh = 'eh'; a = 'ae'; ah = 'aa'; aw = 'ao'; uh = 'ah'; uu = 'uh'; oo = 'uw'
    ay = 'ey'; ai = 'ay'; oh = 'ow'; oy = 'oy'; ow = 'aw'; er = 'er'; ur = 'er'
    p = 'p'; b = 'b'; t = 't'; d = 'd'; k = 'k'; g = 'g'; f = 'f'; v = 'v'; s = 's'; z = 'z'
    th = 'th'; dh = 'dh'; sh = 'sh'; tch = 'ch'; dj = 'jh'; ng = 'ng'
    m = 'm'; n = 'n'; l = 'l'; r = 'r'; w = 'w'; j = 'y'; h = 'h'
    kw = 'k w'; ks = 'k s'
}

Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$enVoice = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1
if ($enVoice) { $s.SelectVoice($enVoice.VoiceInfo.Name) } else { Write-Warning 'No en-US voice found, using default voice' }
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

$done = 0
$failed = @()
foreach ($p in $phonemes) {
    $slug = $p.audio
    if (-not $slug) { $failed += ("{0}: missing audio field" -f $p.kk); continue }
    $sym = $SYMS[$slug]
    if (-not $sym) { $failed += ("{0}: no SAPI symbol for slug '{1}'" -f $p.kk, $slug); continue }
    $out = Join-Path $outDir ($slug + '.wav')
    if ((Test-Path $out) -and -not $Force) { $done++; Write-Host ("skip (exists) {0}.wav" -f $slug); continue }
    $s.SetOutputToWaveFile($out, $fmt)
    $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><phoneme alphabet="sapi" ph="' + $sym + '">x</phoneme></speak>'
    try {
        $s.SpeakSsml($ssml)
    } catch {
        # SpeakSsml 失败时 SAPI 已创建半成品文件，删掉避免留下坏 wav
        $s.SetOutputToNull()
        if (Test-Path $out) { Remove-Item $out -Force }
        $failed += ("{0}: {1}" -f $p.kk, $_.Exception.Message)
        continue
    }
    $s.SetOutputToNull()
    [WavGain]::Apply($out, 26000, 30)
    $done++
    Write-Host ("gen {0}.wav  {1}  [{2}]" -f $slug, $p.kk, $sym)
}
$s.Dispose()
Write-Host ("done {0}/{1}" -f $done, $phonemes.Count)
if ($failed.Count) { $failed | ForEach-Object { Write-Warning $_ }; exit 2 }
