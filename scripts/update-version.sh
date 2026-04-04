#!/bin/sh

set -eu

REPO_ROOT=$(git rev-parse --show-toplevel)
VERSION_FILE="$REPO_ROOT/version.txt"

timestamp=$(TZ=Asia/Tokyo date "+%Y-%m-%d %H:%M:%S")

major=1
minor=0
revision=0

if [ -f "$VERSION_FILE" ]; then
  current_version=$(cat "$VERSION_FILE")
  version_numbers=$(printf "%s" "$current_version" | awk -F'|' '{print $2}' | tr -d ' ')
  if [ -n "$version_numbers" ]; then
    parsed_major=$(printf "%s" "$version_numbers" | cut -d. -f1)
    parsed_minor=$(printf "%s" "$version_numbers" | cut -d. -f2)
    parsed_revision=$(printf "%s" "$version_numbers" | cut -d. -f3)
    [ -n "$parsed_major" ] && major=$parsed_major
    [ -n "$parsed_minor" ] && minor=$parsed_minor
    [ -n "$parsed_revision" ] && revision=$parsed_revision
  fi
fi

revision=$((revision + 1))

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  github_ref=$(git rev-parse --short HEAD)
else
  github_ref=0000000
fi

printf "%s | %s.%s.%s.%s\n" \
  "$timestamp" \
  "$major" \
  "$minor" \
  "$revision" \
  "$github_ref" >"$VERSION_FILE"
