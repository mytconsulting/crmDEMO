# SOP: Onboarding de nuevo cliente en M&T CRM

> Procedimiento para configurar el CRM para un nuevo cliente.
> Ultima actualizacion: 2026-04-14
> Nota: n8n ya no se usa. Todo funciona via API Routes en Next.js.

---

## Checklist rapido

- [ ] 1. Cliente registrado en el CRM (tiene Tenant ID)
- [ ] 2. Rol verificado (admin le pone `is_active = true`)
- [ ] 3. Instancia WhatsApp creada en Evolution API + QR escaneado
- [ ] 4. Instancia WhatsApp configurada en Modulos del CRM
- [ ] 5. Webhook de WhatsApp apuntando al CRM
- [ ] 6. Documentos del agente IA rellenados (o entrenamiento por voz)
- [ ] 7. Estilo de comunicacion configurado (formalidad, emojis, longitud)
- [ ] 8. Modulos activados (citas, recordatorios, follow-ups)
- [ ] 9. Landing page conectada al endpoint del CRM + UTM tracking
- [ ] 10. Campaña creada en panel /campaigns (para tracking de gasto)
- [ ] 11. Test completo realizado

---

## Datos que necesitas antes de empezar

| Dato | Ejemplo | Donde se usa |
|---|---|---|
| Nombre del negocio | "Clinica Dental Lopez" | Config modulos, mensajes |
| Numero WhatsApp del cliente | +34 612 345 678 | Evolution API |
| URL de la landing page | clinicalopez.com/contacto | Formulario + UTM |

---

## Arquitectura: que es automatico y que hay que configurar

| Componente | Multi-tenant? | Hay que configurar? |
|---|---|---|
| Chatbot WhatsApp (WF2) | Si — un solo endpoint para todos | Solo documentos + webhook |
| Follow-ups automaticos (WF5) | Si — cron procesa todos los tenants | Solo activar modulo |
| Recordatorios de citas (WF4) | Si — cron procesa todos los tenants | Solo activar modulo |
| Auto-learn (WF8) | Si — cron procesa todos los tenants | Automatico |
| Captura lead desde landing (WF1) | Si — un solo endpoint, `tenant_id` en body | Solo conectar landing |
| Entrada manual de lead (WF6) | Si — funciona por usuario logueado | Nada |
| Pipeline estados | Si — se crean automaticamente al registrar | Personalizar si quiere |

**Ya NO hay que duplicar workflows.** Todo es multi-tenant desde el primer dia.

---

## Paso 1: Registro del cliente

El cliente se registra en el CRM:
1. Va a `https://[TU-DOMINIO]/register`
2. Introduce email, contraseña y nombre de empresa
3. Se crea automaticamente: perfil, 7 estados de pipeline, configuracion de modulos

**Desde el Panel Admin:**
1. Ir a `/admin`
2. Verificar que el cliente aparece
3. Activar su cuenta (`is_active = true`) si es necesario
4. **Anotar el Tenant ID** (UUID) — se necesita para la landing

---

## Paso 2: Crear instancia WhatsApp en Evolution API

**Panel:** `https://n8n-evolution-api.eh3kh7.easypanel.host`

1. Crear nueva instancia con nombre descriptivo: `NombreCliente WhatsApp`
2. Escanear QR con el WhatsApp del cliente
3. Verificar conexion (status: open)
4. Anotar el nombre exacto de la instancia

---

## Paso 3: Configurar WhatsApp en el CRM

Iniciar sesion como admin en el CRM:

1. Ir a `/admin`
2. Buscar el cliente y hacer click en "Configurar"
3. En la seccion de Evolution API:
   - **Nombre de instancia**: el nombre exacto que pusiste en Evolution (ej: `Clinica Lopez WhatsApp`)
   - **Canal WhatsApp**: activar
4. Guardar

---

## Paso 4: Configurar webhook de WhatsApp

En Evolution API, configurar el webhook de la instancia del cliente:

1. Ir a la instancia creada en Evolution API
2. En Webhook/Events, configurar:
   - **URL:** `https://[TU-DOMINIO]/api/webhooks/whatsapp`
   - **Events:** `MESSAGES_UPSERT`
3. Guardar

Ahora, cuando alguien escriba al WhatsApp del cliente, el chatbot respondera automaticamente con el contexto de ESE cliente.

---

## Paso 5: Configurar el agente IA

Hay dos opciones:

### Opcion A — Entrenamiento por voz (recomendado)
1. Ir a `/agent/train` con la cuenta del cliente
2. El cliente responde a los escenarios de entrenamiento
3. Claude genera automaticamente la identidad de voz y ejemplos

### Opcion B — Documentos manuales
1. Ir a `/agent` con la cuenta del cliente
2. Rellenar los documentos:
   - **Contexto del negocio**: servicios, precios, propuesta de valor
   - **FAQs**: preguntas frecuentes con respuestas
   - **Disponibilidad**: horarios, zona horaria

---

## Paso 6: Configurar modulos

Ir a `/modules` con la cuenta del cliente:

### Estilo de comunicacion
- **Formalidad**: 0 (casual) a 100 (corporativo) — ajustar segun el negocio
- **Emojis**: Ninguno / Pocos / Moderado / Muchos
- **Longitud**: Muy cortos / Cortos / Normal / Detallados

### Citas (si aplica)
- Activar modulo de citas
- Duracion de reuniones (30/45/60 min)
- Citas concurrentes permitidas

### Recordatorios (si citas activas)
- Activar recordatorios
- Configurar cuando enviar (1 dia antes, mismo dia, etc.)
- Personalizar mensaje con `{nombre}`, `{fecha}`, `{hora}`

### Follow-ups
- Activar follow-ups
- Horas de espera (default: 24h)
- Maximo de intentos (default: 2)
- Respetar horario laboral (9-19 Madrid)

### Mensaje de bienvenida
- Personalizar el primer mensaje que recibe el lead por WhatsApp
- Usar `{nombre}` para el nombre del lead
- Opcionalmente adjuntar archivo (PDF, imagen, video)

---

## Paso 7: Conectar la landing page al CRM

Hay dos escenarios: crear una landing nueva o conectar una existente.

---

### 7A. Si vas a CREAR una landing nueva para el cliente

Abre Claude Code en el repositorio de la landing y pega este prompt (reemplaza los valores entre corchetes):

```
PROMPT PARA CLAUDE CODE — CREAR LANDING CON CRM + UTM TRACKING
================================================================

Estoy creando una landing page para un cliente de nuestro CRM (M&T CRM).
El formulario de contacto debe enviar los datos al CRM via API y capturar UTMs para tracking de campañas.

DATOS DEL CLIENTE:
- Nombre del negocio: [NOMBRE DEL NEGOCIO]
- Tenant ID (UUID del CRM): [TENANT-ID]
- Endpoint del CRM: https://myt-crm-app.vercel.app/api/webhooks/lead

REQUISITOS DEL FORMULARIO:
1. Campos: nombre (obligatorio), telefono (obligatorio), email (obligatorio)
2. Al hacer submit, enviar POST al endpoint del CRM con este body:
   {
     tenant_id: "[TENANT-ID]",
     nombre: nombre,
     telefono: telefono (formato: 34XXXXXXXXX, sin espacios ni guiones),
     email: email,
     origen: "web",
     utm_source: (del URL o "direct"),
     utm_medium: (del URL o "organic"),
     utm_campaign: (del URL o ""),
     utm_content: (del URL o "")
   }
3. Headers: Content-Type: application/json
4. Capturar UTMs del URL automaticamente (los parametros ?utm_source=...&utm_campaign=... que vienen de Meta Ads)
5. Guardar UTMs en sessionStorage para que no se pierdan si el usuario navega entre paginas
6. Si el POST es exitoso, redirigir a una pagina de gracias
7. Normalizar telefono: quitar espacios, guiones, puntos. Si empieza por 6/7/9 y tiene 9 digitos, anteponer 34

CODIGO DE REFERENCIA para la captura de UTMs:
function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || 'direct',
    utm_medium: params.get('utm_medium') || 'organic',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
    landing_page: window.location.href.split('?')[0],
    referrer: document.referrer || ''
  };
}

NO uses librerias externas para esto. JavaScript vanilla es suficiente.
```

---

### 7B. Si vas a CONECTAR una landing existente al CRM

Abre Claude Code en el repositorio de la landing existente y pega este prompt:

```
PROMPT PARA CLAUDE CODE — CONECTAR LANDING EXISTENTE AL CRM + UTM TRACKING
============================================================================

Esta landing page ya tiene un formulario de contacto. Necesito que:

1. CAMBIAR el endpoint del formulario para que envie los datos a nuestro CRM:
   - Endpoint: https://myt-crm-app.vercel.app/api/webhooks/lead
   - Metodo: POST
   - Content-Type: application/json

2. AÑADIR tenant_id al body del POST:
   - tenant_id: "[TENANT-ID]"

3. AÑADIR captura de UTMs para tracking de campañas de Meta Ads:
   - Leer parametros utm_source, utm_medium, utm_campaign, utm_content, utm_term del URL
   - Guardarlos en sessionStorage al cargar la pagina (por si navega entre paginas)
   - Incluirlos en el body del POST como campos de primer nivel (NO dentro de campos_extra)

4. El body del POST debe ser exactamente:
   {
     tenant_id: "[TENANT-ID]",
     nombre: (del formulario),
     telefono: (del formulario, normalizado a formato 34XXXXXXXXX),
     email: (del formulario),
     origen: "web",
     utm_source: (del URL o "direct"),
     utm_medium: (del URL o "organic"),
     utm_campaign: (del URL o ""),
     utm_content: (del URL o ""),
     utm_term: (del URL o ""),
     landing_page: (URL actual sin parametros),
     referrer: (document.referrer)
   }

5. Normalizar telefono español: quitar espacios/guiones, si tiene 9 digitos y empieza por 6/7/9 anteponer "34"

6. NO borres la funcionalidad existente del formulario (validaciones, estilos, etc).
   Solo cambia el endpoint y añade los UTMs.

Busca el formulario en el codigo, muestrame que vas a cambiar antes de hacerlo.
```

---

### 7C. Configurar UTMs en Meta Ads

En los anuncios NUEVOS de Meta Ads, poner la URL de destino con parametros UTM:
```
https://landing-del-cliente.com?utm_source=facebook&utm_medium=cpc&utm_campaign=nombre-campana&utm_content=nombre-anuncio
```

**Valores recomendados:**
| Parametro | Que poner | Ejemplo |
|---|---|---|
| utm_source | Plataforma de origen | `facebook`, `instagram`, `google` |
| utm_medium | Tipo de trafico | `cpc` (pago), `organic`, `social` |
| utm_campaign | Nombre de la campaña | `toldos-primavera-2026` |
| utm_content | Nombre del anuncio/creativo | `video-terraza`, `carousel-productos` |

> IMPORTANTE: No editar campañas activas para añadir UTMs. Solo en anuncios/conjuntos/campañas nuevas.

---

## Paso 8: Crear campaña en el panel de metricas

Como admin, ir a `/campaigns`:

1. Seleccionar el cliente en el dropdown
2. Click en "+ Nueva Campaña"
3. Rellenar:
   - **Nombre**: nombre descriptivo (ej: "Toldos Primavera 2026")
   - **UTM Campaign**: el mismo valor que pusiste en `utm_campaign` de Meta Ads
   - **Plataforma**: Meta, Google, etc.
   - **Gasto total**: el gasto acumulado de la campaña (actualizar periodicamente)

---

## Paso 9: Test completo

### Test 1: Landing → Lead nuevo
1. Enviar formulario de prueba desde la landing
2. Verificar que aparece en el CRM del cliente
3. Verificar que llega WhatsApp de bienvenida
4. Si tiene UTMs, verificar que aparecen en "Origen del Lead" del LeadDetail

### Test 2: Chatbot WhatsApp
1. Responder al WhatsApp desde un numero de prueba
2. Verificar que el chatbot responde con el contexto del cliente (NO el de M&T)
3. Probar agendar una cita (si modulo activo)

### Test 3: Entrada manual
1. Crear lead manualmente desde el CRM (boton "+ Nuevo Lead")
2. Marcar "Enviar WhatsApp"
3. Verificar que llega el mensaje

### Test 4: Follow-ups y recordatorios
1. Crear un lead y esperar el tiempo de follow-up configurado
2. Verificar que llega el follow-up con el tono correcto del cliente
3. Si hay cita, verificar que llega el recordatorio

---

## Troubleshooting

| Problema | Causa probable | Solucion |
|---|---|---|
| Lead no aparece en CRM | `tenant_id` incorrecto en landing | Verificar UUID en el formulario |
| WhatsApp no llega | Instancia Evolution desconectada | Re-escanear QR |
| Chatbot responde con contexto de M&T | Documentos no configurados | Rellenar en `/agent` |
| Follow-ups no llegan | Modulo no activado | Activar en `/modules` |
| Follow-ups suenan raro | Estilo no configurado | Ajustar formalidad/emojis en `/modules` |
| Lead sin UTMs | URL de Meta Ads sin parametros | Añadir `?utm_source=...` en anuncios nuevos |
| Error al mover lead a Perdido | Constraint viejo en BD | Ya arreglado (migracion 20260414130000) |

---

## Tiempo estimado de onboarding

| Paso | Tiempo |
|---|---|
| Registro + activacion | 2 min |
| Evolution API + QR | 5 min |
| Configurar instancia en CRM | 2 min |
| Webhook WhatsApp | 2 min |
| Entrenar agente IA | 15-30 min (el cliente) |
| Configurar modulos | 5 min |
| Conectar landing + UTMs | 10-15 min |
| Crear campaña en panel | 2 min |
| Test completo | 10 min |
| **TOTAL** | **~45-60 min** |
