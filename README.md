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

## Why Bun?

I've built nexlog using [Bun](https://bun.sh), an all-in-one JavaScript runtime & toolkit designed for speed. Bun provides:

- Fast JavaScript/TypeScript runtime
- Built-in bundler
- Integrated test runner
- Node.js-compatible package manager

By leveraging Bun's comprehensive toolkit, I've been able to develop, test, run, and bundle nexlog without any external dependencies. This ensures a lightweight, fast, and reliable logging solution for your Next.js projects.

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

nexlog automatically detects the current environment (server, browser, or edge) and adjusts its output accordingly. In server environments, it provides colored console output for better readability.

## Development

I use Bun as the all-in-one toolkit for this project. Here's how you can get started:

To install dependencies (although nexlog has none, this is for development purposes):

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

If you find nexlog helpful, consider [sponsoring me](https://github.com/sponsors/Arakiss). Your support helps me maintain and improve this project.

## FAQ

### Does nexlog have any external dependencies?

No, I designed nexlog to be completely self-contained with zero external dependencies. By leveraging Bun's comprehensive toolkit, I've been able to develop, test, and bundle nexlog without relying on any third-party packages. This means you don't need to worry about compatibility issues or security vulnerabilities from external dependencies.

### Does nexlog have any side effects?

No, I carefully designed nexlog to avoid any side effects. It doesn't modify global objects or interfere with other parts of your application. This makes it safe to use in any part of your Next.js project without worrying about unexpected behavior.

### Why did you choose to build nexlog with Bun?

I chose Bun for its all-in-one approach to JavaScript/TypeScript development. Bun's integrated runtime, bundler, test runner, and package manager allowed me to create nexlog with zero external dependencies. This results in a faster, more lightweight, and more reliable logging solution for Next.js projects.