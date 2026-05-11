import { firefox, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as os from 'os';

export class DentalSoftService {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;
  private baseUrl: string;

  constructor() {
    const url = process.env.DENTALSOFT_URL;
    if (!url) throw new Error('DENTALSOFT_URL no definida en .env');
    this.baseUrl = url.replace(/\/$/, '');
  }

  async init(): Promise<void> {
    const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';
    console.log(`[dentalsoft] Lanzando Firefox (headless=${headless})...`);
    this.browser = await firefox.launch({ headless });
    this.context = await this.browser.newContext({ acceptDownloads: true });
    this.page = await this.context.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 });
    console.log('[dentalsoft] Browser listo');
  }

  async login(): Promise<void> {
    const user = process.env.DENTALSOFT_USER;
    const pass = process.env.DENTALSOFT_PASS;
    if (!user || !pass) throw new Error('DENTALSOFT_USER o DENTALSOFT_PASS no definidos en .env');

    console.log('[dentalsoft] Iniciando sesión...');
    console.log(`[dentalsoft] Navegando a baseUrl: ${this.baseUrl}`);
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 90000 });

    console.log(`[dentalsoft] URL después de redirect: ${this.page.url()}`);
    console.log('[dentalsoft] Esperando campo #user_name visible...');
    await this.page.waitForSelector('#user_name', { state: 'visible', timeout: 60000 });
    console.log('[dentalsoft] Campo visible — llenando credenciales...');
    await this.page.fill('#user_name', user, { timeout: 60000 });
    await this.page.fill('#user_password', pass, { timeout: 60000 });
    console.log('[dentalsoft] Credenciales ingresadas — haciendo submit...');
    await this.page.click('[type=submit]');
    console.log('[dentalsoft] Esperando redirect post-login...');
    await this.page.waitForURL(url => !url.toString().includes('login'), {
      timeout: 90000,
      waitUntil: 'domcontentloaded',
    });
    console.log(`[dentalsoft] Sesión iniciada OK — URL: ${this.page.url()}`);
  }

  async navigateTo(hashPath: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}/#${hashPath}`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
  }

  getPage(): Page {
    return this.page;
  }

  async clickGenerar(): Promise<void> {
    await this.page.click("button:has-text('Generar')");
    await this.page.waitForTimeout(5000);
  }

  async downloadFile(
    triggerFn: () => Promise<void>,
    timeout = 300000,
  ): Promise<string> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout }),
      triggerFn(),
    ]);
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);
    return tmpPath;
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }
}
