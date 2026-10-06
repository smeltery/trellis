#!/bin/sh
# Build the display-ctl helper used for multi-display certification.
set -eu
cd "$(dirname "$0")/../.."
mkdir -p /private/tmp/trellis-cua-implementation
/usr/bin/clang -fobjc-arc -O2 -o /private/tmp/trellis-cua-implementation/display-ctl \
  scripts/computer-use-fixtures/display_ctl.m \
  -framework AppKit -framework CoreFoundation -framework CoreGraphics
echo "display-ctl build ok"
