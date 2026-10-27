#!/bin/sh
# Launch the NEXUS shell full-screen with no browser UI, under a bare Wayland compositor.
set -e

# Wait for the local server to answer before painting anything.
i=0
while [ $i -lt 60 ]; do
  if curl -sf -o /dev/null http://127.0.0.1:8080/; then break; fi
  i=$((i + 1)); sleep 1
done

# Preferred: a Chromium-family browser. On Ubuntu, chromium-browser is a snap
# transitional package (needs network on first run); falkon/epiphany are the
# offline-friendly fallbacks installed by ubuntu-setup.sh.
CHROME=$(command -v chromium || command -v chromium-browser || command -v google-chrome)
FALLBACK=$(command -v falkon || command -v epiphany)

if [ -n "$CHROME" ]; then
  exec cage -d -- "$CHROME" \
    --kiosk \
    --app=http://127.0.0.1:8080/ \
    --ozone-platform=wayland \
    --enable-features=UseOzonePlatform,VaapiVideoDecoder,WebUIDarkMode \
    --force-dark-mode \
    --no-first-run \
    --noerrdialogs \
    --disable-infobars \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --autoplay-policy=no-user-gesture-required \
    --user-data-dir=/home/nexus/.nexus-profile
fi

if [ -n "$FALLBACK" ]; then
  case "$(basename "$FALLBACK")" in
    falkon)   exec cage -d -- falkon --fullscreen http://127.0.0.1:8080/ ;;
    epiphany) exec cage -d -- epiphany http://127.0.0.1:8080/ ;;
  esac
fi

echo "No usable browser found on this image." >&2
exit 1
