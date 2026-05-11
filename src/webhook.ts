export interface PayloadWebhook {
  evento:  'inicio' | 'exito' | 'error' | 'alerta_conteo';
  mensaje: string;
  detalles?: Record<string, any>;
}

const ETIQUETAS: Record<string, string> = {
  inicio:        'iniciado',
  exito:         'terminado',
  error:         'error',
  alerta_conteo: 'alerta conteo',
};

export async function notificar(payload: PayloadWebhook): Promise<void> {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  const etiqueta = ETIQUETAS[payload.evento] ?? payload.evento;

  let resumen = '';
  const d = payload.detalles;
  if (d && payload.evento === 'exito') {
    resumen = `\nRegistros cargados: ${d.insertados} | Total en BD: ${d.en_bd}`;
  } else if (payload.evento === 'error') {
    resumen = `\nDetalle: ${payload.mensaje}`;
  }

  const fecha = `\n${new Date().toLocaleString('es-CL')}`;
  const text = `*proceso carga base datos SAM ${etiqueta}*${resumen}${fecha}`;

  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
  } catch (err: any) {
    console.warn('[webhook] No se pudo enviar notificación:', err.message);
  }
}
