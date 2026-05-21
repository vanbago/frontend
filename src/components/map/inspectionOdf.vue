<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OdfDetail, PortOdf } from '../../types/map'
import type { NomFenetre } from '../../composables/useDrag'

const props = defineProps<{
  odf: OdfDetail | null
  chargement: boolean
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  placerFibre:   [portId: string]
  retirerFibre:  [portId: string]
  deplacerFibre: [portSourceId: string, portDestId: string]
  fermer:        []
  startDrag:     [event: MouseEvent, fenetre: NomFenetre]
}>()

// ── Mode déplacement ─────────────────────────────────
const portSourceMouvement = ref<string | null>(null)

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
    return 'bg-amber-400 ring-2 ring-amber-600 text-white'
  if (!port.fibre_port)
    return 'bg-gray-200 hover:bg-purple-100 text-gray-400'
  if (!port.fibre_port.etiquette)
    return 'bg-orange-400 hover:bg-orange-500 text-white'
  return 'bg-green-500 hover:bg-green-600 text-white'
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
         class="absolute z-[5000] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
         style="width: 460px; max-height: 85vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- TITRE DRAGGABLE -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'inspectionOdf')"
           class="bg-purple-700 px-4 py-3 cursor-move flex justify-between items-center select-none">
        <h3 class="text-white text-sm font-bold flex items-center gap-2">
          📋 ODF
          <span v-if="odf" class="text-purple-200 font-normal">— {{ odf.nom_reference }}</span>
        </h3>
        <button @mousedown.stop @click.stop="emit('fermer')"
                class="text-purple-200 hover:text-white text-xl font-bold leading-none p-1">&times;</button>
      </div>

      <!-- CORPS -->
      <div class="flex-1 overflow-y-auto p-4" @mousedown.stop>

        <!-- Chargement -->
        <div v-if="chargement" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent"></div>
        </div>

        <template v-else-if="odf">

          <!-- Infos câble -->
          <div v-if="odf.cable" class="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span class="text-indigo-500">🔌</span>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] text-indigo-400 uppercase font-bold">Câble associé</p>
              <p class="text-sm font-semibold text-indigo-800 truncate">{{ odf.cable.nom_code }}</p>
            </div>
            <span class="text-xs text-indigo-600 shrink-0">{{ odf.cable.capacite_fibres }} FO</span>
          </div>
          <div v-else class="mb-4 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p class="text-xs text-orange-700">⚠️ Aucun câble associé — impossible de placer des fibres</p>
          </div>

          <!-- Légende + dimensions -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex gap-3 text-[10px] text-gray-500">
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-green-500 inline-block"></span> Avec service
              </span>
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-orange-400 inline-block"></span> Sans service
              </span>
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-gray-200 inline-block"></span> Vide
              </span>
            </div>
            <span class="text-[10px] text-gray-400">{{ odf.lignes }}×{{ odf.colonnes }} = {{ odf.lignes * odf.colonnes }} ports</span>
          </div>

          <!-- Bannière mode déplacement -->
          <div v-if="portSourceMouvement"
               class="mb-3 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 flex items-center justify-between">
            <p class="text-xs text-amber-700 font-medium">
              🟡 Fibre sélectionnée — cliquez un port vide pour déplacer
            </p>
            <div class="flex gap-2">
              <button @click="emit('retirerFibre', portSourceMouvement); annulerMouvement()"
                      class="text-xs text-red-600 hover:text-red-800 font-bold">Retirer</button>
              <button @click="annulerMouvement"
                      class="text-xs text-gray-500 hover:text-gray-700 font-bold">Annuler</button>
            </div>
          </div>

          <!-- Grille -->
          <div class="grid gap-1.5"
               :style="{ gridTemplateColumns: `repeat(${odf.colonnes}, 1fr)` }">
            <div v-for="port in portsTries" :key="port.id"
                 class="flex flex-col items-center gap-0.5 cursor-pointer group"
                 :title="portSourceMouvement
                   ? (port.id === portSourceMouvement ? 'Clic pour annuler' : port.fibre_port ? 'Changer la source' : 'Déplacer ici')
                   : (port.fibre_port ? `F${port.fibre_port.numero_fibre} — clic pour déplacer` : `Vide — clic pour placer`)"
                 @click="gererClicPort(port)">
              <!-- Carreau -->
              <span class="w-6 h-6 rounded flex-shrink-0 transition-all group-hover:scale-110 group-hover:z-10"
                    :class="couleurPort(port)"></span>
              <!-- Numéro en dessous -->
              <span class="text-[7px] text-gray-500 leading-none">
                {{ port.fibre_port?.numero_fibre ?? (port.ligne_port + '-' + port.colonne_port) }}
              </span>
            </div>
          </div>

          <!-- Instruction -->
          <p class="mt-3 text-[10px] text-gray-400 text-center">
            <span v-if="!portSourceMouvement">Clic port occupé → sélectionner · Clic port vide → placer</span>
            <span v-else class="text-amber-500">Clic port vide → déplacer · Clic même port → annuler</span>
          </p>

        </template>
      </div>
    </div>
  </transition>
</template>
