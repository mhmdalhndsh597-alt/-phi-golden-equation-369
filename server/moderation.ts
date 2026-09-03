const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const DANGEROUS_SCHEMES = /(?:javascript|data|vbscript):/i;

export function moderateText(value: string, maxLength: number, label: string) {
  const text = value.trim();
  if (!text || text.length > maxLength) throw new Error(`${label} must be between 1 and ${maxLength} characters`);
  if (CONTROL_CHARS.test(text) || DANGEROUS_SCHEMES.test(text)) throw new Error(`${label} contains unsupported content`);
  return text;
}
