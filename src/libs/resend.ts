import { Resend } from 'resend'
import type { PlansId } from '../types/plans'

const resend = new Resend(import.meta.env.RESEND_API_KEY)
const MY_MAIL = import.meta.env.MY_MAIL

export async function sendMail(data: { email: string; code: string; plan_id: PlansId }) {
  const { data: result, error } = await resend.emails.send({
    from: MY_MAIL,
    to: data.email,
    subject: 'Tu código de activación – Essenz',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Verificá tu correo | Essenz</title>
</head>
<body style="margin:0; padding:0; background-color:#ede8df; font-family:Arial, Helvetica, sans-serif; color:#2c3029;">

  <!-- Preencabezado para la vista previa del correo -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
    Tu código de verificación de Essenz. Confirmá tu correo para continuar con la configuración de tu cuenta.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#ede8df;">
    <tr>
      <td align="center" style="padding:32px 14px;">

        <table role="presentation" class="container" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:560px; background-color:#faf8f3; border:1px solid #e5dfd4;">

          <!-- Marca -->
          <tr>
            <td align="center" style="padding:26px 24px; border-bottom:1px solid #eae5dc;">
              <img
                src="https://nvyrimqgpncwryvlhhic.supabase.co/storage/v1/object/public/logos-url/essenz_email.png"
                alt="Essenz"
                width="140"
                style="display:block; width:140px; max-width:100%; height:auto; border:0;"
              >
            </td>
          </tr>

          <!-- Encabezado -->
          <tr>
            <td align="center" bgcolor="#2e4f3f" style="padding:38px 24px 34px; background-color:#2e4f3f;">
              <p style="margin:0 0 12px; color:#d6bd91; font-size:11px; line-height:1.5; letter-spacing:2.5px; text-transform:uppercase;">
                Un nuevo comienzo
              </p>
              <h1 style="margin:0; color:#faf8f3; font-family:Georgia, 'Times New Roman', serif; font-size:30px; line-height:1.25; font-weight:normal;">
                Tu espacio empieza aquí.
              </h1>
              <p style="margin:14px 0 0; color:#e2e8e1; font-size:14px; line-height:1.7;">
                Confirmemos tu correo para continuar.
              </p>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding:34px 28px 38px;">

              <p style="margin:0 0 16px; color:#34382f; font-size:15px; line-height:1.8;">
                ¡Gracias por elegir Essenz!
              </p>

              <p style="margin:0 0 22px; color:#62665d; font-size:14px; line-height:1.8;">
                Para verificar tu dirección de correo y continuar con la configuración de tu cuenta, ingresá el siguiente código en la pantalla de verificación.
              </p>

              <!-- Código -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding:4px 0 10px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#f0ede4" style="padding:18px 24px; border:1px solid #e1dbce; background-color:#f0ede4;">
                          <span style="font-family:Arial, Helvetica, sans-serif; color:#243d30; font-size:32px; line-height:1.4; font-weight:bold; letter-spacing:7px; white-space:nowrap;">
                            ${data.code}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:10px 0 26px; color:#77796f; font-size:12px; line-height:1.7; text-align:center;">
                Este código vence en <strong style="color:#454a40;">15 minutos</strong>.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-top:1px solid #e8e2d7; padding-top:22px;">
                    <p style="margin:0 0 8px; color:#62665d; font-size:13px; line-height:1.7;">
                      <strong style="color:#34382f;">¿No podés verificarlo?</strong>
                    </p>
                    <p style="margin:0; color:#77796f; font-size:13px; line-height:1.8;">
                      Volvé a la pantalla de verificación e ingresá el código manualmente. Si venció, solicitá uno nuevo desde la aplicación.
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-top:22px;">
                    <p style="margin:0; color:#77796f; font-size:12px; line-height:1.8;">
                      Si no creaste una cuenta en Essenz, podés ignorar este mensaje. No compartas este código con nadie.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td bgcolor="#f1ede4" style="padding:24px 28px; background-color:#f1ede4; border-top:1px solid #e5dfd4;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom:18px;">
                    <p style="margin:0 0 6px; color:#2e4f3f; font-family:Georgia, 'Times New Roman', serif; font-size:18px; line-height:1.4;">
                      Essenz
                    </p>
                    <p style="margin:0; color:#77796f; font-size:12px; line-height:1.7;">
                      Más claridad para gestionar tu negocio.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #ded8cc; padding-top:16px;">
                    <p style="margin:0 0 10px; font-size:12px; line-height:1.8;">
                      <a href="https://essenz.bytesyncs.com" style="color:#2e4f3f; text-decoration:underline;">
                        essenz.bytesyncs.com
                      </a>
                      <span style="color:#b4ad9f;">&nbsp; · &nbsp;</span>
                      <a href="https://essenz.bytesyncs.com/terms" style="color:#77796f; text-decoration:underline;">
                        Términos
                      </a>
                      <span style="color:#b4ad9f;">&nbsp; · &nbsp;</span>
                      <a href="https://essenz.bytesyncs.com/privacy" style="color:#77796f; text-decoration:underline;">
                        Privacidad
                      </a>
                    </p>
                    <p style="margin:0; color:#969084; font-size:10px; line-height:1.7; letter-spacing:1px;">
                      © 2026 ESSENZ · BYTE SYNCS
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`,
  })

  if (error) {
    console.error('[RESEND] Error enviando email:', error)
    throw new Error(`Resend error: ${error.message}`)
  }

  if (!result?.id) {
    console.error('[RESEND] Respuesta inesperada:', { result, error })
    throw new Error('Resend no devolvió un ID de email')
  }

  return result
}
