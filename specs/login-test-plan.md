# Login Feature Test Plan

## Application Overview

Comprehensive test plan for the authentication system including login page functionality, form validation, error handling, user interface interactions, and integration with the registration flow. Tests cover happy path scenarios, edge cases, validation rules, accessibility, and security considerations.

## Test Scenarios

### 1. Login Form Functionality

**Seed:** `tests/auth/login-form-setup.spec.ts`

#### 1.1. Successful Login with Valid Credentials

**File:** `tests/auth/successful-login.spec.ts`

**Steps:**

1. Navigate to the login page at root URL '/'
   - expect: Login page should load with 'Sign in' heading
   - expect: Form should contain email and password fields
   - expect: Submit button should be labeled 'Sign in'

2. Enter the valid test email from `PLAYWRIGHT_TEST_EMAIL` in the email field

- expect: Email field should accept the input
- expect: No validation errors should appear

3. Enter the valid test password from `PLAYWRIGHT_TEST_PASSWORD` in the password field

- expect: Password field should accept the input
- expect: Characters should be masked by default

4. Click the 'Sign in' button to submit the form
   - expect: Form should submit successfully
   - expect: User should be redirected to '/start' page
   - expect: No error messages should appear

#### 1.2. Login with Invalid Email Format

**File:** `tests/auth/invalid-email-login.spec.ts`

**Steps:**

1. Navigate to the login page
   - expect: Login form should be displayed and interactive

2. Enter invalid email format 'invalid-email' in the email field
   - expect: Email field should accept the text input

3. Enter any password in the password field
   - expect: Password field should accept the input

4. Click the 'Sign in' button
   - expect: HTML5 email validation should prevent form submission
   - expect: Browser should display email validation message
   - expect: Form should not submit to the server

#### 1.3. Login with Wrong Credentials

**File:** `tests/auth/wrong-credentials-login.spec.ts`

**Steps:**

1. Navigate to the login page
   - expect: Login form should be displayed

2. Enter valid email format but wrong email 'wrong@example.com'
   - expect: Email field should accept the input

3. Enter incorrect password 'wrongpassword'
   - expect: Password field should accept the input

4. Click the 'Sign in' button
   - expect: Form should submit to server
   - expect: Error message should appear indicating invalid credentials
   - expect: User should remain on login page
   - expect: Form fields should remain populated

#### 1.4. Empty Field Validation

**File:** `tests/auth/empty-fields-validation.spec.ts`

**Steps:**

1. Navigate to the login page
   - expect: Login form should be displayed

2. Leave both email and password fields empty
   - expect: Fields should show placeholder text

3. Click the 'Sign in' button
   - expect: HTML5 required validation should prevent submission
   - expect: Browser should focus on the first empty required field (email)
   - expect: Validation message should appear for email field

4. Fill email field only and leave password empty
   - expect: Email field should contain the entered value

5. Click the 'Sign in' button
   - expect: HTML5 required validation should prevent submission
   - expect: Browser should focus on the password field
   - expect: Validation message should appear for password field

### 2. User Interface Interactions

**Seed:** `tests/auth/ui-interactions-setup.spec.ts`

#### 2.1. Password Visibility Toggle

**File:** `tests/auth/password-toggle.spec.ts`

**Steps:**

1. Navigate to the login page
   - expect: Password field should be of type 'password' (masked)
   - expect: Show password button should be labeled 'Show password'

2. Enter text 'testpassword' in the password field
   - expect: Password should appear as masked characters (dots/asterisks)

3. Click the 'Show password' toggle button
   - expect: Password should become visible as plain text
   - expect: Button label should change to 'Hide password'
   - expect: Button icon should change to indicate hiding state

4. Click the 'Hide password' toggle button
   - expect: Password should become masked again
   - expect: Button label should change back to 'Show password'
   - expect: Button icon should change to indicate showing state

#### 2.2. Remember Me Checkbox Functionality

**File:** `tests/auth/remember-me-checkbox.spec.ts`

**Steps:**

1. Navigate to the login page
   - expect: Remember me checkbox should be unchecked by default
   - expect: Checkbox should be labeled 'Remember me'

2. Click the 'Remember me' checkbox
   - expect: Checkbox should become checked
   - expect: Checkbox state should be visibly indicated

3. Click the 'Remember me' checkbox again
   - expect: Checkbox should become unchecked
   - expect: Checkbox should return to default state

4. Check the remember me option and then login with valid credentials
   - expect: Login should succeed normally
   - expect: Remember me preference should be sent with login request

#### 2.3. Navigation to Registration

**File:** `tests/auth/navigation-to-registration.spec.ts`

**Steps:**

1. Navigate to the login page
   - expect: Login page should display with 'Don't have an account? Sign up' text and link

2. Click the 'Sign up' link
   - expect: Should navigate to '/register' page
   - expect: Registration form should be displayed
   - expect: Page should have 'Create an account' heading

3. On registration page, click the 'Sign in' link
   - expect: Should navigate back to '/' login page
   - expect: Login form should be displayed

#### 2.4. Form Loading States

**File:** `tests/auth/form-loading-states.spec.ts`

**Steps:**

1. Navigate to the login page
   - expect: Initially, form fields may be disabled while checking authentication
   - expect: Submit button may show 'Signing in...' during auth check

2. Wait for the form to become fully interactive
   - expect: All form fields should become enabled
   - expect: Submit button should show 'Sign in' text
   - expect: Form should be ready for user input

3. Fill in valid credentials and submit
   - expect: During submission, button should show loading state
   - expect: Form fields should be disabled during submission
   - expect: Loading indicators should be visible

### 3. Authentication Flow and Redirects

**Seed:** `tests/auth/auth-flow-setup.spec.ts`

#### 3.1. Authenticated User Redirect

**File:** `tests/auth/authenticated-redirect.spec.ts`

**Steps:**

1. Login with valid credentials from the login page
   - expect: Should be redirected to '/start' page after successful login

2. Navigate directly to '/' login page while authenticated
   - expect: Should be automatically redirected to '/start' page
   - expect: Should not be able to access login page when already logged in

3. Navigate directly to '/register' page while authenticated
   - expect: Should be automatically redirected away from registration
   - expect: Should not be able to access registration when already logged in

#### 3.2. Logout and Re-login Flow

**File:** `tests/auth/logout-relogin-flow.spec.ts`

**Steps:**

1. Login with valid credentials
   - expect: Should reach the dashboard/start page

2. Clear browser storage and cookies to simulate logout
   - expect: Session should be cleared

3. Navigate to a protected route
   - expect: Should be redirected to login page
   - expect: Login form should be accessible

4. Login again with the same valid credentials
   - expect: Should successfully authenticate again
   - expect: Should be redirected to appropriate page

#### 3.3. Success Message Display After Game Exit

**File:** `tests/auth/success-message-after-exit.spec.ts`

**Steps:**

1. Navigate to login page with URL parameter '/?left=1'
   - expect: Success message 'You have successfully left the game' should be displayed
   - expect: Message should appear above the login form
   - expect: Message should have success styling

2. Login with valid credentials from this state
   - expect: Success message should remain visible during login process
   - expect: Login should proceed normally

### 4. Error Handling and Edge Cases

**Seed:** `tests/auth/error-handling-setup.spec.ts`

#### 4.1. Network Error Handling

**File:** `tests/auth/network-error-handling.spec.ts`

**Steps:**

1. Navigate to login page and fill valid credentials
   - expect: Form should be ready for submission

2. Block network requests and attempt to submit
   - expect: Should show network error message
   - expect: Form should remain accessible
   - expect: User should be able to retry

3. Restore network and retry submission
   - expect: Login should succeed normally
   - expect: Error message should disappear

#### 4.2. Server Error Response Handling

**File:** `tests/auth/server-error-handling.spec.ts`

**Steps:**

1. Navigate to login page
   - expect: Login form should be displayed

2. Mock server to return 500 error and attempt login
   - expect: Should display appropriate server error message
   - expect: Form should remain usable
   - expect: User should be able to retry

3. Mock server to return authentication failure
   - expect: Should display 'Incorrect email or password' message
   - expect: Form should remain populated
   - expect: User should be able to correct credentials

#### 4.3. CSRF Token Handling

**File:** `tests/auth/csrf-token-handling.spec.ts`

**Steps:**

1. Navigate to login page
   - expect: CSRF token should be properly loaded

2. Mock expired or invalid CSRF token and attempt login
   - expect: Should display 'Security token is invalid or expired. Please try again.' message
   - expect: Form should refresh with new CSRF token
   - expect: User should be able to retry login

#### 4.4. Long Input Values

**File:** `tests/auth/long-input-values.spec.ts`

**Steps:**

1. Navigate to login page
   - expect: Login form should be displayed

2. Enter extremely long email (>255 characters) in email field
   - expect: Field should handle long input gracefully
   - expect: No visual layout breaking should occur

3. Enter extremely long password (>1000 characters) in password field
   - expect: Field should handle long input gracefully
   - expect: No visual layout breaking should occur

4. Attempt to submit with very long values
   - expect: Should either accept or provide appropriate validation
   - expect: Should not crash or cause errors

### 5. Accessibility and Usability

**Seed:** `tests/auth/accessibility-setup.spec.ts`

#### 5.1. Keyboard Navigation

**File:** `tests/auth/keyboard-navigation.spec.ts`

**Steps:**

1. Navigate to login page using only keyboard (Tab key)
   - expect: Should be able to reach all interactive elements
   - expect: Tab order should be logical: email → password → show/hide → remember me → submit → sign up link
   - expect: Focus indicators should be visible

2. Fill form using only keyboard input
   - expect: Should be able to type in email and password fields
   - expect: Should be able to activate password toggle with Enter/Space
   - expect: Should be able to check/uncheck remember me with Space

3. Submit form using Enter key
   - expect: Form should submit when Enter is pressed in any field
   - expect: Submit behavior should be identical to mouse click

#### 5.2. Screen Reader Compatibility

**File:** `tests/auth/screen-reader-compatibility.spec.ts`

**Steps:**

1. Navigate to login page with screen reader simulation
   - expect: Form should have proper heading structure
   - expect: All form fields should have associated labels
   - expect: Required fields should be properly announced
   - expect: Password toggle button should have descriptive aria-label

2. Navigate through form with screen reader
   - expect: Field purposes should be clearly announced
   - expect: Validation messages should be programmatically associated
   - expect: Error states should be announced to assistive technology

#### 5.3. Visual Focus Indicators

**File:** `tests/auth/visual-focus-indicators.spec.ts`

**Steps:**

1. Navigate through form using Tab key
   - expect: Each focusable element should have visible focus indicator
   - expect: Focus indicators should have sufficient color contrast
   - expect: Focus should never be completely hidden or unclear

### 6. Cross-Browser and Responsive Tests

**Seed:** `tests/auth/cross-browser-setup.spec.ts`

#### 6.1. Mobile Responsive Layout

**File:** `tests/auth/mobile-responsive.spec.ts`

**Steps:**

1. Navigate to login page on mobile viewport (375x667)
   - expect: Login form should be properly sized and layout
   - expect: All elements should be easily tappable (minimum 44px touch targets)
   - expect: No horizontal scrolling should be required
   - expect: Text should be readable without zooming

2. Test form interactions on mobile
   - expect: Virtual keyboard should not cover form elements
   - expect: Form should scroll appropriately when keyboard appears
   - expect: All buttons should be easily tappable

#### 6.2. Tablet Layout

**File:** `tests/auth/tablet-layout.spec.ts`

**Steps:**

1. Navigate to login page on tablet viewport (768x1024)
   - expect: Login form should be properly centered and sized
   - expect: Touch targets should be appropriately sized
   - expect: Layout should utilize available space effectively
