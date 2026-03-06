# Create Game Feature Test Plan

## Application Overview

Test plan for the darts application's create game feature. This covers the complete flow from game creation to game start, including QR code generation for guest players, player invitation, and proper redirection to the active game page.

## Test Scenarios

### 1. Create Game with QR Code

**Seed:** `tests/start/create-game.spec.ts`

#### 1.1. Create new game successfully with QR code generation

**File:** `tests/start/create-game.spec.ts`

**Steps:**

1. Navigate to the start page at '/start' as an admin user
   - expect: The start page loads successfully
   - expect: Game creation form is visible
   - expect: User has ROLE_ADMIN privileges

2. Click the 'Create New Game' or equivalent game creation button
   - expect: Game creation form/modal opens
   - expect: Form includes game settings options (name, type, round configuration)

3. Fill in the game details (game name, dart rules, number of players)
   - expect: All form fields accept valid input
   - expect: Form validation works properly

4. Submit the game creation form
   - expect: Game is created successfully
   - expect: Server responds with game ID
   - expect: QR code is generated automatically

5. Verify the QR code is displayed and functional
   - expect: QR code image is visible
   - expect: QR code contains a valid join URL (e.g., http://localhost:5173/join/{gameId})
   - expect: QR code is scannable

6. Verify game details are correctly displayed
   - expect: Game name matches input
   - expect: Game settings are correctly saved
   - expect: Game status is 'waiting for players' or similar

#### 1.2. Add guest player to created game

**File:** `tests/start/create-game.spec.ts`

**Steps:**

1. From the game creation page, locate the 'Add Guest Player' option
   - expect: Add guest player button/link is visible
   - expect: Guest player invitation interface is accessible

2. Click 'Add Guest Player' or similar action
   - expect: Guest player form opens
   - expect: Form includes fields for guest name

3. Enter guest player name 'TestGuest'
   - expect: Guest name field accepts input
   - expect: No registration/authentication required for guest

4. Confirm adding the guest player
   - expect: Guest player is added to the game
   - expect: Player list updates to include the guest
   - expect: Guest player shows as 'waiting' or 'ready'

5. Verify guest player appears in the players list
   - expect: Guest player 'TestGuest' is visible in players list
   - expect: Player count increases
   - expect: Guest player has appropriate status indicator

#### 1.3. Start game and redirect to game page

**File:** `tests/start/create-game.spec.ts`

**Steps:**

1. Ensure minimum required players are present (admin + guest)
   - expect: At least 2 players are in the game
   - expect: All players have appropriate ready status
   - expect: Start game button becomes enabled

2. Click 'Start Game' button
   - expect: Game start confirmation appears
   - expect: All players are notified game is starting

3. Confirm game start action
   - expect: Game transitions from 'waiting' to 'active' status
   - expect: Server processes game start request
   - expect: Success notification appears

4. Verify automatic redirect to game page
   - expect: Page redirects to /game/{gameId}
   - expect: Game interface loads properly
   - expect: Active game UI is displayed

5. Verify game page displays correctly
   - expect: URL matches /game/{gameId} pattern
   - expect: Game scoreboard is visible
   - expect: Player names are displayed
   - expect: Dart throwing interface is ready

6. Verify game state is properly initialized
   - expect: Current player turn is indicated
   - expect: Score displays show initial values (e.g., 501 for each player)
   - expect: Game timer starts if applicable

### 2. Error Handling and Edge Cases

**Seed:** `tests/start/create-game.spec.ts`

#### 2.1. Handle game creation with invalid data

**File:** `tests/start/create-game-error-handling.spec.ts`

**Steps:**

1. Attempt to create game with empty name field
   - expect: Validation error message appears
   - expect: Form submission is blocked
   - expect: Error message indicates required fields

2. Attempt to create game with invalid characters in name
   - expect: Validation prevents special characters if not allowed
   - expect: Appropriate error message shown

3. Test maximum character limits for game name
   - expect: Field enforces character limits
   - expect: Clear feedback given to user

#### 2.2. Handle network failures during game creation

**File:** `tests/start/create-game-network-errors.spec.ts`

**Steps:**

1. Simulate network error during game creation request
   - expect: Error message displays explaining network issue
   - expect: User can retry the action
   - expect: Form data is preserved for retry

2. Test server timeout during game creation
   - expect: Timeout handling works properly
   - expect: User receives appropriate feedback
   - expect: Loading states are managed correctly

#### 2.3. Maximum players limit enforcement

**File:** `tests/start/create-game-limits.spec.ts`

**Steps:**

1. Attempt to add more players than maximum allowed
   - expect: System enforces player limit
   - expect: Add player button becomes disabled when limit reached
   - expect: Clear message explains limit

### 3. QR Code Functionality

**Seed:** `tests/start/create-game.spec.ts`

#### 3.1. QR code accessibility and usability

**File:** `tests/start/qr-code-functionality.spec.ts`

**Steps:**

1. Verify QR code has proper alt text for screen readers
   - expect: QR code image has descriptive alt text
   - expect: Alternative join link is provided for accessibility

2. Test QR code in different screen sizes
   - expect: QR code remains visible and scannable on mobile devices
   - expect: QR code scales appropriately with viewport

3. Verify join URL format in QR code
   - expect: QR code contains valid URL
   - expect: URL includes correct game ID
   - expect: URL is accessible and not expired

### 4. User Permissions and Security

**Seed:** `tests/start/create-game.spec.ts`

#### 4.1. Admin role required for game creation

**File:** `tests/start/admin-permissions.spec.ts`

**Steps:**

1. Attempt to access /start page with ROLE_PLAYER account
   - expect: Access is denied
   - expect: User is redirected to appropriate page
   - expect: Security error is handled gracefully

2. Verify game creation requires ROLE_ADMIN
   - expect: Only admin users can create games
   - expect: Game creation controls are hidden from non-admin users
