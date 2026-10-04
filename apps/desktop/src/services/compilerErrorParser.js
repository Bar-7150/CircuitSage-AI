/**
 * CircuitSage AI — Compiler Error & Diagnostic Parser
 *
 * Parses raw compiler stdout/stderr streams from Arduino CLI / GCC / Clang
 * into structured Problems entries with file path, line, column, severity,
 * diagnostic message, and memory utilization statistics.
 */

const path = require('path');

// GCC / Clang diagnostic format:
// filepath:line:col: severity: message
// or filepath:line: severity: message
// Supports Windows drive letters (C:\...) and POSIX paths (/...)
const GCC_DIAGNOSTIC_REGEX = /^(?<filePath>(?:[a-zA-Z]:)?[^:\r\n]+):(?<line>\d+)(?::(?<column>\d+))?:\s*(?<severity>fatal error|error|warning|note):\s*(?<message>[^\r\n]+)/;

// Memory usage regex for Arduino CLI
// Program: "Sketch uses 267488 bytes (8%) of program storage space. Maximum is 3145728 bytes."
const PROGRAM_STORAGE_REGEX = /Sketch uses (\d+) bytes \(([\d.]+)%\) of program storage space\. Maximum is (\d+) bytes\./;
// Dynamic RAM: "Global variables use 22172 bytes (6%) of dynamic memory, leaving 305508 bytes for local variables. Maximum is 327680 bytes."
const DYNAMIC_MEMORY_REGEX = /Global variables use (\d+) bytes \(([\d.]+)%\) of dynamic memory, leaving (\d+) bytes for local variables\. Maximum is (\d+) bytes\./;

/**
 * Parses raw stderr and stdout text into structured problem items.
 *
 * @param {string} stderrText - Raw standard error output
 * @param {string} stdoutText - Raw standard output
 * @returns {Array<{ file: string, line: number, column: number, severity: 'error' | 'warning' | 'info', message: string, raw: string }>}
 */
function parseCompilerProblems(stderrText = '', stdoutText = '') {
  const problems = [];
  const combined = `${stderrText}\n${stdoutText}`;
  const lines = combined.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(GCC_DIAGNOSTIC_REGEX);
    if (match && match.groups) {
      const rawSeverity = match.groups.severity.toLowerCase();
      let severity = 'error';
      if (rawSeverity === 'warning') severity = 'warning';
      else if (rawSeverity === 'note') severity = 'info';

      problems.push({
        file: path.normalize(match.groups.filePath.trim()),
        line: parseInt(match.groups.line, 10),
        column: match.groups.column ? parseInt(match.groups.column, 10) : 0,
        severity,
        message: match.groups.message.trim(),
        raw: trimmed
      });
    }
  }

  return problems;
}

/**
 * Parses memory usage metrics from compiler stdout.
 *
 * @param {string} stdoutText
 * @returns {{ programStorage: { usedBytes: number, percentage: number, maxBytes: number } | null, dynamicMemory: { usedBytes: number, percentage: number, maxBytes: number, freeBytes: number } | null }}
 */
function parseMemoryUsage(stdoutText = '') {
  const result = {
    programStorage: null,
    dynamicMemory: null
  };

  const progMatch = stdoutText.match(PROGRAM_STORAGE_REGEX);
  if (progMatch) {
    result.programStorage = {
      usedBytes: parseInt(progMatch[1], 10),
      percentage: parseFloat(progMatch[2]),
      maxBytes: parseInt(progMatch[3], 10)
    };
  }

  const dynMatch = stdoutText.match(DYNAMIC_MEMORY_REGEX);
  if (dynMatch) {
    result.dynamicMemory = {
      usedBytes: parseInt(dynMatch[1], 10),
      percentage: parseFloat(dynMatch[2]),
      freeBytes: parseInt(dynMatch[3], 10),
      maxBytes: parseInt(dynMatch[4], 10)
    };
  }

  return result;
}

module.exports = {
  parseCompilerProblems,
  parseMemoryUsage,
  GCC_DIAGNOSTIC_REGEX
};
