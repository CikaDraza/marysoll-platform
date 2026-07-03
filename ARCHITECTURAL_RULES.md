# Architectural Rules & Coding Standards (2026)

This document defines the strict architectural boundaries, coding standards, and tooling requirements for the AI Coding Agent. These rules are non-negotiable. Every code generation, refactoring, or optimization task must adhere to this specification.

---

## 1. System Requirements & Environment

- **Node.js:** Must use **Node.js v24+** global features and performance optimizations.
- **React:** Fully optimized for **React 19+** features (Compiler-ready code, new hooks, enhanced Suspense model).
- **Next.js:** Designed for **Next.js 16+** App Router architecture.

---

## 2. Type Safety & Data Validation

### 2.1 Strict TypeScript (Zero `any`)

- The use of `any` is strictly prohibited. Use `unknown` with type guards if a type is genuinely dynamic.
- All types must be centralized in the root `types/` folder of the project. Local type definitions inside component files are allowed only if they are entirely scoped and non-reusable.

### 2.2 Schema Validation

- Every data payload, API request body, query parameter, and JSON object must be validated using **Zod**.
- Inferred Zod schemas should be exported as TypeScript types into the centralized `types/` directory when needed across multiple layers.

---

## 3. Architecture & Separation of Concerns

### 3.1 Directory Organization

Code must be strictly segregated into designated operational layers:

- `components/`: UI-only presentation layer.
- `hooks/`: Reusable stateful and data-fetching logic.
- `helpers/`: Pure utility functions (deterministic, without side effects).
- `lib/`: Core initializations, third-party SDK wrappers, and structural configurations.

### 3.2 Component Boundaries (Server vs. Client)

- Every UI component must reside in its own folder within `components/`.
- **Parent UI components must be Server-Side Rendered (SSR) / Server Components by default.**
- Keep the interactive Client Component tree as shallow as possible. Use `"use client"` only at the leaf nodes where user interaction or browser APIs are required.

### 3.3 Routing & Middleware

- Following Next.js 16+ conventions, the global interception, rewriting, and middleware logic is handled via `proxy.ts` (replacing the deprecated `middleware.ts`).

---

## 4. State Management & Data Fetching

### 4.1 Single Source of Truth & Prop Drilling

- Prop drilling beyond two levels is strictly forbidden.
- **No local state for shared data:** Every shared piece of server-state must have a single source of truth managed via `@tanstack/react-query` providers and custom hooks.

### 4.2 Data Fetching Pipeline

- All asynchronous data operations must be executed in Serverless Functions (Next.js API Routes / Server Actions).
- **Database Isolation:** Database queries, filtering, and structural formatting must happen on the server/API layer.
- Clean, pre-filtered, and strongly-typed data payloads must be delivered directly to the custom React Hooks, which then pass them seamlessly to the UI components.

### 4.3 React 19 Async Hooks & Performance

- Utilize native React 19 hooks (`use`, `useActionState`, `useFormStatus`, `useOptimistic`) for managing asynchronous actions, transitions, and native data streaming.
- Leverage `useMemo` and `useCallback` strategically to prevent expensive recalculations and unnecessary re-renders in heavy visual UI elements.

### 4.4 State Updates & Effects

- **Never set state (`useState`) directly inside a `useEffect` loop.**
- If a state synchronization or asynchronous state update is required, wrap the operation inside a dedicated `async handler` function, manage its race conditions properly, and invoke it safely within the handler block.

### 4.5 Conditional Rendering with `<Activity>`

- When a component needs to be conditionally hidden/revealed _without losing its internal state_ or resetting to its initial snapshot, wrap it using the **React 19 `<Activity>`** (formerly Offscreen) component instead of standard short-circuit (`{show && <Comp />}`) rendering.

---

## 5. Security, Access Control & Error Handling

### 5.1 Authorization & Permissions

- Every feature must follow a **Single Source of Truth** for access control.
- **Basic RBAC:** Use a centralized Role-Based Access Control (RBAC) matrix configuration to handle standard user/admin views globally, avoiding redundant `if/else` checks across separate files.
- **ABAC System:** For complex, context-dependent permissions (e.g., resource ownership, temporal access), implement an Attribute-Based Access Control (ABAC) engine.

### 5.2 Global Error Handling & Notifications

- All async operations, API routes, and promises must be wrapped in robust `try/catch` blocks.
- Graceful degradation via React **Error Boundaries** must catch unhandled component crashes.
- User-facing notifications must be triggered using `react-hot-toast` (or `sonner`) using human-readable, polite, and contextual localization-friendly language.

---

## 6. Code Quality, Verification & CI/CD Guardrails

Before declaring any task complete or committing code, the agent must run the verification pipeline in the exact order below. **Zero errors or warnings allowed.**

1.  **Type Validation:** Run `npx tsc --noEmit` to guarantee full type compliance.
2.  **Linting & Formatting:** Execute `npx fallow` to analyze code health and quality against codebase rules.
3.  **Automated Refactoring:** Initialize and execute `npx skills add fallow-rs/fallow-skills` to proactively verify, patch, and automate structural code quality improvements.
4.  **Production Build Test:** Run `npm run build` to ensure that Next.js compilation, optimization, and SSR pre-rendering complete successfully without breaking changes.
