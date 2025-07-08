# ESP32-C3_MINI_V1 Development Setup

## Device Information
- Board: ESP32-C3_MINI_V1
- Architecture: RISC-V
- WiFi: 2.4 GHz
- Bluetooth: BLE 5.0
- Flash Memory: 4MB
- SRAM: 400KB

## Development Environment Setup

### 1. Prerequisites
- Python 3.7 or newer
- Git
- Visual Studio Code
- USB Driver (CP210x for most ESP32 boards)

### 2. ESP-IDF Setup
1. Install ESP-IDF Extension in VS Code
2. Install ESP-IDF Tools
3. Set up environment variables

### 3. Project Structure
```
esp32/
├── projects/
│   └── hello_world/       # First test project
│       ├── main/
│       │   └── main.c
│       ├── CMakeLists.txt
│       └── sdkconfig
├── components/           # Custom components
└── tools/               # Development tools
```

## First Project: Hello World with LED Blink

This project will:
1. Initialize the ESP32
2. Configure GPIO for LED
3. Create a blinking pattern
4. Print "Hello World" to serial monitor

## Common Commands

```bash
# Build the project
idf.py build

# Flash the device
idf.py -p [PORT] flash

# Monitor serial output
idf.py -p [PORT] monitor

# Clean build files
idf.py clean

# All-in-one command (build, flash, and monitor)
idf.py -p [PORT] flash monitor
```

## Troubleshooting

### Common Issues
1. Port not found
   - Check USB connection
   - Verify driver installation
   - Try different USB cable

2. Build fails
   - Verify ESP-IDF installation
   - Check Python version
   - Ensure all dependencies are installed

3. Upload fails
   - Hold BOOT button while uploading
   - Check USB connection
   - Verify correct port selection

## Next Steps
1. LED Blink project
2. WiFi connectivity
3. Sensor integration
4. Cloud connectivity
5. Power management
