/**
 * CircuitSage AI — Shared Constants for Frontend
 */

export const EPISTEMIC_STATUS = {
  VERIFIED_FACT: 'VERIFIED_FACT',
  AI_INFERENCE: 'AI_INFERENCE',
  UNKNOWN: 'UNKNOWN'
};

export const SUPPORTED_BOARDS = [
  {
    id: 'ESP32 DevKit v1',
    name: 'ESP32 DevKit v1',
    fqbn: 'esp32:esp32:esp32',
    logicVoltage: '3.3V',
    maxGpioCurrent: '40mA (12mA recommended)',
    architecture: 'Xtensa Dual-Core 32-bit',
    notes: 'Non-5V tolerant GPIOs. Requires 3.3V logic translation.'
  },
  {
    id: 'AI Thinker ESP32-CAM',
    name: 'AI Thinker ESP32-CAM',
    fqbn: 'esp32:esp32:esp32cam',
    logicVoltage: '3.3V',
    maxGpioCurrent: '40mA (12mA recommended)',
    architecture: 'Xtensa Dual-Core 32-bit with OV2640 Camera',
    notes: 'High current draw during Wi-Fi transmission. Flash via GPIO 0 -> GND.'
  },
  {
    id: 'ESP32 Wrover Module',
    name: 'ESP32 Wrover Module',
    fqbn: 'esp32:esp32:esp32wrover',
    logicVoltage: '3.3V',
    maxGpioCurrent: '40mA (12mA recommended)',
    architecture: 'Xtensa Dual-Core with 4MB/8MB PSRAM',
    notes: 'Ideal for computer vision and large memory buffers.'
  },
  {
    id: 'ESP32-S3 Dev Module',
    name: 'ESP32-S3 Dev Module',
    fqbn: 'esp32:esp32:esp32s3',
    logicVoltage: '3.3V',
    maxGpioCurrent: '40mA (12mA recommended)',
    architecture: 'Xtensa Dual-Core LX7 Edge AI',
    notes: 'Native USB CDC and vector extensions for on-device machine learning.'
  },
  {
    id: 'Arduino Uno R3',
    name: 'Arduino Uno R3',
    fqbn: 'arduino:avr:uno',
    logicVoltage: '5.0V',
    maxGpioCurrent: '40mA (20mA recommended)',
    architecture: 'ATmega328P 8-bit AVR',
    notes: '5V logic. Safe for 5V sensors, dangerous if connected directly to 3.3V boards.'
  },
  {
    id: 'Raspberry Pi Pico',
    name: 'Raspberry Pi Pico',
    fqbn: 'rp2040:rp2040:rpipico',
    logicVoltage: '3.3V',
    maxGpioCurrent: '16mA (3mA recommended)',
    architecture: 'RP2040 Dual ARM Cortex-M0+',
    notes: '3.3V logic. Strictly non-5V tolerant.'
  }
];

export const COMMON_COMPONENTS = [
  { id: 'resistor', label: 'Resistor', defaultVal: '220Ω' },
  { id: 'led', label: 'LED (Standard)', defaultVal: 'Blue (Vf ≈ 3.2V)' },
  { id: 'cap_ceramic', label: 'Decoupling Cap', defaultVal: '100nF' },
  { id: 'cap_electrolytic', label: 'Filter Cap', defaultVal: '100µF' },
  { id: 'oled_i2c', label: 'OLED Display (I2C)', defaultVal: 'SSD1306 (0x3C)' },
  { id: 'sensor_dht', label: 'Temp Sensor', defaultVal: 'DHT11' },
  { id: 'transistor_npn', label: 'NPN Transistor', defaultVal: '2N2222' },
  { id: 'diode', label: 'Flyback Diode', defaultVal: '1N4007' }
];

export const MEASUREMENT_TYPES = [
  { id: 'VOLTAGE_DC', label: 'DC Voltage', unit: 'V', defaultUnit: 'V', units: ['V', 'mV'] },
  { id: 'RESISTANCE', label: 'Resistance', unit: 'Ω', defaultUnit: 'Ω', units: ['Ω', 'kΩ', 'MΩ'] },
  { id: 'CONTINUITY', label: 'Continuity (Diode / Beep)', unit: 'State', defaultUnit: 'SHORT', units: ['SHORT (0Ω)', 'OPEN (OL)'] },
  { id: 'CURRENT_DC', label: 'DC Current', unit: 'mA', defaultUnit: 'mA', units: ['mA', 'µA', 'A'] }
];
