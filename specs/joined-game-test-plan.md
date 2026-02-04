# Joined Game Feature - Test Plan

## Application Overview

The joined-game feature is a confirmation page displayed to users after successfully joining a darts game through an invitation link. This page provides visual confirmation of successful game entry. The feature is a protected route that requires authentication and is part of the game room invitation flow.

## Test Scenarios

### 1. Joined Game Page Display

**Seed:** `seed.spec.ts`

#### 1.1. Successfully display joined game confirmation page

**File:** `tests/joined-game/display-confirmation.spec.ts`

**Steps:**

1. Navigate to the login page and log in with valid credentials
   - expect: User is successfully authenticated
   - expect: User is redirected to the start page or next allowed route

2. Navigate directly to the /joined route
   - expect: The joined game confirmation page loads successfully
   - expect: The page displays the heading '✓ Spiel beigetreten!'
   - expect: A welcome message 'Willkommen im Spiel!' is visible
   - expect: The welcome message has a green background (#d4edda) indicating success

#### 1.2. Verify page layout and styling

**File:** `tests/joined-game/page-layout.spec.ts`

**Steps:**

1. Authenticate and navigate to /joined
   - expect: User is on the joined game page

2. Inspect the page structure and CSS classes
   - expect: The page uses a centered card layout with maximum width of 500px
   - expect: The card has a white background with border-radius of 8px
   - expect: The card has proper shadow styling (box-shadow with rgb values)
   - expect: The success message box has proper padding (15px) and border styling
   - expect: The text color in the success box is #155724
   - expect: The layout is responsive and centered vertically

#### 1.3. Display page for unauthenticated users

**File:** `tests/joined-game/unauthenticated-access.spec.ts`

**Steps:**

1. Clear all authentication cookies and session storage
   - expect: User is not authenticated

2. Attempt to navigate to /joined route
   - expect: User is redirected to the login page (/)
   - expect: The joined game confirmation page is not displayed
   - expect: A loading skeleton may briefly appear during authentication check

### 3. Loading States and Skeletons

**Seed:** `seed.spec.ts`

#### 3.1. Display loading skeleton during authentication check

**File:** `tests/joined-game/loading-skeleton.spec.ts`

**Steps:**

1. Clear session and navigate to /joined with a valid session cookie
   - expect: Authentication check is triggered

2. Observe the page during authentication verification
   - expect: A LoginSuccessSkeleton component is displayed
   - expect: The skeleton provides visual feedback during loading
   - expect: The skeleton is replaced with the actual page once authentication is verified

#### 3.2. Handle slow authentication check

**File:** `tests/joined-game/slow-auth-check.spec.ts`

**Steps:**

1. Throttle the authentication API to simulate slow network
   - expect: Network is configured to be slow

2. Navigate to /joined with valid credentials
   - expect: LoginSuccessSkeleton is displayed for extended period
   - expect: Skeleton remains visible until authentication completes
   - expect: No content flashing occurs

3. Wait for authentication to complete
   - expect: Page content loads properly
   - expect: Smooth transition from skeleton to actual content

### 4. Integration with Game Flow

**Seed:** `seed.spec.ts`

#### 4.1. Navigate to joined page after accepting invitation

**File:** `tests/joined-game/invitation-flow.spec.ts`

**Steps:**

1. User A creates a game room
   - expect: Game room is created
   - expect: Invitation link is generated

2. User B (not authenticated) clicks the invitation link
   - expect: User B is redirected to login page
   - expect: Invitation context is preserved

3. User B logs in with valid credentials
   - expect: User B is authenticated
   - expect: User B should be redirected to /joined page or the game lobby
   - expect: The joined game confirmation may be displayed

#### 4.2. Access joined page outside invitation flow

**File:** `tests/joined-game/direct-access.spec.ts`

**Steps:**

1. User logs in normally without using an invitation link
   - expect: User is authenticated and on start page

2. User manually navigates to /joined route
   - expect: The joined game page loads
   - expect: Page displays standard confirmation message
   - expect: Confirmation message displays correctly
   - expect: No errors occur from accessing page directly

#### 4.3. Verify role-based access control

**File:** `tests/joined-game/role-based-access.spec.ts`

**Steps:**

1. Log in with a user who has ROLE_ADMIN
   - expect: User is authenticated

2. Navigate to /joined route
   - expect: Page loads successfully
   - expect: User has access to the joined game page

3. Log out and log in with a user without ROLE_ADMIN
   - expect: User is authenticated but lacks required role

4. Attempt to navigate to /joined route
   - expect: User is redirected to / (login page)
   - expect: Access is denied due to missing ROLE_ADMIN
   - expect: User cannot access protected route

### 5. Accessibility and UX

**Seed:** `seed.spec.ts`

#### 5.1. Verify keyboard navigation

**File:** `tests/joined-game/keyboard-navigation.spec.ts`

**Steps:**

1. Authenticate and navigate to /joined
   - expect: User is on the joined game page

2. Use Tab key to navigate through interactive elements
   - expect: No focusable controls are present on the page
   - expect: Tab navigation does not focus any controls

#### 5.2. Verify semantic HTML and ARIA labels

**File:** `tests/joined-game/semantic-html.spec.ts`

**Steps:**

1. Authenticate and navigate to /joined
   - expect: User is on the joined game page

2. Inspect the page structure with accessibility tools
   - expect: The main heading uses h1 tag
   - expect: The welcome section uses h3 tag
   - expect: Color contrast meets WCAG AA standards (green background with dark green text)
   - expect: Success indicator (✓) is part of heading text

#### 5.3. Test responsive design on mobile devices

**File:** `tests/joined-game/responsive-mobile.spec.ts`

**Steps:**

1. Set viewport to mobile size (375x667)
   - expect: Viewport is set to mobile dimensions

2. Authenticate and navigate to /joined
   - expect: Page loads correctly on mobile viewport
   - expect: Card container has proper padding (0 15px)
   - expect: Card is responsive with max-width constraint
   - expect: Text is readable and not cut off
   - expect: No horizontal scrolling required

#### 5.4. Test responsive design on tablet devices

**File:** `tests/joined-game/responsive-tablet.spec.ts`

**Steps:**

1. Set viewport to tablet size (768x1024)
   - expect: Viewport is set to tablet dimensions

2. Authenticate and navigate to /joined
   - expect: Page is properly centered
   - expect: Card maintains 500px max-width
   - expect: Vertical centering is maintained
   - expect: All content is visible and well-spaced

#### 5.5. Verify success message visibility

**File:** `tests/joined-game/success-message-visibility.spec.ts`

**Steps:**

1. Authenticate and navigate to /joined
   - expect: User is on the joined game page

2. Verify the success message styling and content
   - expect: Success box has green background (#d4edda)
   - expect: Success box has green border (1px solid #c3e6cb)
   - expect: Text color is dark green (#155724)
   - expect: Border radius is 5px
   - expect: Padding is 15px
   - expect: Margin-top is 20px
   - expect: Text alignment is left
   - expect: Welcome heading has margin-bottom of 10px

### 6. Error Scenarios

**Seed:** `seed.spec.ts`

#### 6.1. Handle network errors during page load

**File:** `tests/joined-game/network-error-load.spec.ts`

**Steps:**

1. Configure network to be offline
   - expect: Network is unavailable

2. Attempt to navigate to /joined
   - expect: Authentication check fails due to network error
   - expect: User may see loading skeleton indefinitely
   - expect: Browser shows offline indicator
   - expect: No unhandled errors in console

#### 6.2. Handle session expiration on joined page

**File:** `tests/joined-game/session-expiration.spec.ts`

**Steps:**

1. Authenticate and navigate to /joined
   - expect: User is on the joined game page

2. Wait on the page for an extended period (simulate session expiration)
   - expect: User remains on the page
   - expect: Page continues to display correctly

#### 6.3. Handle malformed authentication state

**File:** `tests/joined-game/malformed-auth.spec.ts`

**Steps:**

1. Set up authentication with incomplete or malformed user data
   - expect: User object is corrupted or missing required fields

2. Attempt to access /joined
   - expect: ProtectedRoutes handles malformed data gracefully
   - expect: User is either redirected to login or shown error
   - expect: No application crashes occur
   - expect: Error is logged appropriately

### 7. Cross-Browser Compatibility

**Seed:** `seed.spec.ts`

#### 7.1. Verify functionality in Chromium

**File:** `tests/joined-game/chromium-compatibility.spec.ts`

**Steps:**

1. Run all core tests in Chromium browser
   - expect: All visual elements render correctly
   - expect: Styling is applied correctly
   - expect: No browser-specific errors

#### 7.2. Verify functionality in Firefox

**File:** `tests/joined-game/firefox-compatibility.spec.ts`

**Steps:**

1. Run all core tests in Firefox browser
   - expect: All visual elements render correctly
   - expect: Styling is applied correctly
   - expect: No browser-specific errors
   - expect: Color values render consistently

#### 7.3. Verify functionality in WebKit (Safari)

**File:** `tests/joined-game/webkit-compatibility.spec.ts`

**Steps:**

1. Run all core tests in WebKit browser
   - expect: All visual elements render correctly
   - expect: Styling is applied correctly
   - expect: No browser-specific errors
   - expect: Border-radius renders correctly

### 8. Security Testing

**Seed:** `seed.spec.ts`

#### 8.2. Verify XSS protection in displayed content

**File:** `tests/joined-game/xss-protection.spec.ts`

**Steps:**

1. Attempt to inject malicious scripts through URL parameters or state
   - expect: React escapes any user content automatically
   - expect: No script execution occurs
   - expect: Page displays content safely

2. Verify all text content is rendered as text
   - expect: Heading and message text cannot execute scripts
   - expect: Content is properly sanitized
