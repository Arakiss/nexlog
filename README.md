# nexlog

nexlog is a simple, effective, and zero-dependency logging library for Next.js, compatible with server, browser, and edge environments. Built entirely with Bun.

![CI/CD](https://github.com/Arakiss/nexlog/actions/workflows/ci-cd.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/nexlog.svg)
![License](https://img.shields.io/npm/l/nexlog.svg)

## Features

- Environment-aware logging (Server, Browser, Edge)
- Customizable log levels
- Colored console output for server environments
- Full TypeScript support
- Lightweight and easy to use
- Zero external dependencies, leveraging Bun's all-in-one toolkit
- No side effects
- Built, tested, and bundled entirely with Bun

## Installation

```bash
npm install nexlog
# or
yarn add nexlog
# or
bun add nexlog
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

## Integration with Next.js

nexlog provides a React provider for easy integration with Next.js applications. Here's how to use it:

1. Import the LoggerProvider in your root layout file (e.g., `app/layout.tsx`):
```typescript
import { LoggerProvider } from 'nexlog/react';
```

2. Wrap your application with the LoggerProvider:
```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LoggerProvider
          initialLevel={process.env.NODE_ENV === 'production' ? 'warn' : 'info'}
          ssrOnly={process.env.NODE_ENV === 'production'}
          disabled={process.env.NODE_ENV === 'test'}
        >
          {children}
        </LoggerProvider>
      </body>
    </html>
  );
}
```

The LoggerProvider accepts the following props:
- `initialLevel`: Sets the initial log level (LogLevel type)
- `ssrOnly`: When true, logs only on the server side (boolean)
- `disabled`: When true, disables all logging (boolean)

3. Use the logger in your components:
```typescript
import { useLogger } from 'nexlog/react';

export default function MyComponent() {
  const logger = useLogger();
  
  logger.info('MyComponent rendered');
  
  return <div>My Component</div>;
}
```

This setup allows you to configure the logger globally and use it throughout your Next.js application with ease.

## Development

This project uses Bun as the all-in-one toolkit. Here's how you can get started:

To install dependencies:

```bash
bun install
```

To run tests:

```bash
bun test
```

To build the project:

```bash
bun run build
```

## Contributing

While I'm currently the sole developer of this project, I'm open to contributions. If you have suggestions or want to contribute, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

## Support

If you find nexlog helpful, consider [sponsoring me](https://github.com/sponsors/Arakiss). Your support helps me maintain and improve this project.

## FAQ

### Does nexlog have any external dependencies?

No, nexlog is designed to be completely self-contained with zero external dependencies. By leveraging Bun's comprehensive toolkit, it's developed, tested, and bundled without relying on any third-party packages.

### Does nexlog have any side effects?

No, nexlog is carefully designed to avoid any side effects. It doesn't modify global objects or interfere with other parts of your application.

### Why was nexlog built with Bun?

nexlog was built with Bun for its all-in-one approach to JavaScript/TypeScript development. Bun's integrated runtime, bundler, test runner, and package manager allowed for the creation of nexlog with zero external dependencies, resulting in a faster, more lightweight, and more reliable logging solution for Next.js projects.