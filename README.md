# NextLogger

NextLogger is a simple and effective logging library for Next.js, compatible with server, browser, and edge environments.

![npm version](https://img.shields.io/npm/v/nextlogger.svg)
![License](https://img.shields.io/npm/l/nextlogger.svg)

## Features

- Environment-aware logging (Server, Browser, Edge)
- Customizable log levels
- Colored console output for server environments
- Full TypeScript support
- Lightweight and easy to use

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