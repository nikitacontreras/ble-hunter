# BLE Hunter

Universal BLE Explorer & Reverse Engineering Tool.

This application is designed to facilitate interaction with Bluetooth Low Energy (BLE) devices. It acts as a central console for connecting to devices, exploring their services and characteristics, decoding protocols, and sending commands. It is particularly useful for IoT developers and reverse engineering enthusiasts working with unknown BLE protocols (e.g., smartwatches, trackers).

## Features

- Scan and connect to nearby BLE devices.
- Explore Services and Characteristics.
- Log and analyze hex traffic.
- Send custom hex commands.
- Hex-to-ASCII and integer decoding.
- Cross-platform support (Windows, macOS, Linux).

## Development

### Prerequisites

- Node.js (Latest LTS recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository or extract the project files.
2. Open a terminal in the project root directory.
3. Install the dependencies:

```bash
npm install
```

### Running Locally

To start the application in development mode:

```bash
npm start
```

This will launch the Electron application window with developer tools enabled.

## Building for Production

This project uses `electron-builder` to create installers and executables.

### General Build Command

To build the application for your current operating system, run:

```bash
npm run dist
```

The output files (installers, executables) will be placed in the `dist/` directory.

### Building for Specific Platforms

While it is recommended to build on the native platform (e.g., build Windows apps on Windows), you can target specific platforms using the following instructions.

#### macOS

To build for macOS (creates .dmg and .zip):

```bash
npm run dist -- --mac
```
*Note: You must be running macOS to sign and notarize the application properly. If strictly building locally without signing, standard build commands work.*

#### Windows

To build for Windows (creates NSIS installer):

```bash
npm run dist -- --win
```
*Note: Building for Windows from non-Windows platforms (like macOS or Linux) requires Wine to be installed on your system. For the most reliable results, run the build command on a Windows machine.*

#### Linux

To build for Linux (creates AppImage):

```bash
npm run dist -- --linux
```

## Project Structure

- **src/main**: Contains the main process code (Electron entry point).
- **src/renderer**: Contains the frontend code (UI, BLE logic).
- **dist**: Destination for built artifacts.
