import 'dotenv/config';
import { descargarSam }  from './scrapers/sam.scraper';
import { cargarSam }     from './loaders/sam.loader';
import { notificar }     from './webhook';
import { enviarEmail }   from './email';
import { db }            from './db/client';

async function main() {
  console.log('\n══ SAM ════════════════════════════════════════════════════');
  await notificar({ evento: 'inicio', mensaje: 'Proceso SAM iniciado' });

  try {
    const archivo = await descargarSam();
    const stats   = await cargarSam(archivo);

    console.log(`[sam] Registros en BD: ${stats.en_bd}`);
    console.log('══ SAM OK ═════════════════════════════════════════════════\n');

    await Promise.all([
      notificar({ evento: 'exito', mensaje: 'Proceso SAM finalizado correctamente', detalles: stats }),
      enviarEmail('exito', 'Proceso SAM finalizado correctamente', stats),
    ]);

  } catch (err: any) {
    console.error('\nERROR:', err.message);
    const mensajeError = err.message.replace(/\x1B\[[0-9;]*m/g, '').split('\n')[0];
    await Promise.all([
      notificar({ evento: 'error', mensaje: mensajeError }),
      enviarEmail('error', mensajeError),
    ]);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
