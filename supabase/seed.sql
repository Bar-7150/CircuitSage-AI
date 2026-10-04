-- ============================================================================
-- CircuitSage AI — Curated Electronics Knowledge Base Seed Data
-- ============================================================================
-- Seed data for core supported hardware: ESP32, Arduino Uno, Raspberry Pi Pico,
-- LEDs, and common sensors.
-- ============================================================================

INSERT INTO public.knowledge_sources (
    id, component_name, category, operating_voltage_min, operating_voltage_max, max_pin_current_ma, pinout_data, known_pitfalls, source_document
) VALUES
(
    'comp_esp32_devkit_v1',
    'ESP32 DevKit v1',
    'MICROCONTROLLER',
    3.0,
    3.6,
    40.0,
    '{
        "default_i2c_sda": "GPIO21",
        "default_i2c_scl": "GPIO22",
        "strapping_pins": ["GPIO0", "GPIO2", "GPIO12", "GPIO15"],
        "adc2_pins": ["GPIO0", "GPIO2", "GPIO4", "GPIO12", "GPIO13", "GPIO14", "GPIO15", "GPIO25", "GPIO26", "GPIO27"]
    }'::jsonb,
    '[
        "GPIOs are NOT 5V tolerant. Connecting 5V signals directly destroys the pin.",
        "ADC2 pins cannot be used for analog reads while Wi-Fi is active.",
        "Strapping pins (GPIO 0, 2, 12, 15) must not be pulled to invalid states during boot.",
        "Maximum recommended continuous pin drive current is 12mA (absolute maximum is 40mA)."
    ]'::jsonb,
    'Espressif ESP32 Series Datasheet v4.3'
),
(
    'comp_arduino_uno_r3',
    'Arduino Uno R3',
    'MICROCONTROLLER',
    4.5,
    5.5,
    40.0,
    '{
        "default_i2c_sda": "A4",
        "default_i2c_scl": "A5",
        "digital_pins": ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13"],
        "pwm_pins": ["D3", "D5", "D6", "D9", "D10", "D11"]
    }'::jsonb,
    '[
        "Operates on 5.0V logic. 3.3V sensors connected to 5V output pins require logic level shifters.",
        "Total microcontroller current sink/source limit is 200mA across all pins combined.",
        "Pins D0 and D1 are tied to the USB UART converter; using them for sensors can cause upload failures."
    ]'::jsonb,
    'Microchip ATmega328P Complete Datasheet'
),
(
    'comp_rpi_pico',
    'Raspberry Pi Pico (RP2040)',
    'MICROCONTROLLER',
    3.0,
    3.6,
    50.0,
    '{
        "default_i2c0_sda": "GP4",
        "default_i2c0_scl": "GP5",
        "default_uart_tx": "GP0",
        "default_uart_rx": "GP1"
    }'::jsonb,
    '[
        "3.3V logic level only. Connecting 5V signals will damage the RP2040 chip.",
        "ADC pins have an internal input impedance that requires low-impedance signal sources for accurate readings.",
        "Combined package GPIO current must not exceed 50mA."
    ]'::jsonb,
    'Raspberry Pi RP2040 Datasheet v1.4'
),
(
    'comp_led_5mm_blue',
    '5mm Blue Through-Hole LED',
    'PASSIVE',
    3.0,
    3.4,
    25.0,
    '{
        "anode": "Long leg",
        "cathode": "Short leg / flat edge on plastic collar"
    }'::jsonb,
    '[
        "Forward voltage drop is typically 3.0V - 3.2V. Connecting directly to 5V without series resistor burns the diode.",
        "When powered by 3.3V GPIO, typical series resistor is 68 to 150 ohms for 5-10mA forward current.",
        "Reversed polarity blocks current and LED will not illuminate."
    ]'::jsonb,
    'Standard Optoelectronics 5mm Indicator LED Specifications'
),
(
    'comp_ssd1306_oled',
    'SSD1306 0.96\" I2C OLED Display',
    'SENSOR',
    3.3,
    5.0,
    10.0,
    '{
        "vcc": "3.3V or 5V",
        "gnd": "Ground",
        "scl": "I2C Clock line (requires pull-up)",
        "sda": "I2C Data line (requires pull-up)",
        "default_address_1": "0x3C",
        "default_address_2": "0x3D"
    }'::jsonb,
    '[
        "Requires 4.7k - 10k ohm pull-up resistors on SDA and SCL if not present on breakout board.",
        "Swapping SDA and SCL lines prevents I2C ACK and causes initialization timeout.",
        "Default I2C address is usually 0x3C; check back of PCB if display fails to respond."
    ]'::jsonb,
    'Solomon Systech SSD1306 Advance Information Datasheet'
)
ON CONFLICT (id) DO NOTHING;
