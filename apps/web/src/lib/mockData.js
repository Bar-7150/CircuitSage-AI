/**
 * CircuitSage AI — Demo & Development Mock Scenarios
 * Used ONLY when Demo/Development mode is explicitly activated.
 * Grounded strictly in authentic electronics engineering principles.
 */

import { EPISTEMIC_STATUS } from './constants.js';

export const DEMO_SCENARIOS = [
  {
    id: 'demo-esp32-blue-led',
    name: 'ESP32 Blue LED Inoperative (Polarity & Resistor Check)',
    board: 'ESP32 DevKit v1',
    description: 'Blue 5mm LED connected between GPIO 18 and GND never illuminates when the blink sketch runs. Pin should be pulsing HIGH at 1Hz.',
    components: ['Blue LED (Vf ~ 3.2V)', '220Ω Resistor'],
    pinConnections: 'GPIO 18 -> Resistor -> LED -> GND',
    diagnosis: {
      case: {
        id: 'case-demo-esp32-001',
        status: 'ACTIVE',
        target_board: 'ESP32 DevKit v1',
        symptom_description: 'Blue 5mm LED connected between GPIO 18 and GND never illuminates when the blink sketch runs. Pin should be pulsing HIGH at 1Hz.',
        image_url: null,
        created_at: new Date().toISOString()
      },
      epistemic_summary: {
        verified_facts_count: 2,
        ai_inferences_count: 2,
        unknown_assumptions_count: 1
      },
      deterministic_checks: [
        {
          check_id: 'chk_esp32_gpio_voltage',
          rule: 'ESP32 Nominal Logic Output (3.3V)',
          result: 'VERIFIED_PASS',
          epistemic_status: EPISTEMIC_STATUS.VERIFIED_FACT,
          message: 'ESP32 VOH nominal is 3.3V. Safe range for low-current logic.',
          critical: false
        },
        {
          check_id: 'chk_led_forward_headroom',
          rule: 'Blue LED Forward Voltage Headroom Calculation',
          result: 'WARNING',
          epistemic_status: EPISTEMIC_STATUS.VERIFIED_FACT,
          message: 'Blue LED forward voltage Vf is ~3.0V - 3.2V. With VDD=3.3V and 220Ω resistor, forward current If = (3.3V - 3.2V) / 220Ω = ~0.45mA. This may produce barely visible emission or fail if Vf > 3.2V.',
          critical: false
        },
        {
          check_id: 'chk_resistor_protection',
          rule: 'Current Limiting Resistor Verification',
          result: 'VERIFIED_PASS',
          epistemic_status: EPISTEMIC_STATUS.VERIFIED_FACT,
          message: '220Ω series resistor guarantees current will not exceed ESP32 maximum GPIO limit (40mA). Max possible current is 15mA.',
          critical: false
        }
      ],
      hypotheses: [
        {
          id: 'hyp_01',
          rank: 1,
          title: 'Reverse Polarity on Blue LED (Cathode/Anode Inverted)',
          category: 'WIRING_POLARITY',
          epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
          confidence_score: 0.75,
          confidence_label: '75% (High Probabilistic Inference)',
          explanation: 'Standard through-hole LEDs are polarized diodes. If the cathode (flat rim / shorter lead) is wired to GPIO 18 and the anode is wired to GND, the diode is reverse-biased under logic HIGH and will block all current.',
          suggested_test: {
            test_id: 'test_gpio18_voltage',
            title: 'Verify GPIO 18 Output Drive Voltage',
            tool: 'Digital Multimeter (DC Volts, 20V range)',
            probe_positive: 'ESP32 GPIO 18 (or Resistor leg)',
            probe_negative: 'Breadboard GND Rail',
            expected_nominal: 'Pulsing ~3.3V when HIGH, ~0V when LOW',
            instructions: 'Touch RED probe to GPIO 18 and BLACK probe to common GND. Confirm the microcontroller is actively driving the pin HIGH.'
          }
        },
        {
          id: 'hyp_02',
          rank: 2,
          title: 'Insufficient Forward Current (Vf Headroom Starvation)',
          category: 'VOLTAGE_LEVEL',
          epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
          confidence_score: 0.60,
          confidence_label: '60% (Moderate Inference)',
          explanation: 'Certain blue and white high-intensity LEDs exhibit forward drop Vf of 3.2V to 3.4V. From a 3.3V rail through a 220Ω resistor, voltage drop across the resistor is less than 0.1V, yielding current under 0.5mA.',
          suggested_test: {
            test_id: 'test_led_anode_voltage',
            title: 'Measure Forward Voltage Drop Across LED',
            tool: 'Digital Multimeter (DC Volts, 20V range)',
            probe_positive: 'LED Anode (+)',
            probe_negative: 'LED Cathode (-)',
            expected_nominal: '2.8V - 3.2V DC across diode',
            instructions: 'Measure the potential difference across the two LED leads while GPIO 18 is commanded HIGH.'
          }
        },
        {
          id: 'hyp_03',
          rank: 3,
          title: 'Firmware Pin Configuration Mismatch',
          category: 'FIRMWARE_PIN',
          epistemic_status: EPISTEMIC_STATUS.UNKNOWN,
          confidence_score: 0.35,
          confidence_label: '35% (Unverified Assumption)',
          explanation: 'Breadboard silkscreen markings occasionally differ between ESP32 30-pin and 38-pin modules (e.g. GPIO18 vs D18 or physical pin 18). Pin may not be toggling.',
          suggested_test: {
            test_id: 'test_pin_toggle',
            title: 'Direct Output High Continuity Check',
            tool: 'Digital Multimeter (DC Volts, 20V range)',
            probe_positive: 'Physical ESP32 Pin marked G18',
            probe_negative: 'GND',
            expected_nominal: '3.3V continuous when forced HIGH',
            instructions: 'Upload a minimal sketch with digitalWrite(18, HIGH) and verify continuous 3.3V directly at the header pin.'
          }
        }
      ]
    }
  },
  {
    id: 'demo-esp32-brownout',
    name: 'ESP32 Brownout Reset Loop During WiFi Connect',
    board: 'ESP32 DevKit v1',
    description: 'ESP32 boots normally, prints serial output, but continuously resets with "Brownout detector was triggered" the instant WiFi.begin() is called.',
    components: ['ESP32 DevKit v1', 'USB Cable (1m)', 'Breadboard Power Supply'],
    pinConnections: 'USB 5V -> DevKit VIN, 3V3 rail powering ESP32',
    diagnosis: {
      case: {
        id: 'case-demo-esp32-002',
        status: 'ACTIVE',
        target_board: 'ESP32 DevKit v1',
        symptom_description: 'ESP32 boots normally, prints serial output, but continuously resets with "Brownout detector was triggered" the instant WiFi.begin() is called.',
        image_url: null,
        created_at: new Date().toISOString()
      },
      epistemic_summary: {
        verified_facts_count: 3,
        ai_inferences_count: 2,
        unknown_assumptions_count: 1
      },
      deterministic_checks: [
        {
          check_id: 'chk_esp32_wifi_current',
          rule: 'ESP32 RF Peak Current Requirement Check',
          result: 'VERIFIED_PASS',
          epistemic_status: EPISTEMIC_STATUS.VERIFIED_FACT,
          message: 'Datasheet specifies ESP32 RF calibration requires 379mA to 500mA peak pulses (duration < 1ms) upon 2.4GHz radio initialization.',
          critical: true
        },
        {
          check_id: 'chk_breadboard_rail_impedance',
          rule: 'Breadboard Contact Resistance & Trace Drop',
          result: 'WARNING',
          epistemic_status: EPISTEMIC_STATUS.VERIFIED_FACT,
          message: 'Long thin USB cables or breadboard spring contacts can introduce 1Ω - 2Ω series impedance. A 400mA pulse through 1.5Ω drops rail voltage by 0.6V (3.3V -> 2.7V), triggering internal 2.8V brownout reset.',
          critical: true
        }
      ],
      hypotheses: [
        {
          id: 'hyp_01',
          rank: 1,
          title: '3.3V Rail Voltage Sag Due to High Cable Impedance / Missing Bulk Decoupling',
          category: 'POWER_INTEGRITY',
          epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
          confidence_score: 0.88,
          confidence_label: '88% (High Probabilistic Inference)',
          explanation: 'When the 2.4GHz radio synthesizes its first RF calibration packet, current surges from ~45mA to ~450mA in nanoseconds. Without a low-ESR bulk capacitor (100µF - 470µF) adjacent to the 3.3V pin, the rail sags below the 2.7V brownout threshold.',
          suggested_test: {
            test_id: 'test_3v3_sag',
            title: 'Multimeter / Scope 3.3V Rail Sag Observation',
            tool: 'Digital Multimeter (Min/Max mode or DC 20V)',
            probe_positive: 'ESP32 3V3 Pin',
            probe_negative: 'ESP32 GND Pin',
            expected_nominal: 'Must remain >= 3.0V at all times',
            instructions: 'Measure the 3.3V pin during boot. If reading drops below 2.8V during WiFi handshake, add a 100µF electrolytic capacitor directly between 3V3 and GND.'
          }
        },
        {
          id: 'hyp_02',
          rank: 2,
          title: 'Insufficient Host USB Port Current Capability',
          category: 'POWER_SUPPLY',
          epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
          confidence_score: 0.65,
          confidence_label: '65% (Moderate Inference)',
          explanation: 'Unpowered USB 2.0 hubs or low-power host ports can be current-limited to 100mA before USB descriptor negotiation.',
          suggested_test: {
            test_id: 'test_vin_voltage',
            title: 'Measure 5V VIN Rail Stability',
            tool: 'Digital Multimeter (DC Volts, 20V range)',
            probe_positive: 'ESP32 VIN / 5V Pin',
            probe_negative: 'GND Pin',
            expected_nominal: '4.75V - 5.25V DC',
            instructions: 'Measure VIN directly on the DevKit header. If VIN drops below 4.5V, the onboard LDO cannot maintain 3.3V output.'
          }
        }
      ]
    }
  },
  {
    id: 'demo-arduino-i2c-oled',
    name: 'Arduino Uno R3 with Blank SSD1306 I2C OLED (Pull-Up / Address)',
    board: 'Arduino Uno R3',
    description: '0.96 inch I2C OLED display (SSD1306) remains completely blank. I2C scanner sketch hangs or returns "No I2C devices found". Connected to SDA (A4) and SCL (A5).',
    components: ['Arduino Uno R3', 'SSD1306 0.96" OLED (4-pin)', 'Jumper Wires'],
    pinConnections: 'VCC -> 5V, GND -> GND, SCL -> A5, SDA -> A4',
    diagnosis: {
      case: {
        id: 'case-demo-arduino-003',
        status: 'ACTIVE',
        target_board: 'Arduino Uno R3',
        symptom_description: '0.96 inch I2C OLED display (SSD1306) remains completely blank. I2C scanner sketch hangs or returns "No I2C devices found". Connected to SDA (A4) and SCL (A5).',
        image_url: null,
        created_at: new Date().toISOString()
      },
      epistemic_summary: {
        verified_facts_count: 2,
        ai_inferences_count: 2,
        unknown_assumptions_count: 1
      },
      deterministic_checks: [
        {
          check_id: 'chk_arduino_i2c_pins',
          rule: 'Arduino Uno R3 Hardware I2C Pin Assignment Check',
          result: 'VERIFIED_PASS',
          epistemic_status: EPISTEMIC_STATUS.VERIFIED_FACT,
          message: 'ATmega328P hardware I2C TWI bus is mapped to Analog Pin 4 (SDA) and Analog Pin 5 (SCL). Pin assignment is correct.',
          critical: false
        },
        {
          check_id: 'chk_ssd1306_supply_voltage',
          rule: 'SSD1306 VCC Voltage Compatibility Check',
          result: 'WARNING',
          epistemic_status: EPISTEMIC_STATUS.VERIFIED_FACT,
          message: 'Most 4-pin breakout boards have an onboard 662K 3.3V LDO regulator compatible with 5V, but raw SSD1306 bare chips require 3.3V max. Check breakout board silkscreen.',
          critical: false
        }
      ],
      hypotheses: [
        {
          id: 'hyp_01',
          rank: 1,
          title: 'Missing External Pull-Up Resistors on I2C Bus (Bus Floating)',
          category: 'BUS_TERMINATION',
          epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
          confidence_score: 0.82,
          confidence_label: '82% (High Probabilistic Inference)',
          explanation: 'The I2C bus is open-drain and strictly requires pull-up resistors to VCC (typically 4.7kΩ on 100kHz standard mode). If the OLED breakout lacks onboard pull-ups, the internal AVR pull-ups (20kΩ - 50kΩ) are too weak to pull SCL/SDA HIGH against bus capacitance.',
          suggested_test: {
            test_id: 'test_i2c_pullup_voltage',
            title: 'Measure Idle Bus Voltage on SDA and SCL',
            tool: 'Digital Multimeter (DC Volts, 20V range)',
            probe_positive: 'A4 (SDA)',
            probe_negative: 'GND',
            expected_nominal: '4.8V - 5.0V idle high when bus is not transmitting',
            instructions: 'Measure DC voltage on SDA (A4) and SCL (A5) while the sketch runs. If either reads close to 0V or floats under 2V, install 4.7kΩ resistors from SDA to 5V and SCL to 5V.'
          }
        },
        {
          id: 'hyp_02',
          rank: 2,
          title: 'I2C 7-Bit Address Configuration Mismatch (0x3C vs 0x3D)',
          category: 'ADDRESS_CONFIGURATION',
          epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
          confidence_score: 0.68,
          confidence_label: '68% (Moderate Inference)',
          explanation: 'SSD1306 modules can be hardwired via a surface solder jumper to either 0x3C or 0x3D. If code initializes `display.begin(SSD1306_SWITCHCAPVCC, 0x3D)` but board is 0x3C, ACK will fail.',
          suggested_test: {
            test_id: 'test_pcb_address_resistor',
            title: 'Inspect PCB Rear Solder Jumper',
            tool: 'Visual Inspection / Multimeter Resistance',
            probe_positive: 'PCB Address Pad',
            probe_negative: 'GND',
            expected_nominal: '0Ω to GND indicates 0x3C; 0Ω to VCC indicates 0x3D',
            instructions: 'Flip the OLED module and inspect the 0-ohm jumper position labeled "0x78/0x7A" or "0x3C/0x3D".'
          }
        }
      ]
    }
  }
];
