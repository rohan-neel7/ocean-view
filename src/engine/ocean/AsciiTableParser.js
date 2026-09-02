/**
 * OceanView — Safe Delimited ASCII / CSV Table Ingestion Engine
 * Ingests CSV, TSV, and delimited ASCII ocean data files with explicit column schema validation and missing value protection.
 */

const MISSING_SENTINELS = new Set(['', 'NaN', 'NAN', 'nan', 'null', 'NULL', '-999', '-9999', '-99.9', 'NA', 'N/A', '9999.0']);

/**
 * Parses delimited text into structured scientific records.
 *
 * @param {string} textContent - Raw CSV/TSV/ASCII string
 * @param {object} [options]
 * @param {string} [options.delimiter] - Optional delimiter override (',' | '\t' | ' ')
 * @param {object} [options.columnMap] - Optional mapping of standard names to column headers
 * @returns {{ headers: string[], rows: Array<object>, totalRows: number, validRows: number, droppedRows: number }}
 */
export function parseAsciiOceanTable(textContent, options = {}) {
  if (!textContent || typeof textContent !== 'string') {
    throw new Error('parseAsciiOceanTable requires non-empty string input');
  }

  const lines = textContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

  if (lines.length < 2) {
    throw new Error('ASCII table must have at least a header row and one data row');
  }

  // Detect delimiter
  let delimiter = options.delimiter;
  if (!delimiter) {
    const firstLine = lines[0];
    if (firstLine.includes(',')) delimiter = ',';
    else if (firstLine.includes('\t')) delimiter = '\t';
    else delimiter = /\s+/;
  }

  const rawHeaders = (
    typeof delimiter === 'string' ? lines[0].split(delimiter) : lines[0].split(delimiter)
  ).map((h) => h.trim().toLowerCase());

  const rows = [];
  let droppedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const tokens = typeof delimiter === 'string' ? line.split(delimiter) : line.split(delimiter);

    if (tokens.length !== rawHeaders.length) {
      droppedRows += 1;
      continue; // Skip malformed rows with mismatching token count
    }

    const rowObj = {};
    let isRowValid = true;

    for (let c = 0; c < rawHeaders.length; c++) {
      const header = rawHeaders[c];
      const rawVal = tokens[c].trim();

      if (MISSING_SENTINELS.has(rawVal)) {
        rowObj[header] = null;
      } else {
        const num = Number(rawVal);
        if (Number.isFinite(num)) {
          rowObj[header] = num;
        } else {
          rowObj[header] = rawVal;
        }
      }
    }

    // Coordinate validation if latitude and longitude exist
    const lat = rowObj.lat ?? rowObj.latitude ?? null;
    const lon = rowObj.lon ?? rowObj.longitude ?? null;

    if (lat !== null && (typeof lat !== 'number' || lat < -90 || lat > 90)) {
      isRowValid = false;
    }
    if (lon !== null && (typeof lon !== 'number' || lon < -180 || lon > 180)) {
      isRowValid = false;
    }

    if (isRowValid) {
      rows.push(rowObj);
    } else {
      droppedRows += 1;
    }
  }

  return {
    headers: rawHeaders,
    rows,
    totalRows: lines.length - 1,
    validRows: rows.length,
    droppedRows,
  };
}
