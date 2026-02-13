
import { TypingResult } from "../types";

const MAGIC_HEADER = "ZTP!"; // 5A 54 50 21
const VERSION = 0x01;

export interface ZippyStats {
  level: number;
  topWPM: number;
  accuracy: number;
  totalKeystrokes: number;
  problemKeys: string[];
}

/**
 * Calculates a simple XOR checksum for an Uint8Array
 */
const calculateChecksum = (data: Uint8Array): number => {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum ^= data[i];
  }
  return checksum & 0xFF;
};

/**
 * Exports stats to a .ztx binary file
 */
export const saveZippyData = (stats: ZippyStats): Blob => {
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(MAGIC_HEADER);
  const problemKeysJoined = stats.problemKeys.join('');
  const problemKeysBytes = encoder.encode(problemKeysJoined);

  // Size calculation:
  // Header (4) + Version (1) + Level (1) + topWPM (4) + Acc (4) + Keystrokes (4) 
  // + ProblemKeysCount (1) + ProblemKeys (N) + Checksum (1)
  const bufferSize = 4 + 1 + 1 + 4 + 4 + 4 + 1 + problemKeysBytes.length + 1;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  let offset = 0;

  // 1. Magic Header
  for (let i = 0; i < headerBytes.length; i++) {
    view.setUint8(offset++, headerBytes[i]);
  }

  // 2. Version
  view.setUint8(offset++, VERSION);

  // 3. Level (Uint8)
  view.setUint8(offset++, stats.level);

  // 4. topWPM (Float32)
  view.setFloat32(offset, stats.topWPM);
  offset += 4;

  // 5. Accuracy (Float32)
  view.setFloat32(offset, stats.accuracy);
  offset += 4;

  // 6. Total Keystrokes (Uint32)
  view.setUint32(offset, stats.totalKeystrokes);
  offset += 4;

  // 7. Problem Keys Count & Data
  view.setUint8(offset++, problemKeysBytes.length);
  for (let i = 0; i < problemKeysBytes.length; i++) {
    view.setUint8(offset++, problemKeysBytes[i]);
  }

  // 8. Checksum (XOR sum of all preceding bytes)
  const dataForChecksum = uint8View.slice(0, offset);
  const checksum = calculateChecksum(dataForChecksum);
  view.setUint8(offset, checksum);

  return new Blob([buffer], { type: 'application/octet-stream' });
};

/**
 * Parses a .ztx binary file
 */
export const loadZippyData = async (file: File): Promise<ZippyStats> => {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  if (buffer.byteLength < 20) {
    throw new Error("Invalid file size: Protocol corrupted.");
  }

  let offset = 0;

  // 1. Validate Magic Header
  const decoder = new TextDecoder();
  const header = decoder.decode(buffer.slice(0, 4));
  if (header !== MAGIC_HEADER) {
    throw new Error("Header Mismatch: Not a valid .ztx file.");
  }
  offset += 4;

  // 2. Validate Version
  const version = view.getUint8(offset++);
  if (version !== VERSION) {
    throw new Error(`Version Mismatch: Protocol ${version} not supported.`);
  }

  // 3. Validate Checksum
  const fileChecksum = view.getUint8(buffer.byteLength - 1);
  const calculatedChecksum = calculateChecksum(uint8View.slice(0, buffer.byteLength - 1));
  if (fileChecksum !== calculatedChecksum) {
    throw new Error("Integrity Failure: Checksum mismatch.");
  }

  // 4. Parse Data
  const level = view.getUint8(offset++);
  const topWPM = view.getFloat32(offset);
  offset += 4;
  const accuracy = view.getFloat32(offset);
  offset += 4;
  const totalKeystrokes = view.getUint32(offset);
  offset += 4;

  const pkCount = view.getUint8(offset++);
  const pkString = decoder.decode(buffer.slice(offset, offset + pkCount));
  const problemKeys = pkString.split('');

  return {
    level,
    topWPM,
    accuracy,
    totalKeystrokes,
    problemKeys: problemKeys.filter(k => k.length > 0)
  };
};
