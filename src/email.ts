import * as nodemailer from 'nodemailer';

export type EventoEmail = 'inicio' | 'exito' | 'error' | 'alerta_conteo';

const ASUNTOS: Record<EventoEmail, string> = {
  inicio:        '🔄 UnionSalud SAM — Proceso iniciado',
  exito:         '✅ UnionSalud SAM — Proceso completado',
  error:         '❌ UnionSalud SAM — Error en el proceso',
  alerta_conteo: '⚠️ UnionSalud SAM — Alerta de conteo',
};

function crearTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function enviarEmail(
  evento:  EventoEmail,
  mensaje: string,
  detalles?: Record<string, any>,
): Promise<void> {
  const destinos = process.env.EMAIL_DESTINOS;
  if (!destinos || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const detallesHtml = detalles
    ? `<pre style="background:#f4f4f4;padding:12px;border-radius:4px">${JSON.stringify(detalles, null, 2)}</pre>`
    : '';

  try {
    await crearTransporter().sendMail({
      from:    `"UnionSalud SAM" <${process.env.EMAIL_USER}>`,
      to:      destinos,
      subject: ASUNTOS[evento],
      html: `
        <h2>${ASUNTOS[evento]}</h2>
        <p><strong>Mensaje:</strong> ${mensaje}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
        ${detallesHtml}
      `,
    });
  } catch (err: any) {
    console.warn('[email] No se pudo enviar notificación:', err.message);
  }
}
