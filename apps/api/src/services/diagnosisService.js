/**
 * CircuitSage AI — Diagnostic Orchestration Service
 *
 * Coordinates deterministic electrical checks, hypothesis synthesis,
 * epistemic classification, and multimeter measurement evaluation.
 */

const rulesEngine = require('./rulesEngine');
const { EPISTEMIC_STATUS } = require('@circuitsage/shared');

class DiagnosisService {
  /**
   * Generates initial diagnostic state with deterministic checks and ranked hypotheses
   */
  synthesizeDiagnosis({ target_board, symptom_description, connected_components = [], pin_connections = '' }) {
    // 1. Evaluate deterministic engineering formulas
    const deterministicChecks = rulesEngine.evaluate({
      target_board,
      symptom_description,
      connected_components,
      pin_connections
    });

    const symptomLower = (symptom_description || '').toLowerCase();
    const hypotheses = [];

    // Synthesize grounded hypotheses matching hardware physics
    if (symptomLower.includes('led')) {
      hypotheses.push({
        id: 'hyp_led_polarity',
        rank: 1,
        title: 'Reverse Polarity on LED (Anode / Cathode Inverted)',
        category: 'WIRING_POLARITY',
        epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
        confidence_score: 0.75,
        explanation: 'LEDs are directional semiconductor diodes. If the cathode (shorter lead / flat rim) is connected to the GPIO and the anode to GND, the diode is reverse-biased under logic HIGH and blocks all current.',
        suggested_test: {
          test_id: 'test_gpio_voltage',
          tool: 'Digital Multimeter (DC Volts, 20V Range)',
          probe_positive: 'Microcontroller GPIO Pin',
          probe_negative: 'Common GND Rail',
          expected_nominal: target_board.includes('Arduino') ? '~5.0V DC when HIGH' : '~3.3V DC when HIGH',
          instructions: 'Touch RED probe to GPIO output and BLACK probe to common GND to confirm pin is actively pulsing HIGH.'
        }
      });

      hypotheses.push({
        id: 'hyp_led_current_starvation',
        rank: 2,
        title: 'Forward Voltage Headroom Starvation',
        category: 'VOLTAGE_LEVEL',
        epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
        confidence_score: 0.60,
        explanation: 'Blue, white, or violet LEDs require forward voltage Vf of 3.0V - 3.4V. From a 3.3V rail with a large resistor (> 220Ω), forward current may be under 0.5mA, causing zero visible light output.',
        suggested_test: {
          test_id: 'test_led_drop',
          tool: 'Digital Multimeter (DC Volts, 20V Range)',
          probe_positive: 'LED Anode (+)',
          probe_negative: 'LED Cathode (-)',
          expected_nominal: '2.8V - 3.2V across LED',
          instructions: 'Measure the potential difference directly across the two LED leads while GPIO is driven HIGH.'
        }
      });

      hypotheses.push({
        id: 'hyp_firmware_pin_drive',
        rank: 3,
        title: 'Firmware Pin Configuration Failure (Input Floating or Wrong GPIO)',
        category: 'FIRMWARE_PIN',
        epistemic_status: EPISTEMIC_STATUS.UNKNOWN,
        confidence_score: 0.35,
        explanation: 'The target pin may be configured as INPUT (high impedance) rather than OUTPUT, or the physical silkscreen pin label may differ from the internal GPIO number.',
        suggested_test: {
          test_id: 'test_pin_toggle',
          tool: 'Digital Multimeter (DC Volts, 20V Range)',
          probe_positive: 'Physical Board Pin',
          probe_negative: 'GND',
          expected_nominal: target_board.includes('Arduino') ? '5.0V continuous' : '3.3V continuous',
          instructions: 'Set pin permanently HIGH in setup() and measure DC voltage directly at the header pin.'
        }
      });
    } else if (symptomLower.includes('brownout') || symptomLower.includes('reset') || symptomLower.includes('wifi')) {
      hypotheses.push({
        id: 'hyp_power_rail_sag',
        rank: 1,
        title: '3.3V Power Rail Sag During RF Calibration',
        category: 'POWER_INTEGRITY',
        epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
        confidence_score: 0.88,
        explanation: 'The 2.4GHz radio synthesizes RF calibration packets upon initialization, drawing sudden 450mA peak currents. Long thin USB cables or missing bulk decoupling capacitors drop the 3.3V rail below 2.8V, tripping the internal brownout detector.',
        suggested_test: {
          test_id: 'test_3v3_rail',
          tool: 'Digital Multimeter (Min/Max Mode or DC 20V)',
          probe_positive: '3V3 Rail Pin',
          probe_negative: 'GND Pin',
          expected_nominal: 'Must remain >= 3.0V at all times',
          instructions: 'Measure 3V3 pin potential during boot. If reading drops below 2.8V, solder a 100µF capacitor between 3V3 and GND.'
        }
      });
    } else if (symptomLower.includes('oled') || symptomLower.includes('i2c') || symptomLower.includes('ssd1306')) {
      hypotheses.push({
        id: 'hyp_i2c_missing_pullup',
        rank: 1,
        title: 'Missing External Pull-Up Resistors on I2C Lines',
        category: 'BUS_TERMINATION',
        epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
        confidence_score: 0.85,
        explanation: 'I2C SDA and SCL lines are open-drain and strictly require pull-up resistors (4.7kΩ) to VCC. Without pull-ups, lines float near 0V and acknowledge (ACK) bits fail.',
        suggested_test: {
          test_id: 'test_i2c_bus_voltage',
          tool: 'Digital Multimeter (DC Volts, 20V Range)',
          probe_positive: 'SDA / SCL Pin',
          probe_negative: 'GND',
          expected_nominal: target_board.includes('Arduino') ? '4.8V - 5.0V idle high' : '3.1V - 3.3V idle high',
          instructions: 'Measure DC voltage on SDA and SCL while bus is idle. If reading is < 2.0V, install 4.7kΩ pull-up resistors.'
        }
      });
    } else {
      // General Circuit Fault
      hypotheses.push({
        id: 'hyp_open_circuit_gnd',
        rank: 1,
        title: 'Incomplete Ground Return Path (Common GND Open)',
        category: 'WIRING_CONTINUITY',
        epistemic_status: EPISTEMIC_STATUS.AI_INFERENCE,
        confidence_score: 0.70,
        explanation: 'Circuits powered from multiple rails or USB sources require a common shared ground return path to reference voltages.',
        suggested_test: {
          test_id: 'test_gnd_continuity',
          tool: 'Digital Multimeter (Continuity / Diode Beep Mode)',
          probe_positive: 'Component GND Pin',
          probe_negative: 'Board GND Pin',
          expected_nominal: '0.00 ohms (continuous beep)',
          instructions: 'De-energize the circuit. Touch probes between component ground pin and microcontroller ground header.'
        }
      });
    }

    // Epistemic summary
    let verifiedCount = 0;
    let aiInferenceCount = 0;
    let unknownCount = 0;

    for (const chk of deterministicChecks) {
      if (chk.epistemic_status === EPISTEMIC_STATUS.VERIFIED_FACT) verifiedCount++;
      else if (chk.epistemic_status === EPISTEMIC_STATUS.AI_INFERENCE) aiInferenceCount++;
      else unknownCount++;
    }

    for (const hyp of hypotheses) {
      if (hyp.epistemic_status === EPISTEMIC_STATUS.VERIFIED_FACT) verifiedCount++;
      else if (hyp.epistemic_status === EPISTEMIC_STATUS.AI_INFERENCE) aiInferenceCount++;
      else unknownCount++;
    }

    return {
      epistemic_summary: {
        verified_facts_count: verifiedCount,
        ai_inferences_count: aiInferenceCount,
        unknown_assumptions_count: unknownCount
      },
      deterministic_checks: deterministicChecks,
      hypotheses
    };
  }

  /**
   * Re-evaluates active hypotheses following a physical multimeter measurement
   */
  evaluateMeasurement({ measurement, currentHypotheses = [], target_board = 'ESP32 DevKit v1' }) {
    const numericVal = parseFloat(measurement.numeric_value);
    const unit = measurement.unit;
    const isVoltage = measurement.measurement_type === 'VOLTAGE_DC';
    const isEsp32OrPico = target_board.includes('ESP32') || target_board.includes('Pico');

    let status = 'VERIFIED_PASS';
    let message = `Measurement of ${numericVal} ${unit} logged and grounded in circuit state.`;
    const eliminatedHypotheses = [];
    const updatedHypotheses = currentHypotheses.map((h) => ({ ...h }));

    if (isVoltage) {
      const minLogicHigh = isEsp32OrPico ? 2.8 : 4.2;
      const maxLogicHigh = isEsp32OrPico ? 3.6 : 5.5;

      if (numericVal >= minLogicHigh && numericVal <= maxLogicHigh) {
        status = 'VERIFIED_PASS';
        message = `Measured ${numericVal}V is within nominal logic HIGH threshold (${minLogicHigh}V - ${maxLogicHigh}V). Firmware pin driving is confirmed.`;

        // Eliminate firmware pin failure hypothesis
        const fwIdx = updatedHypotheses.findIndex((h) => h.category === 'FIRMWARE_PIN');
        if (fwIdx >= 0) {
          eliminatedHypotheses.push({
            id: updatedHypotheses[fwIdx].id,
            title: updatedHypotheses[fwIdx].title,
            elimination_reason: `Measured ${numericVal}V confirms pin is actively driven HIGH by microcontroller firmware.`
          });
          updatedHypotheses.splice(fwIdx, 1);
        }

        // Promote remaining polarity hypothesis to Verified Fact
        if (updatedHypotheses.length > 0) {
          updatedHypotheses[0].epistemic_status = EPISTEMIC_STATUS.VERIFIED_FACT;
          updatedHypotheses[0].confidence_score = 0.95;
        }
      } else if (numericVal < 0.5) {
        status = 'WARNING';
        message = `Measured ${numericVal}V is near 0V. Pin is NOT being driven HIGH, is misconfigured as INPUT, or is shorted to GND.`;
      }
    }

    return {
      deterministic_evaluation: {
        rule: 'Physical Multimeter Probing Evaluation',
        status,
        message
      },
      eliminated_hypotheses: eliminatedHypotheses,
      updated_hypotheses: updatedHypotheses
    };
  }
}

module.exports = new DiagnosisService();
