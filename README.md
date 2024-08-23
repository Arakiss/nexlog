# NextLogger

NextLogger is simple, effective, and zero-dependency logging library for Next.js, compatible with server, browser, and edge environments. Built entirely with Bun.

![CI/CD](https://github.com/Arakiss/nextlogger/actions/workflows/ci-cd.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/nextlogger.svg)
![License](https://img.shields.io/npm/l/nextlogger.svg)

## Features

- Environment-aware logging (Server, Browser, Edge)
- Customizable log levels
- Colored console output for server environments
- Full TypeScript support
- Lightweight and easy to use
- Zero external dependencies, leveraging Bun's all-in-one toolkit
- No side effects
- Built, tested, and bundled entirely with Bun

## Why Bun?

I've built NextLogger using [Bun](https://bun.sh), an all-in-one JavaScript runtime & toolkit designed for speed. Bun provides:

- Fast JavaScript/TypeScript runtime
- Built-in bundler
- Integrated test runner
- Node.js-compatible package manager

By leveraging Bun's comprehensive toolkit, I've been able to develop, test, run, and bundle NextLogger without any external dependencies. This ensures a lightweight, fast, and reliable logging solution for your Next.js projects.

## Installation

```bash
npm install nextlogger
# or
yarn add nextlogger
# or
bun add nextlogger
```

## Usage

```typescript
import logger from 'nextlogger';

// Set log level (optional)
logger.setLogLevel('info');

// Log messages
logger.info('This is an info message');
logger.warn('This is a warning', { additionalInfo: 'Some extra data' });
logger.error('An error occurred', { errorCode: 500 });
```

### Output Example

Server environment:
```
[2024-03-15T12:34:56.789Z] [INFO] This is an info message
[2024-03-15T12:34:56.790Z] [WARN] This is a warning {"additionalInfo":"Some extra data"}
[2024-03-15T12:34:56.791Z] [ERROR] An error occurred {"errorCode":500}
```

Browser/Edge environment:
```
[2024-03-15T12:34:56.789Z] [INFO] This is an info message
[2024-03-15T12:34:56.790Z] [WARN] This is a warning {"additionalInfo":"Some extra data"}
[2024-03-15T12:34:56.791Z] [ERROR] An error occurred {"errorCode":500}
```

## API

### Log Levels

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `fatal`

### Methods

- `logger.trace(message: string, meta?: object)`
- `logger.debug(message: string, meta?: object)`
- `logger.info(message: string, meta?: object)`
- `logger.warn(message: string, meta?: object)`
- `logger.error(message: string, meta?: object)`
- `logger.fatal(message: string, meta?: object)`
- `logger.setLogLevel(level: LogLevel)`

## Environment Detection

NextLogger automatically detects the current environment (server, browser, or edge) and adjusts its output accordingly. In server environments, it provides colored console output for better readability.

## Development

I use Bun as the all-in-one toolkit for this project. Here's how you can get started:

To install dependencies (although NextLogger has none, this is for development purposes):

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

## Roadmap

Here's what I'm planning for future updates:

- Add support for custom log formatters
- Implement log rotation for file-based logging
- Create plugins for popular frameworks and libraries

## License

This project is licensed under the MIT License.

## Support

If you find NextLogger helpful, consider [sponsoring me](https://github.com/sponsors/Arakiss). Your support helps me maintain and improve this project.

## FAQ

### Is NextLogger related to the 'next-logger' package?

No, NextLogger is not related to or affiliated with the 'next-logger' package. These are two independent projects with similar names but different implementations and purposes:

- NextLogger (my project) is a lightweight, environment-aware logging library I specifically designed for Next.js 14.x and later versions. I created it to address logging needs in modern Next.js applications across server, browser, and edge environments.

- 'next-logger' is a separate project that patches Next.js's built-in logger to output logs as JSON, primarily focused on server-side logging.

The similarity in names is coincidental. I developed NextLogger independently to solve specific logging challenges in recent Next.js versions, without prior knowledge of the 'next-logger' package.

### Why did I create NextLogger when 'next-logger' exists?

I created NextLogger to address specific logging needs in Next.js 14.x and later versions, particularly focusing on:

1. Compatibility with server, browser, and edge environments in modern Next.js applications.
2. Lightweight implementation with zero external dependencies, leveraging Bun's all-in-one toolkit.
3. No side effects, ensuring it doesn't interfere with other parts of your application.
4. Easy integration without the need for custom server setups or extensive configuration.

While 'next-logger' is a valuable tool for JSON logging in Next.js server environments, I aimed to provide a simple, universal logging solution across all Next.js runtime environments without introducing any external dependencies or side effects.

### Does NextLogger have any external dependencies?

No, I designed NextLogger to be completely self-contained with zero external dependencies. By leveraging Bun's comprehensive toolkit, I've been able to develop, test, and bundle NextLogger without relying on any third-party packages. This means you don't need to worry about compatibility issues or security vulnerabilities from external dependencies.

### Does NextLogger have any side effects?

No, I carefully designed NextLogger to avoid any side effects. It doesn't modify global objects or interfere with other parts of your application. This makes it safe to use in any part of your Next.js project without worrying about unexpected behavior.

### Why did you choose to build NextLogger with Bun?

I chose Bun for its all-in-one approach to JavaScript/TypeScript development. Bun's integrated runtime, bundler, test runner, and package manager allowed me to create NextLogger with zero external dependencies. This results in a faster, more lightweight, and more reliable logging solution for Next.js projects.

I apologize for any confusion the similarity in names may cause and encourage users to carefully consider their specific logging needs when choosing a logging library.