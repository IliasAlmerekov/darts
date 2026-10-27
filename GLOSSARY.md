# Darts

A darts scoring app: players join a game, throw until they check out, and see where they finished.

## Playing

**Current game**:
The game a player takes part in right now. A player has at most one; joining another game replaces it.
_Avoid_: active game

**Tablet game**:
The one game on the tablet that is in the lobby or started. A finished or aborted game is never the tablet game.
_Avoid_: current game (for the tablet's game), active game

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
The page a player lands on after logging in without an invitation and without a current game. It shows the player's own statistics and recent finished games.
_Avoid_: player page, default page

**Hit frequency**:
How often a player hits a board segment compared with the segment they hit most, in five steps from Very high to Very low.
_Avoid_: heat, hit rate

## Finished game

**Standings**:
Every player of a finished game, in finishing order.
_Avoid_: newList, finished list, results

**Placement**:
A participant's rank in a game. A participant gets it at their checkout, or when the game ends without one. The winner has placement 1. Undoing a throw or reopening the game takes the placement away from everyone whose score is above zero again, and the win with it; the others keep theirs.
_Avoid_: finishing position, position, rank, index

**Podium**:
The first three players of the standings.
_Avoid_: top three, winners

**Leaderboard**:
The players of the standings from fourth place on.
_Avoid_: rest, overview list

**Podium placeholder**:
The empty third podium slot shown when a game had only two players.
_Avoid_: dummy player, fake third
