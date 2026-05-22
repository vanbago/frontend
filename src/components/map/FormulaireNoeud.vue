<script setup lang="ts">
import type { NomFenetre } from '../../composables/useDrag'

defineProps<{
  visible: boolean
  estEdition: boolean
  position: { x: number; y: number }
  formulaire: {
    nom_code: string
    type_noeud: string
    latitude: string
    longitude: string
    statut_operationnel: string
    statut_energie: string
    est_frontiere: boolean
    centre_partenaire_id: string
  }
  centresDisponibles: { id: string; nom: string }[]
}>()

const emit = defineEmits<{
  close: []
  startDrag: [event: MouseEvent, fenetre: NomFenetre]
  save: []
}>()
</script>

<template>
  <transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <div v-if="visible"
         class="absolute z-[3000] bg-[#1e2433] rounded-xl shadow-2xl border border-[#2d3448] flex flex-col overflow-hidden"
         style="width: 320px; max-height: 85vh;"
         :style="{ left: position.x + 'px', top: position.y + 'px' }">

      <!-- Barre titre draggable -->
      <div @mousedown="emit('startDrag', $event, 'creation')"
           class="bg-[#252c3d] px-4 py-3 border-b border-[#2d3448] cursor-move flex justify-between items-center select-none">
        <h3 class="font-bold text-slate-200 text-sm flex items-center gap-2">
          <span>{{ estEdition ? '✏️' : '➕' }}</span>
          {{ estEdition ? 'Modifier le Nœud' : 'Nouveau Nœud' }}
        </h3>
        <button @mousedown.stop @click="emit('close')"
                class="text-slate-400 hover:text-red-400 text-xl font-bold leading-none">&times;</button>
      </div>

      <!-- Formulaire -->
      <div class="p-4 flex-1 overflow-y-auto flex flex-col gap-3" @mousedown.stop>
        <p class="text-xs text-slate-400 mb-2 font-medium">
          Remplissez les informations du nœud à ajouter. Les coordonnées GPS sont essentielles pour l'ancrage sur la carte.
        </p>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Nom / Code du site</label>
          <input v-model="formulaire.nom_code" type="text" placeholder="Ex: CT-YAO-01"
                 class="w-full text-sm p-1.5 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none placeholder-slate-600">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Type d'infrastructure</label>
          <select v-model="formulaire.type_noeud"
                  class="w-full text-sm p-1.5 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none">
            <option value="CENTRE">Centre de Transmission</option>
            <option value="CHAMBRE">Chambre de Tirage</option>
            <option value="MANCHON">Manchon dans Chambre</option>
            <option value="MANCHON_ENTERRE">Manchon Enterré</option>
            <option value="MANCHON_AERIEN">Manchon Aérien</option>
            <option value="POTEAU">Poteau</option>
            <option value="BTS">Pylône / BTS</option>
            <option value="CLIENT">Site Client</option>
          </select>
        </div>

        <!-- Frontière -->
        <div v-if="['MANCHON','MANCHON_ENTERRE','MANCHON_AERIEN'].includes(formulaire.type_noeud)"
             class="bg-amber-950 p-3 rounded border border-amber-800">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="formulaire.est_frontiere"
                   class="w-4 h-4 text-amber-600 rounded focus:ring-amber-500">
            <span class="text-xs font-bold text-amber-400">🏁 Point frontière</span>
          </label>
          <p class="text-[10px] text-amber-500 mt-1 ml-6">Cochez si ce manchon est à la limite de votre zone</p>
          <div v-if="formulaire.est_frontiere" class="mt-3 ml-6">
            <label class="block text-xs font-bold text-amber-400 mb-1">Centre partenaire</label>
            <select v-model="formulaire.centre_partenaire_id"
                    class="w-full text-xs p-1.5 bg-[#252c3d] border border-amber-700 text-slate-200 rounded focus:ring-1 focus:ring-amber-500 outline-none">
              <option value="">-- Sélectionner --</option>
              <option v-for="centre in centresDisponibles" :key="centre.id" :value="centre.id">
                {{ centre.nom }}
              </option>
            </select>
          </div>
        </div>

        <!-- État & Énergie -->
        <div class="flex gap-2">
          <div class="flex-1">
            <label class="block text-xs font-bold text-slate-300 mb-1">État</label>
            <select v-model="formulaire.statut_operationnel"
                    class="w-full text-xs p-1.5 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded outline-none">
              <option value="PROJET">En Projet</option>
              <option value="EN_SERVICE">En Service</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-bold text-slate-300 mb-1">Énergie</label>
            <select v-model="formulaire.statut_energie"
                    class="w-full text-xs p-1.5 bg-[#252c3d] border border-[#3a4257] text-slate-200 rounded outline-none">
              <option value="PASSIF">Passif</option>
              <option value="ACTIF">Actif</option>
            </select>
          </div>
        </div>

        <!-- Coordonnées GPS -->
        <div class="bg-[#252c3d] p-2 rounded border border-[#3a4257] mt-1">
          <h4 class="text-[10px] font-bold text-slate-500 mb-2 uppercase">Coordonnées GPS</h4>
          <div class="flex gap-2">
            <div class="flex-1">
              <input v-model="formulaire.latitude" type="number" step="any" placeholder="Lat (Y)"
                     class="w-full text-xs p-1.5 bg-[#1e2433] border border-[#3a4257] text-slate-200 rounded outline-none placeholder-slate-600">
            </div>
            <div class="flex-1">
              <input v-model="formulaire.longitude" type="number" step="any" placeholder="Lng (X)"
                     class="w-full text-xs p-1.5 bg-[#1e2433] border border-[#3a4257] text-slate-200 rounded outline-none placeholder-slate-600">
            </div>
          </div>
        </div>
      </div>

      <!-- Boutons -->
      <div class="p-3 border-t border-[#2d3448] bg-[#252c3d] flex gap-2 justify-end" @mousedown.stop>
        <button @click="emit('close')"
                class="px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1e2433] border border-[#3a4257] rounded hover:bg-[#2d3448]">
          Annuler
        </button>
        <button @click="emit('save')"
                class="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 rounded hover:bg-emerald-600 shadow-sm">
          {{ estEdition ? 'Enregistrer' : 'Créer Nœud' }}
        </button>
      </div>
    </div>
  </transition>
</template>
