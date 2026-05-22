<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NomFenetre } from '../../composables/useDrag'

defineProps<{
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

const nomManchon       = ref('')
const nombreCassettes  = ref<number | null>(null)
const cablesSelectionnes = ref<string[]>([])

const formulaireValide = computed(() => nomManchon.value.trim().length > 0)
const modeAttente      = computed(() => cablesSelectionnes.value.length === 0)

const toggleCable = (cableId: string) => {
  const index = cablesSelectionnes.value.indexOf(cableId)
  if (index === -1) cablesSelectionnes.value.push(cableId)
  else              cablesSelectionnes.value.splice(index, 1)
}

const estSelectionne = (cableId: string) => cablesSelectionnes.value.includes(cableId)

const valider = () => {
  if (!formulaireValide.value) return
  emit('creer', {
    nom_reference:    nomManchon.value.trim(),
    nombre_cassettes: nombreCassettes.value,
    cables_ids:       cablesSelectionnes.value,
  })
  nomManchon.value       = ''
  nombreCassettes.value  = null
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
         class="absolute z-[5500] bg-[#1e2433] rounded-xl shadow-2xl border border-[#2d3448] flex flex-col overflow-hidden"
         style="width: 380px; max-height: 80vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- BARRE TITRE DRAGGABLE -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'ajouterManchon')"
           class="bg-amber-700 px-4 py-3 cursor-move flex justify-between items-center select-none">
        <h3 class="text-white text-sm font-bold flex items-center gap-2">
          🔶 Nouveau manchon
          <span class="text-amber-200 font-normal text-xs">— {{ noeudNom }}</span>
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-amber-200 hover:text-white text-xl font-bold leading-none p-1">&times;</button>
      </div>

      <!-- CONTENU -->
      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4" @mousedown.stop>

        <div v-if="chargement" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
        </div>

        <template v-else>

          <!-- Nom du manchon -->
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1">
              Nom / Référence du manchon <span class="text-red-400">*</span>
            </label>
            <input
              v-model="nomManchon"
              type="text"
              placeholder="Ex: BPEO-CH5-01"
              class="w-full text-sm p-2 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none placeholder-slate-600"
              autofocus
            />
          </div>

          <!-- Nombre de cassettes -->
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1">
              Nombre de cassettes
              <span class="text-slate-500 font-normal">(optionnel)</span>
            </label>
            <select
              v-model="nombreCassettes"
              class="w-full text-sm p-2 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option :value="null">-- Non défini --</option>
              <option v-for="n in [1, 2, 3, 4, 6]" :key="n" :value="n">{{ n }} cassette(s)</option>
            </select>
          </div>

          <!-- Sélection des câbles -->
          <div>
            <label class="block text-xs font-bold text-slate-300 mb-1">
              Câbles à connecter
              <span class="text-slate-500 font-normal">(optionnel)</span>
            </label>

            <div v-if="modeAttente"
                 class="mb-2 bg-orange-950 border border-orange-800 rounded-lg px-3 py-2">
              <p class="text-xs text-orange-400 flex items-center gap-2">
                <span>⏳</span>
                Aucun câble sélectionné — le manchon sera créé <b>en attente de câbles</b>
              </p>
            </div>

            <div v-if="cablesDisponibles.length > 0" class="space-y-2">
              <div
                v-for="cable in cablesDisponibles"
                :key="cable.id"
                @click="toggleCable(cable.id)"
                class="flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all"
                :class="estSelectionne(cable.id)
                  ? 'border-amber-500 bg-amber-950 shadow-sm'
                  : 'border-[#3a4257] bg-[#252c3d] hover:border-[#4a5568]'"
              >
                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                     :class="estSelectionne(cable.id) ? 'border-amber-500 bg-amber-500' : 'border-[#3a4257] bg-[#1e2433]'">
                  <span v-if="estSelectionne(cable.id)" class="text-white text-xs font-bold">✓</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-200 truncate">{{ cable.nom_code || 'Câble sans nom' }}</p>
                  <p class="text-xs text-slate-400">
                    {{ cable.capacite_fibres }} FO · {{ cable.technologie_transport || 'N/A' }} · {{ formaterLongueur(cable.longueur_reelle_metres) }}
                  </p>
                </div>
                <span v-if="estSelectionne(cable.id)"
                      class="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                  Sélectionné
                </span>
              </div>
            </div>

            <div v-else class="bg-[#252c3d] rounded-lg p-3 border border-dashed border-[#3a4257] text-center">
              <p class="text-xs text-slate-500">Aucun câble ne passe par cette chambre</p>
              <p class="text-xs text-slate-500 mt-1">Le manchon sera créé en attente de câbles</p>
            </div>
          </div>

          <!-- Résumé -->
          <div class="bg-[#252c3d] rounded-lg p-3 border border-[#3a4257] text-xs text-slate-400">
            <p class="font-bold text-slate-300 mb-1">Résumé</p>
            <p>📋 Nom : <b class="text-slate-200">{{ nomManchon || '—' }}</b></p>
            <p>🔌 Câbles : <b class="text-slate-200">{{ cablesSelectionnes.length }}</b> sélectionné(s)</p>
            <p>📦 Cassettes : <b class="text-slate-200">{{ nombreCassettes ?? 'Non défini' }}</b></p>
            <p class="mt-1 font-medium" :class="modeAttente ? 'text-amber-400' : 'text-emerald-400'">
              {{ modeAttente ? '⏳ Sera créé en attente de câbles' : '✅ Prêt à créer avec soudures vides' }}
            </p>
          </div>

        </template>
      </div>

      <!-- BOUTONS -->
      <div class="p-3 border-t border-[#2d3448] bg-[#252c3d] flex gap-2 justify-end" @mousedown.stop>
        <button
          @click="emit('close')"
          class="px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1e2433] border border-[#3a4257] rounded-lg hover:bg-[#2d3448] transition-colors"
        >
          Annuler
        </button>
        <button
          @click="valider"
          :disabled="!formulaireValide"
          class="px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors"
          :class="formulaireValide ? 'bg-amber-600 hover:bg-amber-500 shadow-sm' : 'bg-[#3a4257] cursor-not-allowed text-slate-500'"
        >
          {{ modeAttente ? '⏳ Créer en attente' : '🔶 Créer le manchon' }}
        </button>
      </div>
    </div>
  </transition>
</template>
