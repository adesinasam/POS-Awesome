/**
 * Keyboard scanner detection and validation utilities.
 */

/**
 * Gets a high-precision timestamp for scan timing.
 */
export const getScanTimestamp = (): number => {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
};

/**
 * Sanitizes text from clipboard by removing whitespace.
 */
export const sanitizeClipboardText = (text: any): string => {
    return String(text || "")
        .replace(/\s+/g, "")
        .trim();
};

/**
 * Checks if a value is a numeric string.
 */
export const isNumericString = (value: string): boolean => /^\d+$/.test(value);

/**
 * Checks if a value is a valid scan candidate.
 */
export const isScanCandidate = (value: string, minLength: number): boolean => {
    return isNumericString(value) && value.length >= minLength;
};

/**
 * Determines if the scan buffer should be reset based on input.
 */
export const shouldResetScanOnInput = (value: string, buffer: string): boolean => {
    if (!value) {
        return true;
    }
    if (!isNumericString(value)) {
        return true;
    }
    return Boolean(buffer && value.length < buffer.length);
};

/**
 * Interface for keyboard scan validation parameters.
 */
export interface ScanValidationParams {
    code: string;
    duration: number;
    minLength: number;
    maxDuration?: number;
    maxInterval: number;
}

/**
 * Determines if a code is likely from a keyboard scanner based on timing.
 */
export const isLikelyKeyboardScan = ({
    code,
    duration,
    minLength,
    maxDuration,
    maxInterval,
}: ScanValidationParams): boolean => {
    if (!code || !isNumericString(code)) {
        return false;
    }

    if (code.length < minLength) {
        return false;
    }

    if (!duration || duration <= 0) {
        return true;
    }

    if (maxDuration && typeof maxDuration === "number" && duration > maxDuration) {
        return false;
    }

    const averageInterval = duration / code.length;
    return averageInterval <= maxInterval;
};

/**
 * Checks if the search field is ready to accept a scan.
 */
export const isSearchFieldPrimedForScan = (value: string): boolean => {
    if (!value) {
        return true;
    }
    return /^\d*$/.test(value);
};
