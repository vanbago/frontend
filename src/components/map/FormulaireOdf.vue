<script setup lang="ts">
import type { NomFenetre } from '../../composables/useDrag'

defineProps<{
  visible: boolean
  position: { x: number; y: number }
  noeudNom: string
  cableNom: string
  formulaire: { nom_reference: string; lignes: number; colonnes: number }
  chargement: boolean
}>()

const emit = defineEmits<{
  close: []
  startDrag: [event: MouseEvent, fenetre: NomFenetre]
  creer: []
}>()
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
         style="width: 340px;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- BARRE TITRE DRAGGABLE -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'creationOdf')"
           class="bg-purple-600 px-4 py-3 cursor-move flex justify-between items-center select-none">
        <h3 class="text-white text-sm font-bold flex items-center gap-2">
          📋 Nouvel ODF
          <span class="text-purple-200 font-normal text-xs">— {{ noeudNom }}</span>
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-purple-200 hover:text-white text-xl font-bold leading-none p-1">
          &times;
        </button>
      </div>

      <!-- CONTENU -->
      <div class="p-4 flex flex-col gap-4" @mousedown.stop>

        <!-- Câble associé (lecture seule) -->
        <div class="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <span class="text-indigo-500">🔌</span>
          <div>
            <p class="text-[10px] text-indigo-400 uppercase font-bold">Câble associé</p>
            <p class="text-sm font-semibold text-indigo-800">{{ cableNom || 'Câble sélectionné' }}</p>
          </div>
        </div>

        <!-- Nom de l'ODF -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">
            Nom / Référence <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formulaire.nom_reference"
            type="text"
            placeholder="Ex: ODF-CENTRE-01"
            class="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
            autofocus
          />
        </div>

        <!-- Grille lignes × colonnes -->
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="block text-xs font-bold text-gray-700 mb-1">Lignes</label>
            <select v-model="formulaire.lignes"
                    class="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none">
              <option v-for="n in 12" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-bold text-gray-700 mb-1">Colonnes <span class="text-gray-400 font-normal">(max 12)</span></label>
            <select v-model="formulaire.colonnes"
                    class="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none">
              <option v-for="n in 12" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>

        <!-- Résumé -->
        <div class="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs text-gray-600">
          <p class="font-bold text-gray-700 mb-1">Résumé</p>
          <p>📋 Nom : <b>{{ formulaire.nom_reference || '—' }}</b></p>
          <p>🔲 Grille : <b>{{ formulaire.lignes }} × {{ formulaire.colonnes }}</b>
            = <b>{{ formulaire.lignes * formulaire.colonnes }}</b> ports
          </p>
        </div>
      </div>

      <!-- BOUTONS -->
      <div class="px-4 pb-4 flex gap-2 justify-end" @mousedown.stop>
        <button @click="emit('close')"
                class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
          Annuler
        </button>
        <button @click="emit('creer')"
                :disabled="!formulaire.nom_reference.trim() || chargement"
                class="px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors"
                :class="formulaire.nom_reference.trim() && !chargement
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-sm'
                  : 'bg-gray-300 cursor-not-allowed'">
          <span v-if="chargement">⏳ Création...</span>
          <span v-else>📋 Créer l'ODF</span>
        </button>
      </div>
    </div>
  </transition>
</template>
