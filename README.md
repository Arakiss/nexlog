# nexlog

nexlog is a simple, effective, and zero-dependency logging library for Next.js, compatible with server, browser, and edge environments. It's distributed as TypeScript files for maximum flexibility and type safety.

![CI/CD](https://github.com/Arakiss/nexlog/actions/workflows/ci-cd.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/nexlog.svg)
![License](https://img.shields.io/npm/l/nexlog.svg)

## Features

- Environment-aware logging (Server, Browser, Edge)
- Customizable log levels
- Colored console output for server environments
- Full TypeScript support
- Lightweight and easy to use
- Zero external dependencies
- No side effects
- Distributed as TypeScript files for maximum flexibility

## Installation

```bash
npm install nexlog
# or
yarn add nexlog
# or
bun add nexlog
```

## Configuration with Next.js

To use nexlog with Next.js, follow these steps:

1. Install nexlog as shown above.

2. Configure Next.js to transpile nexlog. In your `next.config.js` or `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["nexlog"],
};

export default nextConfig;
```

3. Use the LoggerProvider in your root layout (e.g., in `app/layout.tsx`):

```typescript
import { LoggerProvider } from 'nexlog/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LoggerProvider>
          {children}
        </LoggerProvider>
      </body>
    </html>
  );
}
```

4. In your components, use the `useLogger` hook:

```typescript
'use client';
import { useLogger } from 'nexlog/react';

export default function MyComponent() {
  const logger = useLogger();
  logger.info('MyComponent rendered');
  return <div>My Component</div>;
}
```

## Usage

```typescript
import logger from 'nexlog';

// Log messages
logger.info('This is an info message');
logger.warn('This is a warning', { additionalInfo: 'Some extra data' });
logger.error('An error occurred', { errorCode: 500 });
```

Note: The default export is an instance of the ConfigurableLogger class, pre-configured for the detected environment.

### Output Example

Server environment:
```
[INFO] This is an info message
[WARN] This is a warning {"additionalInfo":"Some extra data"}
[ERROR] An error occurred {"errorCode":500}
```

Browser/Edge environment:
```
[INFO] This is an info message
[WARN] This is a warning {"additionalInfo":"Some extra data"}
[ERROR] An error occurred {"errorCode":500}
```

## API

### Methods

- `logger.trace(msg: string, meta?: object)`
- `logger.debug(msg: string, meta?: object)`
- `logger.info(msg: string, meta?: object)`
- `logger.warn(msg: string, meta?: object)`
- `logger.error(msg: string, meta?: object)`
- `logger.fatal(msg: string, meta?: object)`
- `logger.setLevel(level: LogLevel)`
- `logger.getLevel(): LogLevel`
- `logger.enable()`
- `logger.disable()`
- `logger.isEnabled(): boolean`
- `logger.setSSROnly(ssrOnly: boolean)`

### Types

```typescript
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
```

## Configuration

You can configure the logger using the following methods:

```typescript
// Set the log level
logger.setLevel('debug');

// Enable or disable logging
logger.enable();
logger.disable();

// Set SSR-only mode
logger.setSSROnly(true);
```

## Environment Detection

nexlog automatically detects the current environment (server, browser, or edge) and adjusts its output accordingly. You can also use helper functions for detection:

```typescript
import { isServer, isNextEdgeRuntime } from 'nexlog';

if (isServer) {
  console.log('Running on server');
} else if (isNextEdgeRuntime) {
  console.log('Running on edge runtime');
} else {
  console.log('Running in browser');
}
```

## Development

To install dependencies:

```bash
npm install
# or
yarn install
# or
bun install
```

To run tests:

```bash
npm test
# or
yarn test
# or
bun test
```

## Contributing

While I'm currently the sole developer of this project, I'm open to contributions. If you have suggestions or want to contribute, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

## Support

If you find nexlog helpful, consider [sponsoring me](https://github.com/sponsors/Arakiss). Your support helps me maintain and improve this project.

## FAQ

### Does nexlog have any external dependencies?

No, nexlog is designed to be completely self-contained with zero external dependencies.

### Does nexlog have any side effects?

No, nexlog is carefully designed to avoid any side effects. It doesn't modify global objects or interfere with other parts of your application.

### Why is nexlog distributed as TypeScript files?

Distributing nexlog as TypeScript files provides maximum flexibility for users. It allows for better tree-shaking, gives users full type information, and lets them compile the library according to their project's specific needs.

### Why do I need to add 'use client' when using useLogger?

The `useLogger` hook is a React hook, and hooks can only be used in client components. Adding 'use client' at the beginning of the file tells Next.js that this component should be rendered on the client side.

### Why do I need to configure Next.js to transpile nexlog?

nexlog is distributed as TypeScript files to provide maximum flexibility and type safety. However, Next.js doesn't automatically transpile dependencies. By adding nexlog to the `transpilePackages` array in your Next.js configuration, you ensure that the TypeScript files are properly compiled for use in your Next.js application.

### I'm getting a "Module parse failed: Unexpected token" error. How do I fix it?

This error typically occurs when Next.js is trying to parse the TypeScript files directly. To resolve this, make sure you've properly configured Next.js to transpile nexlog as described in the "Configuration with Next.js" section above.

### The useLogger hook is not working. What might be the issue?

If you're encountering issues with the `useLogger` hook, ensure that:
1. You've wrapped your application with the `LoggerProvider` in your root layout.
2. You're using 'use client' directive in the file where you're using `useLogger`.
3. You've properly configured Next.js to transpile nexlog.

If you're still having issues, please open an issue on the GitHub repository with details about your setup and the specific error you're encountering.