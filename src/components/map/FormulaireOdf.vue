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
         class="absolute z-[5500] bg-[#1e2433] rounded-xl shadow-2xl border border-[#2d3448] flex flex-col overflow-hidden"
         style="width: 340px;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- BARRE TITRE DRAGGABLE -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'creationOdf')"
           class="bg-purple-800 px-4 py-3 cursor-move flex justify-between items-center select-none">
        <h3 class="text-white text-sm font-bold flex items-center gap-2">
          📋 Nouvel ODF
          <span class="text-purple-300 font-normal text-xs">— {{ noeudNom }}</span>
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-purple-300 hover:text-white text-xl font-bold leading-none p-1">&times;</button>
      </div>

      <!-- CONTENU -->
      <div class="p-4 flex flex-col gap-4" @mousedown.stop>

        <!-- Câble associé (lecture seule) -->
        <div class="bg-[#1e293b] border border-indigo-900 rounded-lg px-3 py-2 flex items-center gap-2">
          <span class="text-indigo-400">🔌</span>
          <div>
            <p class="text-[10px] text-indigo-500 uppercase font-bold">Câble associé</p>
            <p class="text-sm font-semibold text-indigo-300">{{ cableNom || 'Câble sélectionné' }}</p>
          </div>
        </div>

        <!-- Nom de l'ODF -->
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">
            Nom / Référence <span class="text-red-400">*</span>
          </label>
          <input
            v-model="formulaire.nom_reference"
            type="text"
            placeholder="Ex: ODF-CENTRE-01"
            class="w-full text-sm p-2 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-600"
            autofocus
          />
        </div>

        <!-- Grille lignes × colonnes -->
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="block text-xs font-bold text-slate-300 mb-1">Lignes</label>
            <select v-model="formulaire.lignes"
                    class="w-full text-sm p-2 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
              <option v-for="n in 12" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-bold text-slate-300 mb-1">Colonnes <span class="text-slate-500 font-normal">(max 12)</span></label>
            <select v-model="formulaire.colonnes"
                    class="w-full text-sm p-2 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
              <option v-for="n in 12" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>

        <!-- Résumé -->
        <div class="bg-[#252c3d] rounded-lg p-3 border border-[#3a4257] text-xs text-slate-400">
          <p class="font-bold text-slate-300 mb-1">Résumé</p>
          <p>📋 Nom : <b class="text-slate-200">{{ formulaire.nom_reference || '—' }}</b></p>
          <p>🔲 Grille : <b class="text-slate-200">{{ formulaire.lignes }} × {{ formulaire.colonnes }}</b>
            = <b class="text-slate-200">{{ formulaire.lignes * formulaire.colonnes }}</b> ports
          </p>
        </div>
      </div>

      <!-- BOUTONS -->
      <div class="px-4 pb-4 flex gap-2 justify-end" @mousedown.stop>
        <button @click="emit('close')"
                class="px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1e2433] border border-[#3a4257] rounded-lg hover:bg-[#2d3448] transition-colors">
          Annuler
        </button>
        <button @click="emit('creer')"
                :disabled="!formulaire.nom_reference.trim() || chargement"
                class="px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors"
                :class="formulaire.nom_reference.trim() && !chargement
                  ? 'bg-purple-700 hover:bg-purple-600 shadow-sm'
                  : 'bg-[#3a4257] cursor-not-allowed text-slate-500'">
          <span v-if="chargement">⏳ Création...</span>
          <span v-else>📋 Créer l'ODF</span>
        </button>
      </div>
    </div>
  </transition>
</template>
