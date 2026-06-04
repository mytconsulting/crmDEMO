/**
 * Utilidad centralizada para normalizar teléfonos.
 *
 * Formato estándar: E.164 sin "+" → solo dígitos con prefijo de país.
 * Ejemplo: "34674858008" (España), "33612345678" (Francia), "376123456" (Andorra)
 *
 * Evolution API y WhatsApp JID usan este mismo formato.
 */

/**
 * Normaliza un teléfono a formato E.164 (solo dígitos, con prefijo de país).
 * - Quita espacios, guiones, paréntesis, "+"
 * - Si es un número de 9 dígitos sin prefijo, asume España (34)
 * - Si ya tiene prefijo, lo deja tal cual
 */
export function normalizePhone(raw: string): string {
  // Quitar todo lo que no sea dígito
  const digits = raw.replace(/\D/g, '')

  // Si 9 dígitos y empieza por 6 o 7 → móvil español sin prefijo
  if (digits.length === 9 && (digits.startsWith('6') || digits.startsWith('7'))) {
    return '34' + digits
  }

  return digits
}

/**
 * Mapa de prefijos internacionales → bandera + nombre de país.
 * Ordenados de más largo a más corto para matching correcto (376 antes que 3).
 */
export const COUNTRY_PREFIXES: { code: string; flag: string; name: string }[] = [
  { code: '376', flag: '🇦🇩', name: 'Andorra' },
  { code: '351', flag: '🇵🇹', name: 'Portugal' },
  { code: '352', flag: '🇱🇺', name: 'Luxemburgo' },
  { code: '377', flag: '🇲🇨', name: 'Mónaco' },
  { code: '350', flag: '🇬🇮', name: 'Gibraltar' },
  { code: '34', flag: '🇪🇸', name: 'España' },
  { code: '33', flag: '🇫🇷', name: 'Francia' },
  { code: '39', flag: '🇮🇹', name: 'Italia' },
  { code: '44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '49', flag: '🇩🇪', name: 'Alemania' },
  { code: '41', flag: '🇨🇭', name: 'Suiza' },
  { code: '31', flag: '🇳🇱', name: 'Países Bajos' },
  { code: '32', flag: '🇧🇪', name: 'Bélgica' },
  { code: '43', flag: '🇦🇹', name: 'Austria' },
  { code: '45', flag: '🇩🇰', name: 'Dinamarca' },
  { code: '46', flag: '🇸🇪', name: 'Suecia' },
  { code: '47', flag: '🇳🇴', name: 'Noruega' },
  { code: '48', flag: '🇵🇱', name: 'Polonia' },
  { code: '30', flag: '🇬🇷', name: 'Grecia' },
  { code: '55', flag: '🇧🇷', name: 'Brasil' },
  { code: '52', flag: '🇲🇽', name: 'México' },
  { code: '54', flag: '🇦🇷', name: 'Argentina' },
  { code: '56', flag: '🇨🇱', name: 'Chile' },
  { code: '57', flag: '🇨🇴', name: 'Colombia' },
  { code: '51', flag: '🇵🇪', name: 'Perú' },
  { code: '58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '1', flag: '🇺🇸', name: 'EE.UU./Canadá' },
]

export interface ParsedPhone {
  prefix: string
  national: string
  flag: string
  country: string
  full: string
}

/**
 * Parsea un teléfono E.164 en prefijo + número nacional + bandera.
 * Ej: "34674858008" → { prefix: "34", national: "674858008", flag: "🇪🇸", country: "España" }
 */
export function parsePhone(phone: string): ParsedPhone {
  const digits = phone.replace(/\D/g, '')

  for (const { code, flag, name } of COUNTRY_PREFIXES) {
    if (digits.startsWith(code)) {
      return {
        prefix: code,
        national: digits.substring(code.length),
        flag,
        country: name,
        full: digits,
      }
    }
  }

  return { prefix: '', national: digits, flag: '🌐', country: 'Desconocido', full: digits }
}

/**
 * Extrae el teléfono de un WhatsApp JID.
 * "34674858008@s.whatsapp.net" → "34674858008"
 * "8993745420304@lid" con alt "34674858008@s.whatsapp.net" → "34674858008"
 */
export function phoneFromJid(remoteJid: string, remoteJidAlt?: string): string {
  const jid = remoteJidAlt || remoteJid
  return jid.replace('@s.whatsapp.net', '').replace('@lid', '')
}
