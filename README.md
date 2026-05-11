# UnionSalud SAM

Descarga automática del informe de membresías desde DentalSoft y carga a la tabla `beneficiarios_sam` en PostgreSQL.

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL (Railway u otro) |
| `DENTALSOFT_URL` | URL base de DentalSoft |
| `DENTALSOFT_USER` | Usuario DentalSoft |
| `DENTALSOFT_PASS` | Contraseña DentalSoft |
| `WEBHOOK_URL` | URL Slack/webhook para notificaciones (opcional) |
| `EMAIL_USER` | Gmail para envío de notificaciones (opcional) |
| `EMAIL_PASS` | App password Gmail (opcional) |
| `EMAIL_DESTINOS` | Correos destino separados por coma (opcional) |
| `PLAYWRIGHT_HEADLESS` | `true` en producción, `false` para debug local |

## Uso

```bash
npm install
npx playwright install chromium

# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## Deploy Railway

- **Start Command:** `node dist/index.js`
- **Build Command:** `npm run build && npx playwright install chromium`
- **Cron Schedule:** `0 12 * * *` (12:00 UTC / 09:00 Chile)
