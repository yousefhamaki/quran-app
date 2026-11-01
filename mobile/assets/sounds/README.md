# Sounds

`adhan.wav` — the first ~29 seconds of "Beautiful adhan.ogg" from Wikimedia Commons
(https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg), recorded by Adam-synagda and released under
**CC0 (public domain dedication)**. Trimmed, faded out and converted to 22.05 kHz mono WAV: notification sounds on
iOS must be 30 seconds or shorter.

To use a different adhan, replace this file (same name, WAV or CAF, 30 s or less) and rebuild.

`adhan_full.ogg` — the **complete** recording (about 2 minutes 34 seconds) of the same file, converted to 32 kHz mono Ogg
Vorbis with a short fade-out. Android plays it as the notification sound of the adhan channel (`adhan-full`) in full;
swiping the notification away stops it. iOS cannot play notification sounds longer than 30 seconds, so it keeps using
`adhan.wav`.
