<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OdfDetail, PortOdf, FibrePort } from '../../types/map'
import type { NomFenetre } from '../../composables/useDrag'

const props = defineProps<{
  odf: OdfDetail | null
  chargement: boolean
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  placerFibre:    [portId: string]
  retirerFibre:   [portId: string]
  deplacerFibre:  [portSourceId: string, portDestId: string]
  redimensionner: [lignes: number, colonnes: number]
  supprimer:      []
  actualiser:     []
  fermer:         []
  startDrag:      [event: MouseEvent, fenetre: NomFenetre]
  tracerFibre:    [fibre: FibrePort]
}>()

// ── Mode redimensionnement ───────────────────────────
const modeRedimensionner = ref(false)
const nouvellesLignes    = ref(4)
const nouvellesColonnes  = ref(12)

// ── Mode déplacement ─────────────────────────────────
const portSourceMouvement = ref<string | null>(null)

watch(() => props.odf, (odf) => {
  portSourceMouvement.value  = null
  modeRedimensionner.value   = false
  if (odf) { nouvellesLignes.value = odf.lignes; nouvellesColonnes.value = odf.colonnes }
})

const annulerMouvement = () => { portSourceMouvement.value = null }

const gererClicPort = (port: PortOdf) => {
  if (portSourceMouvement.value) {
    if (port.id === portSourceMouvement.value) {
      annulerMouvement()
    } else if (!port.fibre_port) {
      emit('deplacerFibre', portSourceMouvement.value, port.id)
      annulerMouvement()
    } else {
      portSourceMouvement.value = port.id
    }
  } else {
    if (port.fibre_port) {
      portSourceMouvement.value = port.id
    } else {
      emit('placerFibre', port.id)
    }
  }
}

// ── Tri + couleurs ───────────────────────────────────
const portsTries = computed(() =>
  [...(props.odf?.ports ?? [])].sort(
    (a, b) => a.ligne_port !== b.ligne_port
      ? a.ligne_port - b.ligne_port
      : a.colonne_port - b.colonne_port
  )
)

const couleurPort = (port: PortOdf) => {
  if (port.id === portSourceMouvement.value)
    return 'bg-amber-400 ring-2 ring-amber-500 text-white'
  if (!port.fibre_port)
    return 'bg-[#3a4257] hover:bg-[#4a5568] text-slate-500'
  if (!port.fibre_port.etiquette)
    return 'bg-orange-500 hover:bg-orange-400 text-white'
  return 'bg-emerald-500 hover:bg-emerald-400 text-white'
}
</script>

<template>
  <transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="odf || chargement"
         class="absolute z-[5000] bg-[#1e2433] rounded-xl shadow-2xl border border-[#2d3448] flex flex-col overflow-hidden"
         style="width: 460px; max-height: 85vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- TITRE DRAGGABLE -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'inspectionOdf')"
           class="bg-purple-800 px-4 py-3 cursor-move flex justify-between items-center select-none">
        <h3 class="text-white text-sm font-bold flex items-center gap-2">
          📋 ODF
          <span v-if="odf" class="text-purple-300 font-normal">— {{ odf.nom_reference }}</span>
        </h3>
        <div class="flex items-center gap-1">
          <button @mousedown.stop @click.stop="modeRedimensionner = !modeRedimensionner"
                  class="text-purple-300 hover:text-white text-sm p-1" title="Redimensionner">📐</button>
          <button @mousedown.stop @click.stop="emit('actualiser')"
                  class="text-purple-300 hover:text-white text-sm p-1" title="Actualiser">🔄</button>
          <button @mousedown.stop @click.stop="emit('supprimer')"
                  class="text-purple-300 hover:text-red-300 text-sm p-1" title="Supprimer">🗑</button>
          <button @mousedown.stop @click.stop="emit('fermer')"
                  class="text-purple-300 hover:text-white text-xl font-bold leading-none p-1">&times;</button>
        </div>
      </div>

      <!-- CORPS -->
      <div class="flex-1 overflow-y-auto p-4" @mousedown.stop>

        <!-- Panneau redimensionnement -->
        <div v-if="modeRedimensionner && odf"
             class="mb-3 bg-indigo-950 border border-indigo-800 rounded-lg p-3">
          <p class="text-xs font-bold text-indigo-300 mb-2">📐 Redimensionner l'ODF</p>
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label class="block text-[10px] text-indigo-400 font-bold mb-0.5">Lignes</label>
              <input v-model.number="nouvellesLignes" type="number" min="1" max="20"
                     class="w-full text-xs p-1 bg-[#1e2433] border border-indigo-700 text-slate-200 rounded outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] text-indigo-400 font-bold mb-0.5">Colonnes</label>
              <input v-model.number="nouvellesColonnes" type="number" min="1" max="48"
                     class="w-full text-xs p-1 bg-[#1e2433] border border-indigo-700 text-slate-200 rounded outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <button @click="emit('redimensionner', nouvellesLignes, nouvellesColonnes); modeRedimensionner = false"
                    class="text-xs bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-1.5 px-3 rounded">
              Appliquer
            </button>
          </div>
          <p class="text-[10px] text-indigo-500 mt-1.5">
            ⚠️ Réduire les dimensions échouera si des fibres sont placées dans la zone supprimée.
          </p>
        </div>

        <!-- Chargement -->
        <div v-if="chargement" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent"></div>
        </div>

        <template v-else-if="odf">

          <!-- Infos câble -->
          <div v-if="odf.cable" class="mb-4 bg-[#1e293b] border border-indigo-900 rounded-lg px-3 py-2 flex items-center gap-2">
            <span class="text-indigo-400">🔌</span>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] text-indigo-500 uppercase font-bold">Câble associé</p>
              <p class="text-sm font-semibold text-indigo-300 truncate">{{ odf.cable.nom_code }}</p>
            </div>
            <span class="text-xs text-indigo-400 shrink-0">{{ odf.cable.capacite_fibres }} FO</span>
          </div>
          <div v-else class="mb-4 bg-orange-950 border border-orange-800 rounded-lg px-3 py-2">
            <p class="text-xs text-orange-400">⚠️ Aucun câble associé — impossible de placer des fibres</p>
          </div>

          <!-- Légende + dimensions -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex gap-3 text-[10px] text-slate-400">
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Avec service
              </span>
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-orange-500 inline-block"></span> Sans service
              </span>
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-[#3a4257] inline-block"></span> Vide
              </span>
            </div>
            <span class="text-[10px] text-slate-500">{{ odf.lignes }}×{{ odf.colonnes }} = {{ odf.lignes * odf.colonnes }} ports</span>
          </div>

          <!-- Bannière mode déplacement -->
          <div v-if="portSourceMouvement"
               class="mb-3 bg-amber-950 border border-amber-700 rounded-lg px-3 py-2 flex items-center justify-between">
            <p class="text-xs text-amber-300 font-medium">
              🟡 Fibre sélectionnée — cliquez un port vide pour déplacer
            </p>
            <div class="flex gap-2">
              <button @click="emit('retirerFibre', portSourceMouvement); annulerMouvement()"
                      class="text-xs text-red-400 hover:text-red-300 font-bold">Retirer</button>
              <button @click="annulerMouvement"
                      class="text-xs text-slate-400 hover:text-slate-300 font-bold">Annuler</button>
            </div>
          </div>

          <!-- Grille -->
          <div class="grid gap-1.5"
               :style="{ gridTemplateColumns: `repeat(${odf.colonnes}, 1fr)` }">
            <div v-for="port in portsTries" :key="port.id"
                 class="flex flex-col items-center gap-0.5 cursor-pointer group"
                 :title="portSourceMouvement
                   ? (port.id === portSourceMouvement ? 'Clic pour annuler' : port.fibre_port ? 'Changer la source' : 'Déplacer ici')
                   : (port.fibre_port ? `F${port.fibre_port.numero_fibre} — clic pour déplacer` : `Port vide — clic pour placer`)"
                 @click="gererClicPort(port)">
              <!-- Numéro du PORT en haut -->
              <span class="text-[8px] font-bold text-slate-500 leading-none">
                P{{ (port.ligne_port - 1) * odf.colonnes + port.colonne_port }}
              </span>
              <!-- Carreau coloré -->
              <span class="w-6 h-6 rounded flex-shrink-0 transition-all group-hover:scale-110 group-hover:z-10"
                    :class="couleurPort(port)"></span>
              <!-- Numéro de la FIBRE en bas -->
              <span class="text-[8px] font-bold leading-none"
                    :class="port.fibre_port ? 'text-slate-300' : 'text-slate-600'">
                {{ port.fibre_port ? `F${port.fibre_port.numero_fibre}` : '—' }}
              </span>
            </div>
          </div>

          <!-- Instruction -->
          <p class="mt-3 text-[10px] text-slate-500 text-center">
            <span v-if="!portSourceMouvement">Clic port occupé → sélectionner · Clic port vide → placer</span>
            <span v-else class="text-amber-400">Clic port vide → déplacer · Clic même port → annuler</span>
          </p>

          <!-- Fibres brassées + traçage -->
          <div v-if="portsTries.some(p => p.fibre_port)" class="mt-4 space-y-1">
            <h4 class="text-[10px] font-bold text-slate-400 uppercase mb-2">Fibres brassées</h4>
            <div v-for="port in portsTries.filter(p => p.fibre_port)" :key="port.id"
                 class="flex items-center gap-2 text-xs bg-[#252c3d] border border-[#3a4257] rounded px-2 py-1">
              <span class="text-slate-500 w-10 shrink-0 text-[10px]">
                P{{ (port.ligne_port - 1) * odf.colonnes + port.colonne_port }}
              </span>
              <span class="w-2.5 h-2.5 rounded-full shrink-0"
                    :style="{ backgroundColor: port.fibre_port!.code_couleur_hex ?? '#9ca3af' }"></span>
              <span class="text-slate-300 flex-1 truncate">
                F{{ port.fibre_port!.numero_fibre }}
                <span v-if="port.fibre_port!.etiquette" class="text-slate-500"> — {{ port.fibre_port!.etiquette }}</span>
              </span>
              <button v-if="port.fibre_port"
                      @click.stop="emit('tracerFibre', port.fibre_port)"
                      class="text-[10px] px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded">
                🔍 Tracer
              </button>
            </div>
          </div>

        </template>
      </div>
    </div>
  </transition>
</template>
