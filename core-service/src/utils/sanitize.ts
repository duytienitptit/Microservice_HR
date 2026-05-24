/**
 * Recursively escapes HTML special characters to prevent XSS attacks in stored inputs.
 * Note: Forward slash (/) is intentionally NOT escaped as it is not an HTML special character
 * and escaping it corrupts legitimate data (e.g., "IT/Network" → "IT&#x2F;Network").
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key of Object.keys(input)) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};
