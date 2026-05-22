<script setup lang="ts">
import type { Fibre } from '../../types/map'
import type { NomFenetre } from '../../composables/useDrag'
import { DICTIONNAIRE_COULEURS } from '../../composables/useCables'

defineProps<{
  visible: boolean
  position: { x: number; y: number }
  fibres: Fibre[]
  chargement: boolean
}>()

const emit = defineEmits<{
  choisir:   [fibreId: string]
  close:     []
  startDrag: [event: MouseEvent, fenetre: NomFenetre]
}>()

const couleurBg = (code: string | null) =>
  DICTIONNAIRE_COULEURS[code ?? 'INCONNUE']?.bg ?? '#9ca3af'
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
         class="absolute z-[5600] bg-[#1e2433] rounded-xl shadow-2xl border border-[#2d3448] flex flex-col overflow-hidden"
         style="width: 300px; max-height: 70vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }"
         @mousedown.stop @click.stop>

      <!-- TITRE DRAGGABLE -->
      <div @mousedown.stop.prevent="emit('startDrag', $event, 'pickerFibre')"
           class="bg-indigo-700 px-4 py-3 cursor-move flex justify-between items-center select-none">
        <h3 class="text-white text-sm font-bold flex items-center gap-2">
          🔌 Choisir une fibre libre
        </h3>
        <button @mousedown.stop @click.stop="emit('close')"
                class="text-indigo-200 hover:text-white text-xl font-bold leading-none p-1">&times;</button>
      </div>

      <!-- CORPS -->
      <div class="flex-1 overflow-y-auto p-3" @mousedown.stop>

        <div v-if="chargement" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
        </div>

        <div v-else-if="fibres.length === 0" class="text-center py-6 text-slate-500">
          <p class="text-3xl mb-2">😶</p>
          <p class="text-xs">Aucune fibre libre dans ce câble</p>
        </div>

        <div v-else class="space-y-1">
          <button
            v-for="fibre in fibres" :key="fibre.id"
            @click="emit('choisir', fibre.id)"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-[#252c3d] hover:bg-[#2d3a52] border border-[#3a4257] hover:border-indigo-600 transition-colors text-left"
          >
            <span class="w-4 h-4 rounded-full shrink-0 border border-slate-600"
                  :style="{ backgroundColor: couleurBg(fibre.code_couleur_hex) }"></span>
            <span class="text-sm font-semibold text-slate-200">
              T{{ fibre.numero_tube }} — F{{ fibre.numero_fibre }}
            </span>
            <span class="ml-auto text-[10px] text-slate-500 truncate">{{ fibre.code_couleur_hex ?? '—' }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
