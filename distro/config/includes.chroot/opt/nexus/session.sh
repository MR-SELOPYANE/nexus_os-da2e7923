#!/bin/sh
# Launch the NEXUS shell full-screen with no browser UI, under a bare Wayland compositor.
set -e

# Wait for the local server to answer before painting anything.
i=0
while [ $i -lt 60 ]; do
  if curl -sf -o /dev/null http://127.0.0.1:8080/; then break; fi
  i=$((i + 1)); sleep 1
done

CHROME=$(command -v chromium || command -v chromium-browser || command -v google-chrome)

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
