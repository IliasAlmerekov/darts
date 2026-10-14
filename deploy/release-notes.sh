#!/usr/bin/env bash
# Print the CHANGELOG.md section of one release, without its heading.
#
# Usage: deploy/release-notes.sh <version>
#
# <version> is bare semver, for example 0.1.3, and must match a `## [<version>]`
# heading. Fails when the section is missing or empty, so a tag never ships
# without release notes.
set -euo pipefail

die() { echo "release-notes: $*" >&2; exit 1; }

(( $# == 1 )) || die 'usage: release-notes.sh <version>'
version=$1
[[ $version =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || die "Not bare semver: $version"

deploy_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
changelog="$deploy_dir/../CHANGELOG.md"

# Lines between `## [<version>]` and the next `## ` heading, with blank lines trimmed at both ends.
notes=$(awk -v heading="## [$version]" '
    /^## / { if (found) exit; if (index($0, heading) == 1) { found = 1; next } }
    found
' "$changelog" | sed -e '/./,$!d' | sed -e ':a' -e '/^\n*$/{$d;N;ba' -e '}')

[[ -n $notes ]] || die "CHANGELOG.md has no notes under ## [$version]"
printf '%s\n' "$notes"
