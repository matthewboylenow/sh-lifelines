// Pure phone-number helpers with no external dependencies.
// Kept separate from sms.ts (which imports the Twilio SDK) so that modules
// like auth.ts can normalize numbers without pulling Twilio — and its Node-only
// `fs` dependency — into the client/edge bundle.

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.startsWith('+')) return phone.replace(/\s/g, '')
  return `+${digits}`
}
