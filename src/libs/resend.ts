import { Resend } from 'resend'
import type { PlansId } from '../types/plans'

const resend = new Resend(import.meta.env.RESEND_API_KEY)
const MY_MAIL = import.meta.env.MY_MAIL

export function sendMail(data: { email: string; code: string; plan_id: PlansId }) {
  return resend.emails.send({
    from: MY_MAIL,
    to: data.email,
    subject: 'Tu código de activación – Essenz',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmá tu cuenta – Essenz</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500&display=swap');
    
    body, table, td, a { text-decoration: none !important; }
    table { border-collapse: collapse; }
    
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .footer-left, .footer-right { 
        display: block !important; 
        width: 100% !important; 
        text-align: left !important; 
        padding: 10px 0 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ede6db; font-family: 'Inter', Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ede6db">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <table class="container" width="580" border="0" cellspacing="0" cellpadding="0" bgcolor="#faf7f2" style="border-radius: 4px; overflow: hidden; border: 1px solid rgba(44, 30, 22, 0.1); box-shadow: 0 8px 40px rgba(44, 30, 22, 0.1);">
          
          <tr>
            <td bgcolor="#faf7f2" align="center" style="padding: 25px 48px; border-bottom: 1px solid rgba(44, 30, 22, 0.05);">
              <img src="https://nvyrimqgpncwryvlhhic.supabase.co/storage/v1/object/public/logos-url/essenz_email.png" alt="Resend" height="80" width="auto" style="display: block; border: 0;" />
            </td>
          </tr>

          <tr>
            <td bgcolor="#2e4f3f" align="center" style="padding: 40px 48px;">
              <p style="color: #b08d57; font-size: 10px; text-transform: uppercase; letter-spacing: 0.28em; margin: 0 0 14px;">Bienvenido a Essenz</p>
              <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 30px; font-style: italic; color: #f5efe6; margin: 0; font-weight: 400; line-height: 1.3;">Tu experiencia premium<br>comienza aquí</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 48px 48px 40px;">
              <p style="font-size: 15px; line-height: 1.75; color: rgba(44, 30, 22, 0.72); margin: 0 0 18px;">
                Nos alegra tenerte. Estás a un paso de activar tu suscripción y acceder a todo lo que Essenz tiene preparado para vos.
              </p>
              <p style="font-size: 15px; line-height: 1.75; color: rgba(44, 30, 22, 0.72); margin: 0 0 18px;">
                Copiá e ingresá el siguiente código de confirmación en la pantalla de verificación para validar tu identidad — <strong style="color: #1a120b; font-weight: 500;">el proceso toma menos de un minuto</strong>.
              </p>

              <div style="text-align: center; color: #b08d57; font-size: 18px; margin: 24px 0; letter-spacing: 0.4em;">· · ·</div>

              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="background-color: #f5efe6; border: 1px solid rgba(44, 30, 22, 0.08); padding: 20px; display: inline-block; border-radius: 4px;">
                      <span style="font-family: 'Inter', monospace; font-size: 36px; font-weight: bold; letter-spacing: 0.15em; color: #1a120b;">${data.code}</span>
                    </div>
                    <p style="font-size: 12px; color: rgba(44, 30, 22, 0.4); margin-top: 16px;">El código expira en 15 minutes</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="#f5efe6" style="padding: 36px 48px; border-top: 1px solid rgba(44, 30, 22, 0.08);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td class="footer-left" valign="top" style="padding-bottom: 20px;">
                    <p style="font-family: 'Playfair Display', serif; font-size: 15px; font-weight: bold; color: #1a120b; margin: 0 0 4px;">Essenz</p>
                    <p style="font-size: 12px; color: rgba(44, 30, 22, 0.5); line-height: 1.5; margin: 0; max-width: 220px;">Gestión inteligente para cafeterías modernas. Excelencia en cada detalle.</p>
                  </td>
                  <td class="footer-right" valign="top" align="right" style="padding-bottom: 20px;">
                    <a href="https://essenz.bytesyncs.com" style="color: #8b5a2b; font-size: 12px; display: block; margin-bottom: 8px; font-weight: 500;">essenz.bytesyncs.com</a>
                    <a href="https://essenz.bytesyncs.com/terms" style="color: rgba(44, 30, 22, 0.4); font-size: 11px; display: block; margin-bottom: 5px;">Términos de uso</a>
                    <a href="https://essenz.bytesyncs.com/privacy" style="color: rgba(44, 30, 22, 0.4); font-size: 11px; display: block;">Privacidad</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top: 1px solid rgba(44, 30, 22, 0.1); padding-top: 20px;">
                    <p style="font-size: 11px; color: rgba(44, 30, 22, 0.35); text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">© 2026 ByteSyncs</p>
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
}
