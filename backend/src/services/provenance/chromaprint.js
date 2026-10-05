// chromaprint audio fingerprinting via fpcalc CLI
// fpcalc is part of libchromaprint-tools (available in Debian-based worker image)
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

let fpcalcAvailable = null;
function hasFpcalc() {
  if (fpcalcAvailable !== null) return fpcalcAvailable;
  try {
    execSync('fpcalc -version', { stdio: 'ignore' });
    fpcalcAvailable = true;
  } catch {
    fpcalcAvailable = false;
  }
  return fpcalcAvailable;
}

// extract audio to a temp WAV using ffmpeg (needed for video/mp4 with embedded audio)
function extractAudioTrack(inputPath) {
  const tmpWav = path.join(os.tmpdir(), `audio-${crypto.randomUUID()}.wav`);
  try {
    execSync(
      `ffmpeg -y -i "${inputPath}" -vn -ar 44100 -ac 1 -f wav "${tmpWav}"`,
      { stdio: 'pipe', timeout: 60000 },
    );
    return tmpWav;
  } catch {
    try { fs.unlinkSync(tmpWav); } catch {}
    return null;
  }
}

// compute chromaprint fingerprint for an audio or video file
// returns fingerprint string or null
async function computeChromaprint(filePath, mimeType) {
  if (!hasFpcalc()) return null;
  let targetPath = filePath;
  let tmpAudio = null;
  try {
    // for video, demux audio track first
    if (mimeType && mimeType.startsWith('video/')) {
      tmpAudio = extractAudioTrack(filePath);
      if (!tmpAudio) return null;
      targetPath = tmpAudio;
    } else if (!mimeType || (!mimeType.startsWith('audio/') && mimeType !== 'video/mp4')) {
      return null;
    }
    const out = execSync(`fpcalc -raw "${targetPath}"`, {
      stdio: 'pipe',
      timeout: 30000,
      encoding: 'utf8',
    });
    // fpcalc outputs "FINGERPRINT=..." on the last line
    const match = out.match(/FINGERPRINT=([0-9,]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  } finally {
    if (tmpAudio) try { fs.unlinkSync(tmpAudio); } catch {}
  }
}

// compare two raw Chromaprint fingerprints (comma-separated int arrays)
// returns fraction of matching frames (0.0 – 1.0) or -1 if invalid
function chromaprintSimilarity(fpA, fpB) {
  if (!fpA || !fpB) return -1;
  const a = fpA.split(',').map(Number);
  const b = fpB.split(',').map(Number);
  const len = Math.min(a.length, b.length);
  if (len === 0) return -1;
  let matching = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) matching++;
  }
  return matching / len;
}

const CHROMAPRINT_THRESHOLD = Number(process.env.CHROMAPRINT_SIMILARITY_THRESHOLD || '0.7');

function isChromaprintMatch(fpA, fpB) {
  return chromaprintSimilarity(fpA, fpB) >= CHROMAPRINT_THRESHOLD;
}

module.exports = { computeChromaprint, chromaprintSimilarity, isChromaprintMatch, CHROMAPRINT_THRESHOLD };
