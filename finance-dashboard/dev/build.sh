#!/bin/sh
# Dev-only concatenation. The shipped product is the single HTML file; buyers never run this.
cd "$(dirname "$0")/.."
{
  cat dev/part1_head.html
  echo '<script id="engine">'
  cat dev/engine.js
  echo '</script>'
  echo '<script>'
  cat dev/app_core.js dev/app_views1.js dev/app_views2.js dev/app_story.js dev/app_boot.js
  echo '</script>'
  echo '</body>'
  echo '</html>'
} > Personal_Finance_Dashboard.html
echo "built: $(wc -c < Personal_Finance_Dashboard.html) bytes"
