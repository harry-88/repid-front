# Rapid Front

An NPM CLI tool that automates the bridge between Swagger (OpenAPI) documentation and frontend state management/API integration.

## The Problem

Frontend developers often spend countless hours manually integrating APIs from Swagger or OpenAPI documentation. This process involves:
1. Reading the Swagger documentation.
2. Manually creating TypeScript interfaces for every schema.
3. Writing repetitive API call functions using Axios or Fetch.
4. Implementing state management logic (loading, error, data) for every endpoint in Redux, Zustand, or Context.
5. Keeping this code in sync whenever the backend changes.

This manual process is prone to human error, inconsistent naming conventions, and type mismatches.

## The Solution

Rapid Front automates this entire workflow. It acts as a bridge that:
1. **Reads** your Swagger/OpenAPI schema (URL or local file).
2. **Parses** the metadata to understand endpoints, methods, parameters, and types.
3. **Transforms** this data into a structured format.
4. **Generates** production-ready, type-safe code for your preferred state management library.

In seconds, you get a fully functional API layer with TypeScript interfaces, API hooks/stores, and automatic state management.

## Supported Frontend Frameworks

Rapid Front generates standard TypeScript/JavaScript code that is compatible with **any modern frontend framework**:

- **React.js** (Create React App, Vite)
- **Next.js** (App Router or Pages Router)
- **Vue.js** (via Pinia/Axios or native Fetch)
- **Angular** (via native Fetch or Axios)
- **Svelte/SvelteKit**
- **Vanilla JS/TS**

The generated code is framework-agnostic but optimized for the React ecosystem (especially Zustand and Redux Toolkit templates).

## Key Features

- **Interactive Wizard**: A guided step-by-step CLI experience.
- **Multi-Library Support**: Generate code for Zustand, Redux Toolkit, Axios Hooks, or native Fetch API.
- **TypeScript & JavaScript**: Full support for both, with accurate type definitions.
- **Smart Grouping**: Automatically organizes endpoints into modules based on Swagger tags (e.g., User, Product, Order).
- **Intelligent Naming**: Converts HTTP paths like "GET /users/{id}/orders" into clean function names like "getOrdersByUserId".
- **Validation & Recovery**: strict schema validation with a resilient "lenient mode" for imperfect schemas.
- **Selective Generation**: Choose to generate the entire API or specific modules only.
- **Clean output**: Files are organized in dedicated folders for maintainability.

## Installation

You can install the tool globally via NPM:

```bash
npm install -g rapid-front
```

Or you can run it directly using npx without installation:

```bash
npx rapid-front init
```

## Usage Guide

Run the initialization command to start the wizard:

```bash
rapid-front init
```

The CLI will ask you 5 simple questions:

### 1. Schema Source
"Provide the Swagger JSON/YAML URL or local file path"
- **Input**: A URL (e.g., https://petstore.swagger.io/v2/swagger.json) or a local file path (e.g., ./docs/swagger.json).
- **Note**: The tool automatically handles CORS issues and cleans up accidental surrounding quotes in input.

### 2. State Management Library
"Which state management/library would you like to use?"
- **Zustand (Recommended)**: Creates a dedicated store with `data`, `loading`, and `error` states for each endpoint. Best for modern React apps.
- **Redux Toolkit**: Generates slices, async thunks, and reducers. Best for large-scale applications using Redux.
- **Axios Hooks**: Generates custom hooks (e.g., `useGetUsers`) wrapping Axios. Best for lightweight data fetching.
- **Fetch API**: Generates dependency-free React hooks using the native Fetch API.

### 3. Language
"TypeScript or JavaScript?"
- **TypeScript**: Generates `.ts` files with full interface definitions. (Recommended)
- **JavaScript**: Generates `.js` files with JSDoc comments.

### 4. Output Directory
"Where should I save the generated modules?"
- **Default**: `./src/api`
- Change this to match your project structure (e.g., `./src/services` or `./lib/api`).

### 5. Generation Mode
"Generate all modules or select specific tags/modules?"
- **Generate all modules**: Processes the entire API.
- **Select specific tags**: Fetches the available tags from the schema and lets you choose which ones to generate (e.g., only "Auth" and "Users").

## Output Structure

The tool generates a modular structure for better maintainability. Each tag gets its own folder.

Example output for `./src/api`:

```text
src/api/
├── users/
│   └── useUsersStore.ts       # Main module file
├── products/
│   └── useProductsStore.ts    # Main module file
├── index.ts                   # Central export file
├── types.ts                   # TypeScript interfaces (if using TS)
└── README.md                  # Generated usage docs
```

## Integration Guide

Once generated, integrating the API into your application is simple.

### Setting the Base URL

Ensure you set the API base URL in your environment variables:

```bash
REACT_APP_API_BASE_URL=https://api.yourservice.com
```

### Using Zustand (Example)

```typescript
import { useEffect } from 'react';
import { useUserStore } from './src/api';

const UserProfile = () => {
  // Access state and actions directly
  const { data, loading, error, getUserById } = useUserStore();

  useEffect(() => {
    getUserById('123');
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return <div>Welcome, {data?.name}</div>;
};
```

### Using Redux Toolkit (Example)

1. Add the reducer to your store:
   ```typescript
   import { configureStore } from '@reduxjs/toolkit';
   import { userReducer } from './src/api';

   export const store = configureStore({
     reducer: {
       user: userReducer,
     },
   });
   ```

2. Use in component:
   ```typescript
   import { useDispatch, useSelector } from 'react-redux';
   import { getUserById } from './src/api';

   const UserProfile = () => {
     const dispatch = useDispatch();
     const { data, loading, error } = useSelector((state) => state.user);

     useEffect(() => {
       dispatch(getUserById('123'));
     }, [dispatch]);

     // ... render
   };
   ```

## Troubleshooting

### Schema Validation Failed
If you see an error like "Schema validation failed", don't worry. Rapid Front includes a fallback **Lenient Mode**. It will warn you about the specific validation error but continue to try and parse the schema to generate code anyway.
