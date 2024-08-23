# NextLogger

NextLogger is a simple and effective logging library for Next.js, compatible with server, browser, and edge environments.

![CI/CD](https://github.com/Arakiss/nextlogger/actions/workflows/ci-cd.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/nextlogger.svg)
![License](https://img.shields.io/npm/l/nextlogger.svg)

## Features

- Environment-aware logging (Server, Browser, Edge)
- Customizable log levels
- Colored console output for server environments
- Full TypeScript support
- Lightweight and easy to use
- Zero external dependencies
- No side effects

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

This project uses [Bun](https://bun.sh) as its JavaScript runtime.

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

Contributions are welcome! Please feel free to submit a Pull Request.

## Roadmap

- Add support for custom log formatters
- Implement log rotation for file-based logging
- Create plugins for popular frameworks and libraries

## License

This project is licensed under the MIT License.

## Author

[Arakiss](https://github.com/Arakiss)

## Support

If you find this project helpful, consider [sponsoring the author](https://github.com/sponsors/Arakiss).

## FAQ

### Is NextLogger related to the 'next-logger' package?

No, NextLogger is not related to or affiliated with the 'next-logger' package. These are two independent projects with similar names but different implementations and purposes:

- NextLogger (this project) is a lightweight, environment-aware logging library specifically designed for Next.js 14.x and later versions. It was created to address logging needs in modern Next.js applications across server, browser, and edge environments.

- 'next-logger' is a separate project that patches Next.js's built-in logger to output logs as JSON, primarily focused on server-side logging.

The similarity in names is coincidental. NextLogger was developed independently to solve specific logging challenges in recent Next.js versions, without prior knowledge of the 'next-logger' package.

### Why create NextLogger when 'next-logger' exists?

NextLogger was created to address specific logging needs in Next.js 14.x and later versions, particularly focusing on:

1. Compatibility with server, browser, and edge environments in modern Next.js applications.
2. Lightweight implementation with zero external dependencies.
3. No side effects, ensuring it doesn't interfere with other parts of your application.
4. Easy integration without the need for custom server setups or extensive configuration.

While 'next-logger' is a valuable tool for JSON logging in Next.js server environments, NextLogger aims to provide a simple, universal logging solution across all Next.js runtime environments without introducing any external dependencies or side effects.

### Does NextLogger have any external dependencies?

No, NextLogger is designed to be completely self-contained and has zero external dependencies. This means you don't need to worry about compatibility issues or security vulnerabilities from third-party packages.

### Does NextLogger have any side effects?

No, NextLogger is carefully designed to avoid any side effects. It doesn't modify global objects or interfere with other parts of your application. This makes it safe to use in any part of your Next.js project without worrying about unexpected behavior.

We apologize for any confusion this may cause and encourage users to carefully consider their specific logging needs when choosing between logging libraries.