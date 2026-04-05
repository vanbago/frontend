<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReseauStore } from './stores/reseau'

const store = useReseauStore()

// ============================================================
// ONGLETS
// ============================================================
type Onglet = 'cables' | 'noeuds'
const ongletActif = ref<Onglet>('cables')

// ============================================================
// FILTRES & RECHERCHE
// ============================================================

const rechercheCable = ref('')
const filtreStatutCable = ref('')

const rechercheNoeud = ref('')
const filtreTypeNoeud = ref('')

// ============================================================
// DONNÉES FILTRÉES
// ============================================================

const cablesFiltres = computed(() => {
  return store.cables.filter(cable => {
    const correspondRecherche = !rechercheCable.value ||
      cable.nom_code?.toLowerCase().includes(rechercheCable.value.toLowerCase())
    const correspondStatut = !filtreStatutCable.value ||
      cable.statut_physique === filtreStatutCable.value
    return correspondRecherche && correspondStatut
  })
})

const noeudsFiltres = computed(() => {
  return store.noeuds.filter(noeud => {
    const correspondRecherche = !rechercheNoeud.value ||
      noeud.nom_code?.toLowerCase().includes(rechercheNoeud.value.toLowerCase())
    const correspondType = !filtreTypeNoeud.value ||
      noeud.type_noeud === filtreTypeNoeud.value
    return correspondRecherche && correspondType
  })
})

// ============================================================
// HELPERS D'AFFICHAGE
// ============================================================

const formaterLongueur = (metres: number | null | undefined) => {
  if (!metres) return 'N/A'
  return metres >= 1000
    ? (metres / 1000).toFixed(2) + ' km'
    : Number(metres).toFixed(0) + ' m'
}

const badgeStatutCable = (statut: string | null) => {
  switch (statut) {
    case 'EN_SERVICE':   return 'bg-emerald-100 text-emerald-700'
    case 'PROJET':       return 'bg-blue-100 text-blue-700'
    case 'HORS_SERVICE': return 'bg-red-100 text-red-700'
    default:             return 'bg-gray-100 text-gray-600'
  }
}

const badgeTypeNoeud = (type: string) => {
  const map: Record<string, string> = {
    CENTRE:          'bg-red-100 text-red-700',
    BTS:             'bg-cyan-100 text-cyan-700',
    CHAMBRE:         'bg-blue-100 text-blue-700',
    MANCHON:         'bg-amber-100 text-amber-700',
    MANCHON_ENTERRE: 'bg-stone-100 text-stone-700',
    MANCHON_AERIEN:  'bg-violet-100 text-violet-700',
    POTEAU:          'bg-lime-100 text-lime-700',
    CLIENT:          'bg-pink-100 text-pink-700',
  }
  return map[type] || 'bg-gray-100 text-gray-600'
}

const iconeNoeud = (type: string) => {
  const map: Record<string, string> = {
    CENTRE: '🏢', BTS: '📡', CHAMBRE: '⬛',
    MANCHON: '🔶', MANCHON_ENTERRE: '🔽',
    MANCHON_AERIEN: '🔼', POTEAU: '🪵', CLIENT: '🏠'
  }
  return map[type] || '🖧'
}

// ============================================================
// CHARGEMENT
// ============================================================
onMounted(async () => {
  if (store.cables.length === 0 || store.noeuds.length === 0) {
    await store.chargerInfrastructure()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 font-sans">

    <!-- EN-TÊTE -->
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <router-link to="/" class="text-gray-400 hover:text-gray-700 transition text-sm">
          ← Retour à la carte
        </router-link>
        <span class="text-gray-300">|</span>
        <h1 class="text-lg font-bold text-gray-800">📋 Inventaire du Réseau</h1>
      </div>
      <button
        @click="store.chargerInfrastructure()"
        class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
        :disabled="store.chargementCables || store.chargementNoeuds"
      >
        <span :class="{ 'animate-spin': store.chargementCables || store.chargementNoeuds }">🔄</span>
        Actualiser
      </button>
    </header>

    <main class="p-6 max-w-7xl mx-auto">

      <!-- STATISTIQUES -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Câbles</p>
          <p class="text-3xl font-black text-blue-600">{{ store.totalCables }}</p>
          <p class="text-xs text-gray-400 mt-1">sections enregistrées</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nœuds</p>
          <p class="text-3xl font-black text-emerald-600">{{ store.totalNoeuds }}</p>
          <p class="text-xs text-gray-400 mt-1">points d'infrastructure</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Capacité</p>
          <p class="text-3xl font-black text-violet-600">{{ store.capaciteTotale.toLocaleString() }}</p>
          <p class="text-xs text-gray-400 mt-1">fibres au total</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Centres</p>
          <p class="text-3xl font-black text-red-600">{{ store.noeudsByType['CENTRE']?.length || 0 }}</p>
          <p class="text-xs text-gray-400 mt-1">sites de transmission</p>
        </div>
      </div>

      <!-- ONGLETS -->
      <div class="flex gap-1 mb-4 border-b border-gray-200">
        <button
          @click="ongletActif = 'cables'"
          class="px-4 py-2 text-sm font-medium transition border-b-2 -mb-px"
          :class="ongletActif === 'cables'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          🔌 Câbles
          <span class="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
            {{ cablesFiltres.length }}
          </span>
        </button>
        <button
          @click="ongletActif = 'noeuds'"
          class="px-4 py-2 text-sm font-medium transition border-b-2 -mb-px"
          :class="ongletActif === 'noeuds'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          🖧 Nœuds
          <span class="ml-1.5 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">
            {{ noeudsFiltres.length }}
          </span>
        </button>
      </div>

      <!-- TABLEAU CÂBLES -->
      <div v-if="ongletActif === 'cables'" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <input v-model="rechercheCable" type="text" placeholder="🔍 Rechercher un câble..."
                 class="flex-1 min-w-[200px] text-sm px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:border-blue-400"/>
          <select v-model="filtreStatutCable"
                  class="text-sm px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:border-blue-400">
            <option value="">Tous les statuts</option>
            <option value="EN_SERVICE">En service</option>
            <option value="PROJET">En projet</option>
            <option value="HORS_SERVICE">Hors service</option>
          </select>
        </div>

        <div v-if="store.chargementCables" class="py-16 text-center text-gray-400">
          <div class="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          Chargement des câbles...
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Nom / Code</th>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Capacité</th>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Longueur</th>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Technologie</th>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="cable in cablesFiltres" :key="cable.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-medium text-gray-800">{{ cable.nom_code || '—' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ cable.capacite_fibres ?? '—' }} FO</td>
                <td class="px-4 py-3 text-gray-600">{{ formaterLongueur(cable.longueur_reelle_metres) }}</td>
                <td class="px-4 py-3 text-gray-600">{{ cable.technologie_transport || '—' }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="badgeStatutCable(cable.statut_physique)">
                    {{ cable.statut_physique || 'N/A' }}
                  </span>
                </td>
              </tr>
              <tr v-if="cablesFiltres.length === 0">
                <td colspan="5" class="px-4 py-12 text-center text-gray-400">
                  <p class="text-3xl mb-2">📭</p>
                  <p>Aucun câble ne correspond aux filtres</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TABLEAU NŒUDS -->
      <div v-if="ongletActif === 'noeuds'" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <input v-model="rechercheNoeud" type="text" placeholder="🔍 Rechercher un nœud..."
                 class="flex-1 min-w-[200px] text-sm px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:border-emerald-400"/>
          <select v-model="filtreTypeNoeud"
                  class="text-sm px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:border-emerald-400">
            <option value="">Tous les types</option>
            <option value="CENTRE">Centre de Transmission</option>
            <option value="CHAMBRE">Chambre de Tirage</option>
            <option value="MANCHON">Manchon</option>
            <option value="MANCHON_ENTERRE">Manchon Enterré</option>
            <option value="MANCHON_AERIEN">Manchon Aérien</option>
            <option value="POTEAU">Poteau</option>
            <option value="BTS">Pylône / BTS</option>
            <option value="CLIENT">Site Client</option>
          </select>
        </div>

        <div v-if="store.chargementNoeuds" class="py-16 text-center text-gray-400">
          <div class="animate-spin w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          Chargement des nœuds...
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Nom / Code</th>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">État Opérationnel</th>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Énergie</th>
                <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Dernière modif.</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="noeud in noeudsFiltres" :key="noeud.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                  <span>{{ iconeNoeud(noeud.type_noeud) }}</span>
                  {{ noeud.nom_code || '—' }}
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="badgeTypeNoeud(noeud.type_noeud)">
                    {{ noeud.type_noeud_label || noeud.type_noeud }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ noeud.statut_operationnel || '—' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ noeud.statut_energie || '—' }}</td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ noeud.date_modification?.split('T')[0] || '—' }}</td>
              </tr>
              <tr v-if="noeudsFiltres.length === 0">
                <td colspan="5" class="px-4 py-12 text-center text-gray-400">
                  <p class="text-3xl mb-2">📭</p>
                  <p>Aucun nœud ne correspond aux filtres</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  </div>
</template>
