<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NomFenetre } from '../../composables/useDrag'

// ============================================================
// Ce composant reçoit :
// - noeudId    : l'UUID du nœud MANCHON/CHAMBRE concerné
// - noeudNom   : le nom du nœud (pour l'affichage)
// - cablesDisponibles : les câbles qui passent dans cette chambre
// ============================================================

const props = defineProps<{
  visible: boolean
  position: { x: number; y: number }
  noeudId: string
  noeudNom: string
  cablesDisponibles: {
    id: string
    nom_code: string | null
    capacite_fibres: number | null
    technologie_transport: string | null
    longueur_reelle_metres: string | number | null
  }[]
  chargement: boolean
}>()

const emit = defineEmits<{
  close: []
  startDrag: [event: MouseEvent, fenetre: NomFenetre]
  creer: [payload: {
    nom_reference: string
    nombre_cassettes: number | null
    cables_ids: string[]
  }]
}>()

// ============================================================
// ÉTAT LOCAL DU FORMULAIRE
// ============================================================
const nomManchon = ref('')
const nombreCassettes = ref<number | null>(null)
const cablesSelectionnes = ref<string[]>([])

// ============================================================
// COMPUTED
// ============================================================
const formulaireValide = computed(() =>
  nomManchon.value.trim().length > 0
)

const modeAttente = computed(() =>
  cablesSelectionnes.value.length === 0
)

// ============================================================
// ACTIONS
// ============================================================
const toggleCable = (cableId: string) => {
  const index = cablesSelectionnes.value.indexOf(cableId)
  if (index === -1) {
    cablesSelectionnes.value.push(cableId)
  } else {
    cablesSelectionnes.value.splice(index, 1)
  }
}

const estSelectionne = (cableId: string) =>
  cablesSelectionnes.value.includes(cableId)

const valider = () => {
  if (!formulaireValide.value) return
  emit('creer', {
    nom_reference: nomManchon.value.trim(),
    nombre_cassettes: nombreCassettes.value,
    cables_ids: cablesSelectionnes.value,
  })
  // Réinitialiser le formulaire
  nomManchon.value = ''
  nombreCassettes.value = null
  cablesSelectionnes.value = []
}

const formaterLongueur = (v: string | number | null | undefined) => {
  if (!v) return 'N/A'
  const n = Number(v)
  if (isNaN(n)) return 'N/A'
  return n >= 1000 ? (n / 1000).toFixed(2) + ' km' : n.toFixed(0) + ' m'
}
</script>

<template>
  <transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 scale-95 translate-y-2"
    enter-to-class="opacity-100 scale-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 scale-100 translate-y-0"
    leave-to-class="opacity-0 scale-95 translate-y-2"
  >
    <div v-if="visible"
         class="absolute z-[5500] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
         style="width: 380px; max-height: 80vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- BARRE TITRE DRAGGABLE -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'ajouterManchon')"
           class="bg-amber-500 px-4 py-3 cursor-move flex justify-between items-center select-none">
        <h3 class="text-white text-sm font-bold flex items-center gap-2">
          🔶 Nouveau manchon
          <span class="text-amber-100 font-normal text-xs">— {{ noeudNom }}</span>
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-amber-200 hover:text-white text-xl font-bold leading-none p-1">
          &times;
        </button>
      </div>

      <!-- CONTENU -->
      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4" @mousedown.stop>

        <!-- Chargement -->
        <div v-if="chargement" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
        </div>

        <template v-else>

          <!-- Nom du manchon -->
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">
              Nom / Référence du manchon <span class="text-red-500">*</span>
            </label>
            <input
              v-model="nomManchon"
              type="text"
              placeholder="Ex: BPEO-CH5-01"
              class="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
              autofocus
            />
          </div>

          <!-- Nombre de cassettes -->
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">
              Nombre de cassettes
              <span class="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <select
              v-model="nombreCassettes"
              class="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
            >
              <option :value="null">-- Non défini --</option>
              <option v-for="n in [1, 2, 3, 4, 6]" :key="n" :value="n">
                {{ n }} cassette(s)
              </option>
            </select>
          </div>

          <!-- Sélection des câbles -->
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">
              Câbles à connecter
              <span class="text-gray-400 font-normal">(optionnel)</span>
            </label>

            <!-- Indicateur mode attente -->
            <div v-if="modeAttente"
                 class="mb-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <p class="text-xs text-orange-700 flex items-center gap-2">
                <span>⏳</span>
                Aucun câble sélectionné — le manchon sera créé
                <b>en attente de câbles</b>
              </p>
            </div>

            <!-- Liste des câbles disponibles -->
            <div v-if="cablesDisponibles.length > 0" class="space-y-2">
              <div
                v-for="cable in cablesDisponibles"
                :key="cable.id"
                @click="toggleCable(cable.id)"
                class="flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all"
                :class="estSelectionne(cable.id)
                  ? 'border-amber-400 bg-amber-50 shadow-sm'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'"
              >
                <!-- Checkbox visuelle -->
                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                     :class="estSelectionne(cable.id)
                       ? 'border-amber-500 bg-amber-500'
                       : 'border-gray-300 bg-white'">
                  <span v-if="estSelectionne(cable.id)" class="text-white text-xs font-bold">✓</span>
                </div>

                <!-- Infos câble -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 truncate">
                    {{ cable.nom_code || 'Câble sans nom' }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ cable.capacite_fibres }} FO
                    · {{ cable.technologie_transport || 'N/A' }}
                    · {{ formaterLongueur(cable.longueur_reelle_metres) }}
                  </p>
                </div>

                <!-- Badge sélectionné -->
                <span v-if="estSelectionne(cable.id)"
                      class="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                  Sélectionné
                </span>
              </div>
            </div>

            <!-- Aucun câble disponible -->
            <div v-else class="bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300 text-center">
              <p class="text-xs text-gray-400">Aucun câble ne passe par cette chambre</p>
              <p class="text-xs text-gray-400 mt-1">Le manchon sera créé en attente de câbles</p>
            </div>
          </div>

          <!-- Résumé -->
          <div class="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs text-gray-600">
            <p class="font-bold text-gray-700 mb-1">Résumé</p>
            <p>📋 Nom : <b>{{ nomManchon || '—' }}</b></p>
            <p>🔌 Câbles : <b>{{ cablesSelectionnes.length }}</b> sélectionné(s)</p>
            <p>📦 Cassettes : <b>{{ nombreCassettes ?? 'Non défini' }}</b></p>
            <p class="mt-1 text-amber-600 font-medium">
              {{ modeAttente ? '⏳ Sera créé en attente de câbles' : '✅ Prêt à créer avec soudures vides' }}
            </p>
          </div>

        </template>
      </div>

      <!-- BOUTONS -->
      <div class="p-3 border-t border-gray-200 bg-gray-50 flex gap-2 justify-end" @mousedown.stop>
        <button
          @click="emit('close')"
          class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Annuler
        </button>
        <button
          @click="valider"
          :disabled="!formulaireValide"
          class="px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors"
          :class="formulaireValide
            ? 'bg-amber-500 hover:bg-amber-600 shadow-sm'
            : 'bg-gray-300 cursor-not-allowed'"
        >
          {{ modeAttente ? '⏳ Créer en attente' : '🔶 Créer le manchon' }}
        </button>
      </div>
    </div>
  </transition>
</template>