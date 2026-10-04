/**
 * CircuitSage AI — Curated Electronics Knowledge Base Repository
 * Queries verified component pinouts, operating voltage limits, and common failure modes.
 */

const { anonClient, isConfigured } = require('../lib/supabaseClient');

// Static curated knowledge catalog matching seed.sql for offline/instant sub-50ms retrieval
const CURATED_COMPONENTS = [
  {
    id: 'comp_esp32_devkit_v1',
    component_name: 'ESP32 DevKit v1',
    category: 'MICROCONTROLLER',
    operating_voltage_min: 3.0,
    operating_voltage_max: 3.6,
    max_pin_current_ma: 40.0,
    pinout_data: {
      default_i2c_sda: 'GPIO21',
      default_i2c_scl: 'GPIO22',
      strapping_pins: ['GPIO0', 'GPIO2', 'GPIO12', 'GPIO15'],
      adc2_pins: ['GPIO0', 'GPIO2', 'GPIO4', 'GPIO12', 'GPIO13', 'GPIO14', 'GPIO15', 'GPIO25', 'GPIO26', 'GPIO27']
    },
    known_pitfalls: [
      'GPIOs are NOT 5V tolerant. Connecting 5V signals directly destroys the pin.',
      'ADC2 pins cannot be used for analog reads while Wi-Fi is active.',
      'Strapping pins (GPIO 0, 2, 12, 15) must not be pulled to invalid states during boot.',
      'Maximum recommended continuous pin drive current is 12mA (absolute maximum is 40mA).'
    ],
    source_document: 'Espressif ESP32 Series Datasheet v4.3'
  },
  {
    id: 'comp_arduino_uno_r3',
    component_name: 'Arduino Uno R3',
    category: 'MICROCONTROLLER',
    operating_voltage_min: 4.5,
    operating_voltage_max: 5.5,
    max_pin_current_ma: 40.0,
    pinout_data: {
      default_i2c_sda: 'A4',
      default_i2c_scl: 'A5',
      digital_pins: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13'],
      pwm_pins: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11']
    },
    known_pitfalls: [
      'Operates on 5.0V logic. 3.3V sensors connected to 5V output pins require logic level shifters.',
      'Total microcontroller current sink/source limit is 200mA across all pins combined.',
      'Pins D0 and D1 are tied to the USB UART converter; using them for sensors can cause upload failures.'
    ],
    source_document: 'Microchip ATmega328P Complete Datasheet'
  },
  {
    id: 'comp_rpi_pico',
    component_name: 'Raspberry Pi Pico (RP2040)',
    category: 'MICROCONTROLLER',
    operating_voltage_min: 3.0,
    operating_voltage_max: 3.6,
    max_pin_current_ma: 50.0,
    pinout_data: {
      default_i2c0_sda: 'GP4',
      default_i2c0_scl: 'GP5',
      default_uart_tx: 'GP0',
      default_uart_rx: 'GP1'
    },
    known_pitfalls: [
      '3.3V logic level only. Connecting 5V signals will damage the RP2040 chip.',
      'ADC pins have an internal input impedance that requires low-impedance signal sources for accurate readings.',
      'Combined package GPIO current must not exceed 50mA.'
    ],
    source_document: 'Raspberry Pi RP2040 Datasheet v1.4'
  },
  {
    id: 'comp_led_5mm_blue',
    component_name: '5mm Blue Through-Hole LED',
    category: 'PASSIVE',
    operating_voltage_min: 3.0,
    operating_voltage_max: 3.4,
    max_pin_current_ma: 25.0,
    pinout_data: {
      anode: 'Long leg',
      cathode: 'Short leg / flat edge on plastic collar'
    },
    known_pitfalls: [
      'Forward voltage drop is typically 3.0V - 3.2V. Connecting directly to 5V without series resistor burns the diode.',
      'When powered by 3.3V GPIO, typical series resistor is 68 to 150 ohms for 5-10mA forward current.',
      'Reversed polarity blocks current and LED will not illuminate.'
    ],
    source_document: 'Standard Optoelectronics 5mm Indicator LED Specifications'
  },
  {
    id: 'comp_ssd1306_oled',
    component_name: 'SSD1306 0.96" I2C OLED Display',
    category: 'SENSOR',
    operating_voltage_min: 3.3,
    operating_voltage_max: 5.0,
    max_pin_current_ma: 10.0,
    pinout_data: {
      vcc: '3.3V or 5V (board dependent)',
      gnd: 'Ground',
      scl: 'I2C Clock line (requires pull-up)',
      sda: 'I2C Data line (requires pull-up)'
    },
    known_pitfalls: [
      'Requires pull-up resistors (4.7k ohm) on SDA and SCL if breakout board does not include onboard pull-ups.',
      'Default 7-bit I2C address is usually 0x3C, but some clones use 0x3D based on address jumper.'
    ],
    source_document: 'Solomon Systech SSD1306 Advance Information Datasheet'
  }
];

class KnowledgeRepository {
  /**
   * Search knowledge base by query string and optional category filter
   */
  async search({ query = '', category = null, limit = 20 }) {
    if (isConfigured && anonClient) {
      try {
        let dbQuery = anonClient
          .from('knowledge_sources')
          .select('id, component_name, category, operating_voltage_min, operating_voltage_max, max_pin_current_ma, pinout_data, known_pitfalls, source_document');

        if (query) {
          dbQuery = dbQuery.ilike('component_name', `%${query}%`);
        }
        if (category) {
          dbQuery = dbQuery.eq('category', category.toUpperCase());
        }

        const { data, error } = await dbQuery.limit(limit);
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('[KnowledgeRepository] Supabase query failed, falling back to embedded catalog:', err.message);
      }
    }

    // Local catalog search fallback
    const qLower = query.toLowerCase().trim();
    const catUpper = category ? category.toUpperCase().trim() : null;

    return CURATED_COMPONENTS.filter((comp) => {
      const matchCat = !catUpper || comp.category === catUpper;
      const matchQuery =
        !qLower ||
        comp.component_name.toLowerCase().includes(qLower) ||
        comp.id.toLowerCase().includes(qLower) ||
        (Array.isArray(comp.known_pitfalls) &&
          comp.known_pitfalls.some((p) => p.toLowerCase().includes(qLower)));
      return matchCat && matchQuery;
    }).slice(0, limit);
  }

  /**
   * Find a specific component by ID
   */
  async findById(id) {
    if (isConfigured && anonClient) {
      try {
        const { data, error } = await anonClient
          .from('knowledge_sources')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data;
      } catch {
        // Fallback to static
      }
    }

    return CURATED_COMPONENTS.find((c) => c.id === id) || null;
  }
}

module.exports = new KnowledgeRepository();
