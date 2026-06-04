/**
 * M&T CRM — UTM Tracker para Landing Pages
 *
 * Pegar este script en la landing page del cliente.
 * Captura UTMs del URL y los envia junto con el formulario al CRM.
 *
 * Uso:
 *   <script src="https://tu-dominio.vercel.app/utm-tracker.js"
 *           data-tenant="UUID-DEL-TENANT"
 *           data-endpoint="https://tu-dominio.vercel.app/api/webhooks/lead">
 *   </script>
 *
 * El script:
 * 1. Lee los parametros UTM del URL al cargar la pagina
 * 2. Los guarda en sessionStorage (persisten si el usuario navega entre paginas)
 * 3. Al enviar el formulario, anade los UTMs al body del POST
 *
 * Tambien expone window.MytUTM para uso manual:
 *   MytUTM.getParams()  → { utm_source, utm_campaign, ... }
 *   MytUTM.send(data)   → envia lead al CRM con UTMs incluidos
 */
(function () {
  'use strict'

  // Config desde atributos del script
  var script = document.currentScript
  var TENANT_ID = script && script.getAttribute('data-tenant')
  var ENDPOINT = (script && script.getAttribute('data-endpoint')) || '/api/webhooks/lead'

  // Parametros UTM a capturar
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  var STORAGE_KEY = 'mytcrm_utm'

  // 1. Capturar UTMs del URL y guardar en sessionStorage
  function captureUTMs() {
    var params = new URLSearchParams(window.location.search)
    var utm = {}
    var hasAny = false

    for (var i = 0; i < UTM_KEYS.length; i++) {
      var val = params.get(UTM_KEYS[i])
      if (val) {
        utm[UTM_KEYS[i]] = val
        hasAny = true
      }
    }

    // Landing page y referrer siempre
    utm.landing_page = window.location.href.split('?')[0]
    if (document.referrer) {
      utm.referrer = document.referrer
    }

    // Solo guardar si hay UTMs nuevos (no pisar datos existentes si navega entre paginas)
    if (hasAny) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm)) } catch (e) { /* ok */ }
    }

    return utm
  }

  // 2. Leer UTMs guardados
  function getStoredUTMs() {
    try {
      var stored = sessionStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (e) {
      return {}
    }
  }

  // 3. Obtener parametros (frescos del URL o guardados en sesion)
  function getParams() {
    var fresh = {}
    var params = new URLSearchParams(window.location.search)
    for (var i = 0; i < UTM_KEYS.length; i++) {
      var val = params.get(UTM_KEYS[i])
      if (val) fresh[UTM_KEYS[i]] = val
    }
    // Merge: frescos tienen prioridad sobre guardados
    var stored = getStoredUTMs()
    return Object.assign({}, stored, fresh)
  }

  // 4. Enviar lead al CRM con UTMs
  function sendLead(data) {
    var utms = getParams()
    var body = Object.assign({}, data, utms)
    if (TENANT_ID) body.tenant_id = TENANT_ID

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) { return res.json() })
  }

  // 5. Auto-captura al cargar
  captureUTMs()

  // 6. Exponer API publica
  window.MytUTM = {
    getParams: getParams,
    send: sendLead,
    getTenantId: function () { return TENANT_ID },
  }
})()
