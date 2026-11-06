#!/usr/bin/env bash
# Git worktrees for issue branches, so parallel sessions never switch the main checkout.
#
#   scripts/worktree.sh new <type>/<issue>-<topic>
#       Cuts the branch from the latest main into ../worktrees/<repo>-<issue>, copies the
#       local env files from the main checkout and installs npm packages. Prints the path.
#   scripts/worktree.sh prune
#       Removes every worktree and local branch whose pull request is merged. Keeps a
#       worktree with uncommitted changes, and anything whose PR is open, closed or missing.
set -euo pipefail

die() { echo "worktree.sh: $*" >&2; exit 1; }

common_dir=$(git rev-parse --path-format=absolute --git-common-dir)
main_dir=$(dirname "$common_dir")
repo=$(basename "$main_dir")
wt_root=$(dirname "$main_dir")/worktrees
remote=$(git remote -v | awk '/github\.com/ && /\(push\)/ { print $1; exit }')
[ -n "$remote" ] || die "no GitHub remote"
slug=$(git remote get-url "$remote" | sed -E 's#^(git@github\.com:|https://github\.com/)##; s#\.git$##')

pr_state() {
  gh pr list -R "$slug" --head "$1" --state all --json state -q '.[0].state'
}

new() {
  local branch=$1 issue dir f
  issue=$(sed -nE 's#^[a-z]+/([0-9]+)-.+$#\1#p' <<<"$branch")
  [ -n "$issue" ] || die "branch must look like <type>/<issue>-<topic>, got: $branch"
  dir=$wt_root/$repo-$issue
  [ ! -e "$dir" ] || die "$dir already exists"
  git fetch -q "$remote" main
  git worktree add --no-track -b "$branch" "$dir" "$remote/main" >&2
  for f in .env .env.local app/.env.local app/.env.test.local; do
    if [ -f "$main_dir/$f" ]; then cp "$main_dir/$f" "$dir/$f"; fi
  done
  if [ -f "$dir/package-lock.json" ]; then
    (cd "$dir" && npm ci --no-audit --no-fund >&2)
  fi
  echo "$dir"
}

prune() {
  local dir="" branch state line
  git fetch -q --prune "$remote"
  while read -r line; do
    case $line in
      "worktree "*) dir=${line#worktree } ;;
      "branch "*)
        branch=${line#branch refs/heads/}
        [ "$dir" != "$main_dir" ] || continue
        state=$(pr_state "$branch")
        if [ "$state" != MERGED ]; then
          echo "keep $dir ($branch): ${state:-no PR}"
        elif [ -n "$(git -C "$dir" status --porcelain)" ]; then
          echo "keep $dir ($branch): uncommitted changes"
        else
          git worktree remove "$dir"
          git branch -D "$branch" >/dev/null
          echo "removed $dir and branch $branch"
        fi
        ;;
    esac
  done < <(git worktree list --porcelain)
  git worktree prune

  # Local branches without a worktree. A branch checked out anywhere is skipped.
  git for-each-ref --format='%(refname:short) %(worktreepath)' refs/heads |
    while read -r branch dir; do
      [ "$branch" != main ] && [ -z "$dir" ] || continue
      if [ "$(pr_state "$branch")" = MERGED ]; then
        git branch -D "$branch" >/dev/null
        echo "removed branch $branch"
      fi
    done
}

case ${1:-} in
  new) [ $# -eq 2 ] || die "usage: worktree.sh new <type>/<issue>-<topic>"; new "$2" ;;
  prune) prune ;;
  *) die "usage: worktree.sh new <type>/<issue>-<topic> | prune" ;;
esac
