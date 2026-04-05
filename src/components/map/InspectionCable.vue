<script setup lang="ts">
import type { CableInspection, Fibre } from '../../types/map'
import { DICTIONNAIRE_COULEURS, getStyleFibre } from '../../composables/useCables'
import type { NomFenetre } from '../../composables/useDrag'

const props = defineProps<{
  visible: boolean
  cable: CableInspection | null
  chargement: boolean
  position: { x: number; y: number }
  fibresParTube: Record<number, Fibre[]>
  structureCable: string
}>()

const emit = defineEmits<{
  close: []
  startDrag: [event: MouseEvent, fenetre: NomFenetre]
}>()

const getCouleurTube = (numeroTube: number, cable: CableInspection | null) => {
  const norme = cable?.norme_details
  const sequence = norme?.sequence_couleurs
    || ["Bleu","Orange","Vert","Marron","Gris","Blanc","Rouge","Noir","Jaune","Violet","Rose","Turquoise"]
  const nomCouleur = sequence[(numeroTube - 1) % sequence.length]
  return { nom: nomCouleur, style: DICTIONNAIRE_COULEURS[nomCouleur] || DICTIONNAIRE_COULEURS["INCONNUE"] }
}

const formaterLongueur = (v: number | string | null | undefined) => {
  if (v === null || v === undefined) return 'N/A'
  const n = Number(v)
  if (isNaN(n)) return 'N/A'
  return n >= 1000 ? (n / 1000).toFixed(2) + ' km' : n.toFixed(0) + ' m'
}
</script>

<template>
  <transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-150"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="visible"
         class="absolute z-[4500] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden pointer-events-auto"
         style="width: 420px; max-height: 80vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- Barre titre draggable -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'inspection')"
           class="bg-blue-600 px-4 py-2 cursor-move flex justify-between items-center select-none">
        <h3 class="text-white text-sm font-bold flex items-center gap-2">
          <span>🔍</span> Inspection Câble
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-blue-200 hover:text-white text-xl font-bold leading-none p-1">&times;</button>
      </div>

      <!-- Contenu -->
      <div class="flex-1 overflow-y-auto" @mousedown.stop>

        <!-- Chargement -->
        <div v-if="chargement" class="p-8 text-center">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p class="text-gray-500 text-sm mt-3">Chargement des fibres...</p>
        </div>

        <!-- Détail câble -->
        <div v-else-if="cable" class="p-4">

          <!-- En-tête -->
          <div class="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
            <h4 class="font-bold text-blue-800 text-lg">{{ cable.nom_code }}</h4>
            <div class="grid grid-cols-2 gap-2 mt-2 text-xs text-blue-700">
              <p><b>Capacité:</b> {{ cable.capacite_fibres }} fibres
                <span v-if="structureCable" class="text-blue-500">({{ structureCable }})</span>
              </p>
              <p><b>Longueur:</b> {{ formaterLongueur(cable.longueur_reelle_metres) }}</p>
              <p><b>Départ:</b> {{ cable.noeud_depart_nom || 'N/A' }}</p>
              <p><b>Arrivée:</b> {{ cable.noeud_fin_nom || 'N/A' }}</p>
            </div>
          </div>

          <!-- Norme couleurs -->
          <div v-if="cable.norme_details" class="mb-4">
            <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">
              Norme: {{ cable.norme_details.code }}
            </h5>
            <div class="flex flex-wrap gap-1">
              <span v-for="(couleur, index) in cable.norme_details.sequence_couleurs" :key="index"
                    class="w-5 h-5 rounded-full shadow-sm"
                    :style="{
                      backgroundColor: DICTIONNAIRE_COULEURS[couleur]?.bg || '#9ca3af',
                      borderWidth: '2px',
                      borderStyle: DICTIONNAIRE_COULEURS[couleur]?.isDashed ? 'dashed' : 'solid',
                      borderColor: DICTIONNAIRE_COULEURS[couleur]?.border || 'transparent'
                    }"
                    :title="couleur">
              </span>
            </div>
          </div>

          <!-- Fibres par tube -->
          <div class="space-y-3">
            <div v-for="(fibres, numeroTube) in fibresParTube" :key="numeroTube"
                 class="rounded-lg p-3 border-2"
                 :style="{
                   backgroundColor: getCouleurTube(Number(numeroTube), cable).style.bg + '15',
                   borderColor: getCouleurTube(Number(numeroTube), cable).style.bg
                 }">

              <h5 class="text-xs font-bold uppercase mb-2 flex items-center gap-2">
                <span class="w-4 h-4 rounded-full shadow-sm"
                      :style="{
                        backgroundColor: getCouleurTube(Number(numeroTube), cable).style.bg,
                        borderWidth: '1px',
                        borderStyle: getCouleurTube(Number(numeroTube), cable).style.isDashed ? 'dashed' : 'solid',
                        borderColor: getCouleurTube(Number(numeroTube), cable).style.border || 'white'
                      }">
                </span>
                <span class="text-gray-700">Tube {{ numeroTube }}</span>
                <span class="text-gray-400 font-normal">({{ getCouleurTube(Number(numeroTube), cable).nom }})</span>
                <span class="text-gray-400 font-normal ml-auto">{{ fibres.length }} fibres</span>
              </h5>

              <!-- Grille fibres -->
              <div class="grid grid-cols-6 gap-1.5">
                <div v-for="fibre in fibres" :key="fibre.id" class="relative group">
                  <div class="w-8 h-8 rounded-full shadow-md flex items-center justify-center text-[10px] font-bold cursor-pointer transition-transform hover:scale-110"
                       :style="{
                         backgroundColor: getStyleFibre(fibre, cable.norme_details).bg,
                         borderWidth: '2px',
                         borderStyle: getStyleFibre(fibre, cable.norme_details).isDashed ? 'dashed' : 'solid',
                         borderColor: getStyleFibre(fibre, cable.norme_details).border || 'white'
                       }"
                       :class="{
                         'text-white': ['Bleu','Vert','Rouge','Violet','Noir','Marron'].includes(fibre.code_couleur_hex || ''),
                         'text-gray-800': !['Bleu','Vert','Rouge','Violet','Noir','Marron'].includes(fibre.code_couleur_hex || '')
                       }">
                    {{ fibre.numero_fibre }}
                  </div>
                  <!-- Tooltip -->
                  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    F{{ fibre.numero_fibre }} - {{ fibre.code_couleur_hex || 'Inconnue' }}
                    <span v-if="fibre.etat" class="text-gray-400">({{ fibre.etat }})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Aucune fibre -->
          <div v-if="cable.fibres.length === 0" class="text-center py-8 text-gray-400">
            <p class="text-4xl mb-2">📭</p>
            <p class="text-sm">Aucune fibre enregistrée pour ce câble</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
