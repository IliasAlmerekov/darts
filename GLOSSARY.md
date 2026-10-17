# Darts

A darts scoring app: players join a game, throw until they check out, and see where they finished.

## Playing

**Current game**:
The game a player takes part in right now. A player has at most one; joining another game replaces it.
_Avoid_: active game

**Lobby**:
A game that players are joining and that has not started yet. There is at most one lobby at a time.
_Avoid_: room, start page

**Waiting room**:
The screen a player sees after joining a game, until that game starts.
_Avoid_: joined page, lobby

## Accounts

**Remembered login**:
A player's login that stays valid for 7 days after their last visit, so the app skips the login form.
_Avoid_: remember me, persistent session

**Player profile**:
The page a player lands on after logging in without an invitation and without a current game.
_Avoid_: player page, default page

## Finished game

**Standings**:
Every player of a finished game, in finishing order.
_Avoid_: newList, finished list, results

**Finishing position**:
A player's 1-based place in the standings.
_Avoid_: rank, index

**Podium**:
The first three players of the standings.
_Avoid_: top three, winners

**Leaderboard**:
The players of the standings from fourth place on.
_Avoid_: rest, overview list

**Podium placeholder**:
The empty third podium slot shown when a game had only two players.
_Avoid_: dummy player, fake third
