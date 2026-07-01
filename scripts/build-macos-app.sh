#!/bin/sh
#
# Build the offline macOS app bundle for Blackjack Signal.
#
# This project is a static web app: index.html, styles.css, app.js, and
# blackjack-engine.js are enough to run the product. A macOS ".app" bundle is
# just a folder with a special Contents/ layout plus a small executable script.
# The executable below opens the bundled index.html in the user's default
# browser, so the app works offline without a terminal or local web server.

set -eu

# Resolve the project root even when this script is run from another folder.
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

APP_NAME="Blackjack Signal"
OUTPUT_DIR="$ROOT_DIR/outputs"
APP_BUNDLE="$OUTPUT_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_BUNDLE/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
BUNDLED_WEB_DIR="$RESOURCES_DIR/app"
ZIP_PATH="$OUTPUT_DIR/Blackjack Signal Offline.zip"

echo "Building $APP_NAME offline app..."

# Start from a clean generated bundle. The source code remains untouched.
rm -rf "$APP_BUNDLE" "$ZIP_PATH"
mkdir -p "$MACOS_DIR" "$BUNDLED_WEB_DIR"

# macOS reads Info.plist to learn the app name, executable name, bundle id,
# version, and app type. This is the minimum metadata needed for a local app.
cat > "$CONTENTS_DIR/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>Blackjack Signal</string>
  <key>CFBundleExecutable</key>
  <string>Blackjack Signal</string>
  <key>CFBundleIdentifier</key>
  <string>local.blackjack-signal.launcher</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Blackjack Signal</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.13</string>
</dict>
</plist>
PLIST

# The executable is intentionally tiny. It finds the bundled index.html and
# opens it with macOS `open`, which launches the user's default browser.
cat > "$MACOS_DIR/$APP_NAME" <<'LAUNCHER'
#!/bin/sh
set -eu

contents_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
index_file="$contents_dir/Resources/app/index.html"

if [ ! -f "$index_file" ]; then
  osascript -e 'display dialog "Blackjack Signal could not find its app files." buttons {"OK"} default button "OK"' >/dev/null 2>&1 || true
  exit 1
fi

open "$index_file"
LAUNCHER
chmod +x "$MACOS_DIR/$APP_NAME"

# Copy the static web app source into the bundle. These are the exact files the
# launcher opens offline. If you edit source files, rerun this script.
cp \
  "$ROOT_DIR/index.html" \
  "$ROOT_DIR/styles.css" \
  "$ROOT_DIR/blackjack-engine.js" \
  "$ROOT_DIR/app.js" \
  "$ROOT_DIR/manifest.webmanifest" \
  "$ROOT_DIR/icon.svg" \
  "$ROOT_DIR/service-worker.js" \
  "$BUNDLED_WEB_DIR/"

# A small note inside outputs helps when someone only receives the packaged app.
cat > "$OUTPUT_DIR/README_OFFLINE_APP.md" <<'README'
# Blackjack Signal Offline App

Double-click `Blackjack Signal.app` to open the blackjack advisor offline.

The app bundle contains its own copy of the HTML, CSS, JavaScript, manifest, and icon files. It opens in your default browser from local files, so no server, internet, or terminal command is required.

If macOS warns that it cannot open the app, right-click it once and choose **Open**.
README

# Validate plist syntax before packaging.
plutil -lint "$CONTENTS_DIR/Info.plist"
test -x "$MACOS_DIR/$APP_NAME"

# Create a portable zip. `ditto` preserves macOS bundle metadata better than
# plain zip and is the normal tool for packaging .app folders.
(cd "$OUTPUT_DIR" && ditto -c -k --sequesterRsrc --keepParent "$APP_NAME.app" "Blackjack Signal Offline.zip")

echo "Built:"
echo "  $APP_BUNDLE"
echo "  $ZIP_PATH"
