# GitHub Copilot Instructions

## Project Overview

This is a React + TypeScript darts game application using Vite as the build tool and CSS Modules for styling. The backend API is already implemented and handles all business logic. Focus on maintaining consistency with the existing frontend stack and patterns.

**Stack:**

- React 18 with TypeScript
- Vite for build tooling
- CSS Modules with nesting
- React Router DOM for routing
- Nanostores for state management
- API communication via fetch

---

## 1. General

- **Accessibility:** Adhere to WCAG 2.2 Level AA standards for all UI components
- **Semantic HTML:** Use semantic HTML5 elements (`<nav>`, `<main>`, `<section>`, `<article>`, etc.)
- **Keyboard Navigation:** Ensure all interactive elements are keyboard accessible
- **ARIA Labels:** Provide appropriate ARIA labels and roles where necessary
- **Color Contrast:** Maintain sufficient color contrast ratios for text and interactive elements
- **Focus Management:** Ensure visible focus indicators for keyboard navigation
- **Alt Text:** Provide descriptive alt text for all images
- **Form Labels:** Associate all form inputs with proper labels

---

## 2. React

- **Functional Components:** Use functional components with hooks exclusively
- **TypeScript:** Always define explicit prop types using `interface` or `type`
- **Props Naming:** Use descriptive prop names; avoid abbreviations unless commonly understood
- **Component Structure:**

  ```tsx
  import React from "react";
  import styles from "./ComponentName.module.css";

  interface ComponentNameProps {
    // props definition
  }

  function ComponentName({ ...props }: ComponentNameProps) {
    // component logic
    return (
      // JSX
    );
  }

  export default ComponentName;
  ```

- **Hooks:** Use React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) appropriately
- **Custom Hooks:** Extract reusable logic into custom hooks (see `src/hooks/` for examples)
- **Event Handlers:** Prefix event handler functions with `handle` (e.g., `handleClick`, `handleSubmit`)
- **Conditional Rendering:** Use `clsx` library for conditional className assignment
- **File Organization:** Co-locate component files with their styles in component folders
- **Exports:** Use default exports for components
- **React Router:** Use `react-router-dom` hooks (`useNavigate`, `useParams`, etc.) for routing
- **No Class Components:** Do not create class components

---

## 3. CSS Modules

- **File Naming:** Use `ComponentName.module.css` for component-specific styles
- **No BEM:** We do **not** use BEM methodology
- **CSS Modules with Nesting:** Utilize CSS nesting features supported by modern tooling
- **CSS Variables:**
  - All global CSS variables are defined in `src/css/index.css`
  - **Only use CSS variables that are already defined** in `src/css/index.css`
  - Do not create new CSS variables without checking existing ones first
  - Refer to `src/css/index.css` for available colors, spacing, and other design tokens
- **Class Naming:** Use descriptive, semantic class names (camelCase in module.css files)
- **Scoped Styles:** Keep styles component-scoped using CSS Modules
- **Global Styles:** Only add global styles to `src/css/index.css` when absolutely necessary
- **Nesting Example:**

  ```css
  .container {
    padding: var(--padding-md);

    .header {
      color: var(--darkblue);

      &:hover {
        color: var(--blue);
      }
    }
  }
  ```

---

## 4. TypeScript

- **Strict Mode:** Project uses strict TypeScript configuration
- **No `any` Type:** Never use the `any` type. Use specific types, `unknown`, or generics instead
- **Type Inference:** Leverage TypeScript's type inference where possible, but be explicit for function parameters and return types
- **Interfaces vs Types:**
  - Use `interface` for object shapes and component props
  - Use `type` for unions, intersections, and utility types
- **Null Safety:** Use optional chaining (`?.`) and nullish coalescing (`??`) operators
- **Type Exports:** Export types and interfaces that may be used across multiple files
- **Enums:** Prefer string literal unions over enums
- **Type Assertions:** Avoid type assertions (`as`) unless absolutely necessary; prefer type guards
- **Generic Types:** Use generics for reusable type-safe functions and components
- **Return Types:** Always explicitly define return types for functions
- **Async Functions:** Type async functions with `Promise<ReturnType>`
- **Error Handling:** Type errors properly, avoid `catch (error: any)`
  ```typescript
  catch (error) {
    console.error((error as Error).message);
  }
  ```

---

## 5. SOLID Principles

- **Single Responsibility Principle (SRP):**
  - Each component should have one clear purpose
  - Extract complex logic into custom hooks or utility functions
  - Keep components focused on rendering UI
- **Open/Closed Principle (OCP):**
  - Components should be open for extension but closed for modification
  - Use composition and props for customization
  - Leverage children props and render props patterns
- **Liskov Substitution Principle (LSP):**
  - Ensure component props are consistent and predictable
  - Child components should be substitutable for their parent types
- **Interface Segregation Principle (ISP):**
  - Keep prop interfaces focused and minimal
  - Don't force components to depend on props they don't use
  - Split large interfaces into smaller, focused ones
- **Dependency Inversion Principle (DIP):**
  - Depend on abstractions (interfaces/types) rather than concrete implementations
  - Use dependency injection through props and context
  - Keep business logic separate from UI components

---

## 6. DRY and KISS

- **Don't Repeat Yourself (DRY):**
  - Extract repeated code into reusable functions, hooks, or components
  - Use composition to share functionality
  - Create utility functions in `src/utils/` for common operations
  - Avoid duplicating API calls; centralize in `src/services/`
- **Keep It Simple, Stupid (KISS):**
  - Write simple, readable, and understandable code
  - Avoid over-engineering solutions
  - Prefer clear, explicit code over clever, implicit code
  - Use descriptive variable and function names
  - Break complex logic into smaller, named functions
  - Add comments only when code cannot be self-explanatory
  - Favor straightforward solutions over complex patterns
  - If a component becomes too complex, split it into smaller components

**Code Readability:**

- Use meaningful variable names that describe intent
- Keep functions small and focused (ideally < 20 lines)
- Maintain consistent formatting (Prettier handles this)
- Write self-documenting code that explains "what" through naming
- Use comments sparingly to explain "why" when necessary
