export const ACCESS_PASSWORD_MIN = 8
export const ACCESS_PASSWORD_MAX = 72

const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AccessUpdate {
  enabled?: boolean
  password?: string
  staffCanEditSettings?: boolean
}

export type AccessUpdateResult =
  | { success: true; data: AccessUpdate }
  | { success: false; errors: { field: string; message: string }[] }

export function isAccessToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value)
}

export function validateAccessUpdate(input: unknown): AccessUpdateResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { success: false, errors: [{ field: 'body', message: 'Solicitud inválida' }] }
  }

  const body = input as Record<string, unknown>
  const data: AccessUpdate = {}
  const errors: { field: string; message: string }[] = []

  if (body.enabled !== undefined) {
    if (typeof body.enabled === 'boolean') data.enabled = body.enabled
    else errors.push({ field: 'enabled', message: 'Valor inválido' })
  }

  if (body.staffCanEditSettings !== undefined) {
    if (typeof body.staffCanEditSettings === 'boolean') {
      data.staffCanEditSettings = body.staffCanEditSettings
    } else errors.push({ field: 'staffCanEditSettings', message: 'Valor inválido' })
  }

  if (body.password !== undefined) {
    if (
      typeof body.password === 'string' &&
      body.password.length >= ACCESS_PASSWORD_MIN &&
      body.password.length <= ACCESS_PASSWORD_MAX
    ) {
      data.password = body.password
    } else {
      errors.push({
        field: 'password',
        message: `La contraseña debe tener entre ${ACCESS_PASSWORD_MIN} y ${ACCESS_PASSWORD_MAX} caracteres`,
      })
    }
  }

  if (errors.length) return { success: false, errors }

  if (Object.keys(data).length === 0) {
    return { success: false, errors: [{ field: 'body', message: 'No hay cambios para guardar' }] }
  }

  return { success: true, data }
}
