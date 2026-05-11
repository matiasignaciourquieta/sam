import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { db } from '../db/client';
import { BeneficiarioSam } from '../types';

function parsearArchivo(filePath: string): Record<string, any>[] {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const buf = fs.readFileSync(filePath);
    let contenido: string;
    if (buf[0] === 0xFF && buf[1] === 0xFE) {
      contenido = buf.slice(2).toString('utf16le');
    } else if (buf[0] === 0xFE && buf[1] === 0xFF) {
      const swapped = Buffer.allocUnsafe(buf.length - 2);
      for (let i = 0; i < swapped.length - 1; i += 2) {
        swapped[i] = buf[i + 3]; swapped[i + 1] = buf[i + 2];
      }
      contenido = swapped.toString('utf16le');
    } else {
      const utf8 = buf.toString('utf-8').replace(/^﻿/, '');
      contenido = utf8.includes('�') ? buf.toString('latin1') : utf8;
    }

    const lineas = contenido.split(/\r?\n/);

    let maxCount = 0;
    let headerLine = 1;
    let delimiter = ';';
    for (let i = 0; i < Math.min(10, lineas.length); i++) {
      const sc = (lineas[i].match(/;/g) ?? []).length;
      const cm = (lineas[i].match(/,/g) ?? []).length;
      const count = Math.max(sc, cm);
      if (count > maxCount) {
        maxCount = count;
        headerLine = i + 1;
        delimiter = sc >= cm ? ';' : ',';
      }
    }
    console.log(`[sam] CSV → delimiter="${delimiter}", header en línea ${headerLine}, columnas detectadas: ${maxCount + 1}`);

    return parse(contenido, {
      columns:          true,
      skip_empty_lines: true,
      trim:             true,
      delimiter,
      from_line:        headerLine,
    });
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  }

  throw new Error(`Formato no soportado: ${ext}`);
}

function normalizarHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

const HEADER_MAP: Record<string, keyof BeneficiarioSam> = {
  contrato: 'contrato', n_contrato: 'contrato', numero_contrato: 'contrato', num_contrato: 'contrato',
  producto: 'producto',
  fecha_creacion: 'fecha_creacion', fecha_de_creacion: 'fecha_creacion',
  fecha_nacimiento: 'fecha_nacimiento', fecha_de_nacimiento: 'fecha_nacimiento',
  fecha_de_nacimiento_beneficiario: 'fecha_nacimiento',
  fecha_validez: 'fecha_validez', fecha_de_validez: 'fecha_validez',
  fecha_primer_pago: 'fecha_primer_pago',
  tipo_doc: 'tipo_doc', tipo_documento: 'tipo_doc',
  tipo_doc_titular: 'tipo_doc_titular', tipo_documento_titular: 'tipo_doc_titular',
  rut_beneficiario: 'rut_beneficiario', rut_benef: 'rut_beneficiario',
  rut_dni_beneficiario: 'rut_beneficiario',
  rut_beneficiario_base: 'rut_beneficiario_base', rut_benef_base: 'rut_beneficiario_base',
  rut_beneficiario_dv: 'rut_beneficiario_dv', rut_benef_dv: 'rut_beneficiario_dv',
  nombre_beneficiario_completo: 'nombre_beneficiario_completo',
  nombre_completo_beneficiario: 'nombre_beneficiario_completo',
  nombre_beneficiario: 'nombre_beneficiario', nombres_beneficiario: 'nombre_beneficiario', nombre_benef: 'nombre_beneficiario',
  apellido_paterno_beneficiario: 'apellido_paterno_beneficiario', apellido_paterno_benef: 'apellido_paterno_beneficiario',
  nombre_beneficiario_apellido_p: 'apellido_paterno_beneficiario',
  apellido_materno_beneficiario: 'apellido_materno_beneficiario', apellido_materno_benef: 'apellido_materno_beneficiario',
  nombre_beneficiario_apellido_m: 'apellido_materno_beneficiario',
  sexo: 'sexo',
  prevision: 'prevision', prevision_beneficiario: 'prevision',
  direccion: 'direccion', direccion_beneficiario: 'direccion',
  comuna: 'comuna',
  tipo_titular: 'tipo_titular',
  titular: 'tipo_titular',
  rut_titular: 'rut_titular',
  rut_dni_titular: 'rut_titular',
  rut_titular_base: 'rut_titular_base',
  rut_titular_dv: 'rut_titular_dv',
  rut_titular_2: 'rut_titular_2',
  nombre_titular_completo: 'nombre_titular_completo', nombre_completo_titular: 'nombre_titular_completo',
  nombre_titular: 'nombre_titular', nombres_titular: 'nombre_titular',
  apellido_paterno_titular: 'apellido_paterno_titular',
  nombre_titular_apellido_p: 'apellido_paterno_titular',
  apellido_materno_titular: 'apellido_materno_titular',
  nombre_titular_apellido_m: 'apellido_materno_titular',
  correo: 'correo', email: 'correo', correo_electronico: 'correo',
  telefono_movil: 'telefono_movil', telefono: 'telefono_movil', celular: 'telefono_movil', movil: 'telefono_movil',
  tipo_membresia: 'tipo_membresia', membresia: 'tipo_membresia',
  monto: 'monto',
  monto_uf: 'monto_uf',
  estado: 'estado',
  usuario_registro: 'usuario_registro', usuario: 'usuario_registro',
  cupon: 'cupon', cupones: 'cupon',
  promo: 'promo', promocion: 'promo',
  lugar_venta: 'lugar_venta', lugar_de_venta: 'lugar_venta',
  id_sub: 'id_sub', id_suscripcion: 'id_sub',
  estado_externo: 'estado_externo',
  empresa: 'empresa',
};

function splitRut(rut: string): { base: string; dv: string } {
  const idx = rut.trim().lastIndexOf('-');
  if (idx === -1) return { base: rut.trim(), dv: '' };
  return { base: rut.substring(0, idx).trim(), dv: rut.substring(idx + 1).trim() };
}

function mapearFila(fila: Record<string, any>): BeneficiarioSam {
  const mapped: Partial<Record<keyof BeneficiarioSam, string>> = {};

  for (const [rawKey, value] of Object.entries(fila)) {
    const dbCol = HEADER_MAP[normalizarHeader(rawKey)];
    if (dbCol) mapped[dbCol] = String(value ?? '').trim();
  }

  if (mapped.rut_beneficiario && !mapped.rut_beneficiario_base) {
    const { base, dv } = splitRut(mapped.rut_beneficiario);
    mapped.rut_beneficiario_base = base;
    mapped.rut_beneficiario_dv   = dv;
  }
  if (mapped.rut_titular && !mapped.rut_titular_base) {
    const { base, dv } = splitRut(mapped.rut_titular);
    mapped.rut_titular_base = base;
    mapped.rut_titular_dv   = dv;
  }

  if (!mapped.nombre_beneficiario_completo) {
    mapped.nombre_beneficiario_completo = [
      mapped.apellido_paterno_beneficiario,
      mapped.apellido_materno_beneficiario,
      mapped.nombre_beneficiario,
    ].filter(Boolean).join(' ').toUpperCase();
  }
  if (!mapped.nombre_titular_completo) {
    mapped.nombre_titular_completo = [
      mapped.apellido_paterno_titular,
      mapped.apellido_materno_titular,
      mapped.nombre_titular,
    ].filter(Boolean).join(' ').toUpperCase();
  }

  if (mapped.rut_titular && !mapped.rut_titular_2) {
    mapped.rut_titular_2 = mapped.rut_titular;
  }

  const s = (k: keyof BeneficiarioSam) => mapped[k] ?? '';

  return {
    contrato:                      s('contrato'),
    producto:                      s('producto'),
    fecha_creacion:                s('fecha_creacion'),
    tipo_doc:                      s('tipo_doc'),
    rut_beneficiario:              s('rut_beneficiario'),
    rut_beneficiario_base:         s('rut_beneficiario_base'),
    rut_beneficiario_dv:           s('rut_beneficiario_dv'),
    nombre_beneficiario_completo:  s('nombre_beneficiario_completo'),
    nombre_beneficiario:           s('nombre_beneficiario'),
    apellido_paterno_beneficiario: s('apellido_paterno_beneficiario'),
    apellido_materno_beneficiario: s('apellido_materno_beneficiario'),
    fecha_nacimiento:              s('fecha_nacimiento'),
    sexo:                          s('sexo'),
    prevision:                     s('prevision'),
    direccion:                     s('direccion'),
    comuna:                        s('comuna'),
    tipo_titular:                  s('tipo_titular'),
    tipo_doc_titular:              s('tipo_doc_titular'),
    rut_titular:                   s('rut_titular'),
    rut_titular_base:              s('rut_titular_base'),
    rut_titular_dv:                s('rut_titular_dv'),
    nombre_titular_completo:       s('nombre_titular_completo'),
    nombre_titular:                s('nombre_titular'),
    apellido_paterno_titular:      s('apellido_paterno_titular'),
    apellido_materno_titular:      s('apellido_materno_titular'),
    rut_titular_2:                 s('rut_titular_2'),
    correo:                        s('correo'),
    telefono_movil:                s('telefono_movil'),
    tipo_membresia:                s('tipo_membresia'),
    monto:                         s('monto'),
    monto_uf:                      s('monto_uf'),
    estado:                        s('estado'),
    fecha_validez:                 s('fecha_validez'),
    usuario_registro:              s('usuario_registro'),
    cupon:                         s('cupon'),
    promo:                         s('promo'),
    lugar_venta:                   s('lugar_venta'),
    id_sub:                        s('id_sub'),
    estado_externo:                s('estado_externo'),
    fecha_primer_pago:             s('fecha_primer_pago'),
    empresa:                       s('empresa'),
  };
}

export interface StatsSam {
  total: number;
  insertados: number;
  en_bd: number;
}

export async function cargarSam(filePaths: string[]): Promise<StatsSam> {
  console.log(`[sam] Parseando ${filePaths.length} archivo(s)...`);

  const registros: BeneficiarioSam[] = [];
  let totalFilas = 0;

  for (const filePath of filePaths) {
    const filas = parsearArchivo(filePath);
    totalFilas += filas.length;
    const regs = filas.map(mapearFila).filter(r => r.rut_beneficiario !== '');
    console.log(`[sam] ${path.basename(filePath)}: ${regs.length} registros válidos de ${filas.length} filas`);

    if (filas.length > 0) {
      const headers   = Object.keys(filas[0]);
      const sinMapear = headers.filter(h => !HEADER_MAP[normalizarHeader(h)]);
      if (sinMapear.length > 0) console.log(`[sam] Sin mapear: ${sinMapear.join(', ')}`);
    }

    registros.push(...regs);
    fs.unlinkSync(filePath);
  }

  console.log(`[sam] Total: ${registros.length} registros válidos de ${totalFilas} filas`);

  if (registros.length === 0) {
    console.log('[sam] Sin datos para cargar.');
    return { total: 0, insertados: 0, en_bd: 0 };
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE beneficiarios_sam RESTART IDENTITY');
    console.log('[sam] Tabla vaciada (TRUNCATE)');

    const LOTE = 500;
    const COLS = 41;
    let insertados = 0;

    for (let i = 0; i < registros.length; i += LOTE) {
      const lote = registros.slice(i, i + LOTE);
      const valores: any[] = [];
      const placeholders: string[] = [];

      lote.forEach((r, idx) => {
        const b = idx * COLS;
        placeholders.push(
          `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},` +
          `$${b+11},$${b+12},$${b+13},$${b+14},$${b+15},$${b+16},$${b+17},$${b+18},$${b+19},$${b+20},` +
          `$${b+21},$${b+22},$${b+23},$${b+24},$${b+25},$${b+26},$${b+27},$${b+28},$${b+29},$${b+30},` +
          `$${b+31},$${b+32},$${b+33},$${b+34},$${b+35},$${b+36},$${b+37},$${b+38},$${b+39},$${b+40},` +
          `$${b+41})`
        );
        valores.push(
          r.contrato, r.producto, r.fecha_creacion, r.tipo_doc,
          r.rut_beneficiario, r.rut_beneficiario_base, r.rut_beneficiario_dv,
          r.nombre_beneficiario_completo, r.nombre_beneficiario,
          r.apellido_paterno_beneficiario, r.apellido_materno_beneficiario,
          r.fecha_nacimiento, r.sexo, r.prevision, r.direccion, r.comuna,
          r.tipo_titular, r.tipo_doc_titular,
          r.rut_titular, r.rut_titular_base, r.rut_titular_dv,
          r.nombre_titular_completo, r.nombre_titular,
          r.apellido_paterno_titular, r.apellido_materno_titular,
          r.rut_titular_2, r.correo, r.telefono_movil,
          r.tipo_membresia, r.monto, r.monto_uf, r.estado, r.fecha_validez,
          r.usuario_registro, r.cupon, r.promo, r.lugar_venta,
          r.id_sub, r.estado_externo, r.fecha_primer_pago, r.empresa,
        );
      });

      await client.query(
        `INSERT INTO beneficiarios_sam (
          contrato, producto, fecha_creacion, tipo_doc,
          rut_beneficiario, rut_beneficiario_base, rut_beneficiario_dv,
          nombre_beneficiario_completo, nombre_beneficiario,
          apellido_paterno_beneficiario, apellido_materno_beneficiario,
          fecha_nacimiento, sexo, prevision, direccion, comuna,
          tipo_titular, tipo_doc_titular,
          rut_titular, rut_titular_base, rut_titular_dv,
          nombre_titular_completo, nombre_titular,
          apellido_paterno_titular, apellido_materno_titular,
          rut_titular_2, correo, telefono_movil,
          tipo_membresia, monto, monto_uf, estado, fecha_validez,
          usuario_registro, cupon, promo, lugar_venta,
          id_sub, estado_externo, fecha_primer_pago, empresa
        ) VALUES ${placeholders.join(',')}`,
        valores
      );

      insertados += lote.length;
      console.log(`[sam] Insertados: ${insertados}/${registros.length}`);
    }

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM beneficiarios_sam');
    const enBD = rows[0].n as number;
    if (enBD !== insertados) {
      throw new Error(`Conteo no coincide: insertados=${insertados} en_bd=${enBD} — se revierte la carga`);
    }

    await client.query('COMMIT');
    console.log(`[sam] Carga completa — ${insertados} registros`);
    return { total: registros.length, insertados, en_bd: enBD };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
