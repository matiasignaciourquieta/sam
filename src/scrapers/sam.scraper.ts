import { DentalSoftService } from '../dentalsoft/dentalsoft.service';

const REPORT_HASH    = 'web/index.php/sam/informes/membresias';
const EXCEL_SELECTOR = "xpath=//span[contains(text(),'Excel')]/.. | //button[contains(.,'Excel')] | //a[contains(.,'Excel')]";

function trimestresAnioActual(): Array<{ desde: string; hasta: string; label: string }> {
  const a = new Date().getFullYear();
  return [
    { desde: `01/01/${a}`, hasta: `31/03/${a}`, label: 'Q1' },
    { desde: `01/04/${a}`, hasta: `30/06/${a}`, label: 'Q2' },
    { desde: `01/07/${a}`, hasta: `30/09/${a}`, label: 'Q3' },
    { desde: `01/10/${a}`, hasta: `31/12/${a}`, label: 'Q4' },
  ];
}

async function setearFiltrosFecha(
  page: ReturnType<DentalSoftService['getPage']>,
  desde: string,
  hasta: string,
): Promise<void> {
  const SELECTORES_DESDE = [
    'input[name="fecha_inicio"]', 'input[name="FechaInicio"]', 'input[name="fechaInicio"]',
    'input[name="fecha_desde"]',  'input[name="fechaDesde"]',  'input[name="start_date"]',
    '#fecha_inicio', '#FechaInicio', '#fechaInicio', '#fecha_desde',
  ];
  const SELECTORES_HASTA = [
    'input[name="fecha_fin"]',   'input[name="FechaFin"]',   'input[name="fechaFin"]',
    'input[name="fecha_hasta"]', 'input[name="fechaHasta"]', 'input[name="end_date"]',
    '#fecha_fin', '#FechaFin', '#fechaFin', '#fecha_hasta',
  ];

  const setFecha = async (selectores: string[], valor: string): Promise<boolean> => {
    for (const sel of selectores) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        await page.evaluate(([s, v]: [string, string]) => {
          const w = window as any;
          if (w.$ && w.$(s).length) {
            try { w.$(s).datepicker('setDate', v); w.$(s).trigger('change'); return; } catch {}
          }
          const input = document.querySelector(s) as HTMLInputElement | null;
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            setter?.call(input, v);
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input',  { bubbles: true }));
          }
        }, [sel, valor] as [string, string]);
        console.log(`[sam] Fecha seteada: ${sel} = ${valor}`);
        return true;
      }
    }
    return false;
  };

  const desdeOk = await setFecha(SELECTORES_DESDE, desde);
  const hastaOk = await setFecha(SELECTORES_HASTA, hasta);

  if (!desdeOk && !hastaOk) {
    console.log('[sam] ⚠ No se encontraron filtros de fecha');
  } else {
    console.log(`[sam] Rango seteado: ${desde} → ${hasta}`);
    await page.waitForTimeout(800);
  }
}

export async function descargarSam(): Promise<string[]> {
  console.log('[sam] Iniciando descarga trimestral desde DentalSoft...');

  const ds = new DentalSoftService();
  await ds.init();

  try {
    await ds.login();

    const page = ds.getPage();

    console.log(`[sam] Navegando a membresías: ${REPORT_HASH}`);
    await ds.navigateTo(REPORT_HASH);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log(`[sam] URL post-navegación: ${page.url()}`);

    if (page.url().includes('login')) {
      console.log('[sam] Sesión perdida post-navegación, re-autenticando...');
      await ds.login();
      await page.evaluate((h) => { window.location.hash = h; }, REPORT_HASH);
      await page.waitForLoadState('networkidle').catch(() => {});
    }

    console.log("[sam] Esperando botón 'Generar'...");
    await page.waitForSelector("button:has-text('Generar')", { timeout: 60000 })
      .catch(() => null);
    console.log('[sam] Página de membresías cargada');

    const trimestres = trimestresAnioActual();
    const archivos: string[] = [];

    for (const { desde, hasta, label } of trimestres) {
      console.log(`\n[sam] ── Trimestre ${label}: ${desde} → ${hasta}`);

      await setearFiltrosFecha(page, desde, hasta);

      const tieneGenerar = await page.$("button:has-text('Generar')")
        .then(el => !!el).catch(() => false);

      if (!tieneGenerar) {
        console.log(`[sam] ⚠ Botón Generar no encontrado en ${label}, saltando...`);
        continue;
      }

      console.log(`[sam] Haciendo clic en Generar (${label})...`);
      await ds.clickGenerar();
      console.log(`[sam] Esperando botón Excel ${label} (hasta 5 min)...`);
      await page.waitForSelector(EXCEL_SELECTOR, { timeout: 300000 });
      console.log(`[sam] Botón Excel visible — descargando ${label}...`);

      const filePath = await ds.downloadFile(async () => {
        await page.locator(EXCEL_SELECTOR).first().click({ noWaitAfter: true });
      }, 300000);

      console.log(`[sam] Descarga ${label} OK → ${filePath}`);
      archivos.push(filePath);
    }

    console.log(`\n[sam] Descarga trimestral completa — ${archivos.length} archivos`);
    return archivos;

  } finally {
    await ds.close();
  }
}
