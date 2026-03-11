# Page snapshot

```yaml
- generic [ref=e6]:
  - img "deepblue" [ref=e8]
  - generic [ref=e10]:
    - generic [ref=e11]:
      - heading "Sign in" [level=1] [ref=e12]
      - paragraph [ref=e13]: Enter your credentials to access your account
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: Email *
        - generic [ref=e17]:
          - img
          - textbox "Email *" [ref=e18]:
            - /placeholder: name@example.com...
      - generic [ref=e19]:
        - generic [ref=e20]: Password *
        - generic [ref=e21]:
          - img
          - textbox "Password *" [ref=e22]:
            - /placeholder: Enter your password...
          - button "Show password" [ref=e23] [cursor=pointer]:
            - img [ref=e24]
      - generic [ref=e27]:
        - checkbox "Remember me" [ref=e28] [cursor=pointer]
        - generic [ref=e29] [cursor=pointer]: Remember me
      - button "Sign in" [ref=e30] [cursor=pointer]
    - paragraph [ref=e31]:
      - text: Don't have an account?
      - link "Sign up" [ref=e32] [cursor=pointer]:
        - /url: /register
```