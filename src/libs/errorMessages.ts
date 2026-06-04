export const errorMessages: Record<string, string> = {
  invalid_request_body: 'Cuerpo de solicitud inválido',
  invalid_credentials: 'El correo electrónico o la contraseña son incorrectos', // Corregido el typo y completado

  user_already_exists: 'Este usuario ya está registrado',
  email_exists: 'Este email ya está registrado',
  over_email_send_rate_limit: 'Demasiados intentos, vuelve a intentarlo más tarde',

  authentication_failed: 'No se pudo crear la cuenta',
  user_setup_failed: 'Error al completar la configuración del usuario',

  slug_already_exists: 'Nombre de la cafetería ya está en uso',
  organization_creation_failed: 'No pudimos registrar tu cafetería. Intenta con otro nombre',
  profile_creation_failed: 'Error al crear tu perfil de administrador',

  email_not_confirmed: 'Debe confirmar su correo electrónico antes de continuar',
  code_error: 'El código ingresado es incorrecto o expiró',
  session_not_found:
    'Cuenta verificada, pero no se pudo iniciar sesión de forma automática. Por favor, ingresá desde el login',

  failed_to_generate_otp: 'No se pudo generar el código de verificación',
  unable_to_extract_numeric_otp: 'No se pudo obtener el código de verificación',

  email_send_failed: 'No se pudo enviar el correo de verificación',

  invalid_email: 'Correo electrónico inválido',
  weak_password: 'La contraseña es demasiado débil',

  database_error: 'Ocurrió un error en la base de datos',

  internal_server_error: 'Ocurrió un error inesperado',
}
