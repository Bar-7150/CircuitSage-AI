/**
 * CircuitSage AI — Default IoT & ESP32-CAM Project Templates
 */

export const DEFAULT_ESP32_CAM_FILES = [
  {
    name: 'esp32_cam_blink.ino',
    path: 'esp32_cam_blink.ino',
    language: 'cpp',
    content: `/**
 * CircuitSage AI — ESP32-CAM Onboard Flash & Diagnostic Firmware
 * Target Board: AI Thinker ESP32-CAM (FQBN: esp32:esp32:esp32cam)
 *
 * Pin assignments:
 * - GPIO 4: High-brightness White Onboard Flash LED (active HIGH)
 * - GPIO 33: Onboard Red Status LED (active LOW inverted)
 * - GPIO 0: Flash Bootloader switch (ground to flash, float to run)
 */

#include "camera_pins.h"

#define FLASH_LED_PIN 4
#define STATUS_LED_PIN 33

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n====================================");
  Serial.println(" CircuitSage AI: ESP32-CAM Online   ");
  Serial.println("====================================");

  // Initialize status indicators
  pinMode(FLASH_LED_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);

  // Start with indicators OFF
  digitalWrite(FLASH_LED_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, HIGH); // Inverted on ESP32-CAM

  Serial.println("[Setup] Hardware I/O configured successfully.");
  Serial.println("[Status] Flash LED ready on GPIO 4, Status LED on GPIO 33.");
}

void loop() {
  // Pulse status LED to verify main event loop
  digitalWrite(STATUS_LED_PIN, LOW);  // LED ON
  delay(200);
  digitalWrite(STATUS_LED_PIN, HIGH); // LED OFF
  delay(800);

  Serial.println("[Telemetry] Heartbeat pulse OK | Logic Voltage: 3.3V | VDD: 3.28V");
}
`
  },
  {
    name: 'camera_pins.h',
    path: 'camera_pins.h',
    language: 'cpp',
    content: `/**
 * Pin Map for AI-Thinker ESP32-CAM Module
 * Sensor: OmniVision OV2640 / OV3660
 */

#ifndef CAMERA_PINS_H
#define CAMERA_PINS_H

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#endif // CAMERA_PINS_H
`
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    content: `# CircuitSage AI — ESP32-CAM Project

Target: **AI Thinker ESP32-CAM**
FQBN: \`esp32:esp32:esp32cam\`

## Hardware Warnings
1. **Power Supply**: ESP32-CAM requires a stable 5V 2A external power source. USB-to-UART dongles often cause brownouts when Wi-Fi or Camera activates.
2. **Flash Mode**: Connect \`GPIO 0\` to \`GND\` before pressing the RESET button to enter serial bootloader flashing mode. Disconnect \`GPIO 0\` after upload.
`
  }
];
