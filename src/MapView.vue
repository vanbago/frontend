<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css' 
import AuthService from './services/auth' // 🛡️ Le garde du corps JWT
import MonitoringDashboard from './Monitoring/MonitoringDashboard.vue'  

//=======================================
// INTERFACE TYPESCRIPT
//=======================================


// =====================================================
// INTERFACES POUR L'INSPECTION DES CABLES
// =====================================================

interface Fibre {
  id:string
  url:string
  numero_tube: number
  numero_fibre: number
  code_couleur_hex: string | null
  etat : string | null
}

interface NormeCouleurs {
  id: string
  url: string
  code: string
  description : string
  sequence_couleurs: string[]

}


interface CableInspection {
  id: string
  url: string
  nom_code: string
  capacite_fibres: number
  longueur_reelle_metres : number | null
  technologie_transport: string | null
  statut_physique: string | null
  type_fibres: string | null
  noeud_depart_url: string | null
  noeud_depart_nom: string | null
  noeud_fin_url: string | null
  noeud_fin_nom: string | null
  centre_url: string | null
  centre_nom: string | null
  norme_details: NormeCouleurs | null
  fibres: Fibre[]

}

// =====================================================
// INTERFACES POUR L'INSPECTION DES CENTRES 
// =====================================================


// Résumé d'un boîtier (ODF principalement)
interface BoitierResum {
  id: string
  url: string
  nom_reference: string | null
  type_boitier: string
  type_label: string
  nombre_cassettes: number | null
  etat: string | null
  date_installation: string | null
}

// Résumé d'un câble connecté au nœud
interface CableResum {
  id: string
  url: string
  nom_code: string | null
  capacite_fibres: number | null
  technologie_transport: string | null
  statut_physique: string | null
  longueur_reelle_metres: number | null
}

// Résumé d'un équipement (Routeur, OLT, Switch...)
interface EquipementResum {
  id: string
  nom: string | null
  type: string | null
  statut: string | null
  marque: string | null
}


// Réponse de l'API /api/noeuds/{id}/ — CENTRE, BTS, CLIENT uniquement
interface NoeudCentreInspection {
  id: string
  url: string
  nom_code: string | null
  type_noeud: string
  type_noeud_label: string
  statut_energie: string | null
  statut_operationnel: string | null
  date_modification: string | null
  contenu: {
    boitiers: BoitierResum[]
    cables: CableResum[]
    equipements: EquipementResum[]
  }
}






// URl DE TON API (À METTRE DANS .ENV POUR PLUS DE FLEXIBILITÉ)
const BASE_URL = AuthService.getBaseURL() // Récupère l'URL de base depuis le service d'authentification

//  DÉCLARATION DE LA CARTE
const map = shallowRef<L.Map | null>(null)

// GESTIONS DES CALQUES (Nœuds, Câbles, Frontières)
let calqueNoeuds: L.GeoJSON | null = null
let calqueCables: L.GeoJSON | null = null


// GESTION DU PANNEAU LATÉRAL (Création de Nœud)
const panneauOuvert = ref(false)


// FENETRE DU MONITORING
const afficherDashboard = ref(false)

//  FONCTION DE DÉCONNEXION
const router = useRouter()

const deconnecter = () => {
  AuthService.logout()
  router.push('/login') // Redirection vers la page de connexion
}

// FENETRE D'INSPECTION CABLE
const afficherInspection = ref(false)
const cableEnInspection = ref<CableInspection | null>(null)
const chargementInspection = ref(false)


//================================================
//  MOTEUR DE FENÊTRES FLOTTANTES (DRAG & DROP)
//================================================


const fenetres = reactive({
  monitoring: { x: 20, y: 80 },
  creation: { x: window.innerWidth > 800 ? window.innerWidth - 360 : 20, y: 80 },
  inspection: { x: 60, y: 100 },
  inspectionNoeud: { x: 60, y: 100 },
})

let dragInfo = { actif: false, fenetre: '' as 'monitoring' | 'creation' | 'inspection' | 'inspectionNoeud', startX: 0, startY: 0, initX: 0, initY: 0 }

const demarrerDrag = (e: MouseEvent, nomFenetre: 'monitoring' | 'creation' | 'inspection' | 'inspectionNoeud') => {
  dragInfo.actif = true
  dragInfo.fenetre = nomFenetre
  dragInfo.startX = e.clientX
  dragInfo.startY = e.clientY
  dragInfo.initX = fenetres[nomFenetre].x
  dragInfo.initY = fenetres[nomFenetre].y
  
  // On écoute la souris partout sur l'écran
  document.addEventListener('mousemove', glisserFenetre)
  document.addEventListener('mouseup', arreterDrag)
}

const glisserFenetre = (e: MouseEvent) => {
  if (!dragInfo.actif) return
  const dx = e.clientX - dragInfo.startX
  const dy = e.clientY - dragInfo.startY
  // On met à jour les coordonnées en temps réel
  fenetres[dragInfo.fenetre].x = dragInfo.initX + dx
  fenetres[dragInfo.fenetre].y = dragInfo.initY + dy
}

const arreterDrag = () => {
  dragInfo.actif = false
  document.removeEventListener('mousemove', glisserFenetre)
  document.removeEventListener('mouseup', arreterDrag)
}

// dashboard monitoring
const fermerDashboard = () => afficherDashboard.value = false



//=====================================
// L'INSPECTEUR DE CÂBLE et GESTIONNAIRE DES CABLES
//=======================================


// fermer la fenetre d'inspection
const fermerInspection = () => {
  afficherInspection.value = false
  cableEnInspection.value = null
}

// charger les details du cable
const inspecterCable = async (cableID: string) => {
  try {

    chargementInspection.value = true
    afficherInspection.value = true

    const response = await AuthService.apiCall(`${BASE_URL}/api/cables/${cableID}/inspecter/`)
    
    if (!response.ok) throw new Error(`Erreur ${response.status}`)
    
    const data: CableInspection = await response.json()
    cableEnInspection.value = data

    console.log("Données complètes du câble :", data)
    
  } catch (erreur) {
    console.error("❌ Échec de d'inspection:", erreur)
    alert("Impossible de charger les details")
    fermerInspection()
  } finally {
    chargementInspection.value = false
  }
}

// converti la longueur_reelle en km
const formaterLongueur = (longueurMetres: number | string | null | undefined) => {
  if (longueurMetres === null || longueurMetres === undefined) return 'N/A'
  const valeur = Number(longueurMetres)
  if (isNaN(valeur)) return 'N/A'
  if (valeur >= 1000) {
    return (valeur / 1000).toFixed(2) + ' km'
  }
  return valeur.toFixed(0) + ' m'
}

// dessiner les cables
const dessinerCables = (donneesGeoJson: any) => {
  const carte = map.value
  if (!carte) return 

  if (calqueCables) carte.removeLayer(calqueCables)

  calqueCables = L.geoJSON(donneesGeoJson, {
    style: (feature) => {
      return {
        color: '#3b82f6', // Bleu
        weight: 4,
        opacity: 0.8
      }
    },
    onEachFeature: (feature, layer) => {
      const infos = feature.properties || {}
      const cableID = feature.id || infos.id || infos.url?.split('/').filter(Boolean).pop()
      console.log("Câble detecté:", {id:cableID, nom: infos.nom_code})

      // creé le nouveau contenu du popup avec un bouton "Inspecter"
      const popupContent = document.createElement('div')
      popupContent.innerHTML = `
        popupclasseName="text-gray-900 font-sans min-w-[150px]"
          <b class="text-blue-700 text-lg flex items-center gap-2">
             ${infos.nom_code || 'Câble Inconnu'}
          </b>
          <hr class="my-1 border-gray-300">
          <p class="text-sm m-0"><b>Capacité :</b> ${infos.capacite_fibres || 'N/A'} fibres</p>
          <p class="text-sm m-0"><b>Longueur :</b> ${formaterLongueur(infos.longueur_reelle_metres)}</p>

      `
      //button inspecter
      const btnInspecter = document.createElement('button')
      btnInspecter.className = 'mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors'
      btnInspecter.textContent = 'Inspecter'
      btnInspecter.onclick = () => {
        if (cableID) {
          carte.closePopup()
          inspecterCable(cableID)
        } else {
          alert("ID du câble introuvable")
        }
      }
      popupContent.appendChild(btnInspecter)
      layer.bindPopup(popupContent)

      // les hover sur le cable
      layer.on('mouseover', () => {
        (layer as L.Path).setStyle({ weight: 6, opacity: 1 })
      })

      layer.on('mouseout', () => {
        (layer as L.Path).setStyle({ weight: 4, opacity: 0.8 })
      })
    }
  }).addTo(carte)
}

// Calculer la structure du câble (ex: "12×8" = 12 tubes × 8 fibres)
// Priorité aux vraies fibres BDD via fibresParTube, sinon fallback norme
const structureCable = computed(() => {
  const cable = cableEnInspection.value
  if (!cable) return ''

  const tubes = fibresParTube.value
  const nombreTubes = Object.keys(tubes).length

  if (nombreTubes > 0) {
    const fibresParTubeCount = Math.max(...Object.values(tubes).map(f => f.length))
    return `${nombreTubes}×${fibresParTubeCount}`
  }

  // Fallback théorique : norme BDD
  const capacite = cable.capacite_fibres || 0
  const fibresParTubeCount = cable.norme_details?.sequence_couleurs?.length || 12
  const nombreTubesCalc = Math.ceil(capacite / fibresParTubeCount)
  return `${nombreTubesCalc}×${fibresParTubeCount}`
})


// Grouper les fibres par tube avec calcul dynamique de la structure
const fibresParTube = computed(() => {
  const cable = cableEnInspection.value
  if (!cable) return {}
  
  const norme = cable.norme_details
  const capacite = cable.capacite_fibres || 0
  
  // Nombre de fibres par tube = taille de la séquence de couleurs de la norme
  const fibresParTubeCount = norme?.sequence_couleurs?.length || 12
  
  // Nombre de tubes = capacité / fibres par tube
  const nombreTubes = Math.ceil(capacite / fibresParTubeCount)
  
  // Si on a des fibres en BDD, on les utilise
  if (cable.fibres && cable.fibres.length > 0) {
    const groupes: Record<number, Fibre[]> = {}
    
    for (const fibre of cable.fibres) {
      const tube = fibre.numero_tube
      if (!groupes[tube]) {
        groupes[tube] = []
      }
      groupes[tube].push(fibre)
    }
    
    // Trier les fibres dans chaque tube
    for (const tube in groupes) {
      groupes[tube].sort((a, b) => a.numero_fibre - b.numero_fibre)
    }
    
    return groupes
  }

  // Sinon, on génère la structure théorique (pour prévisualisation)
  const groupes: Record<number, Fibre[]> = {}
  
  for (let t = 1; t <= nombreTubes; t++) {
    groupes[t] = []
    const debutFibre = (t - 1) * fibresParTubeCount + 1
    const finFibre = Math.min(t * fibresParTubeCount, capacite)
    
    for (let f = debutFibre; f <= finFibre; f++) {
      const indexCouleur = (f - 1) % fibresParTubeCount
      const nomCouleur = norme?.sequence_couleurs?.[indexCouleur] || 'INCONNUE'
      
      groupes[t].push({
        id: `temp-${t}-${f}`,
        url: '',
        numero_tube: t,
        numero_fibre: f,
        code_couleur_hex: nomCouleur,
        etat: null
      })
    }
  }
  
  return groupes
})

// On aligne les champs EXACTEMENT sur ton modèle Django
const formulaireNoeud = reactive({
  nom_code: '',
  type_noeud: 'MANCHON', // La valeur par défaut de ton backend
  latitude: '',
  longitude: '',
  statut_operationnel: 'EN SERVICE', // En service, Projet, Maintenance...
  statut_energie: 'PASSIF'       // Actif (Alimenté) ou Passif
})

const ouvrirPanneau = () => panneauOuvert.value = true

const fermerPanneau = () => {
  panneauOuvert.value = false
  formulaireNoeud.nom_code = ''
  formulaireNoeud.latitude = ''
  formulaireNoeud.longitude = ''
}

// Le tireur d'élite (Envoi vers Django)
const sauvegarderNouveauNoeud = async () => {
  try {
    console.log(" Envoi des données a Django...")

    const lat = parseFloat(formulaireNoeud.latitude)
    const lng = parseFloat(formulaireNoeud.longitude)

    // Construction du Payload au standard GeoDjango
    const payload = {
      nom_code: formulaireNoeud.nom_code,
      type_noeud: formulaireNoeud.type_noeud,
      statut_operationnel: formulaireNoeud.statut_operationnel,
      statut_energie: formulaireNoeud.statut_energie,

      // La magie GeoJSON : Un Point géographique propre
      geometrie: {
        type: "Point",
        coordinates: [
          lng, //  LONGITUDE EN PREMIER !
          lat   //LATITUDE EN SECOND !
        ]
      }
    }

    // Appel à ton API via ton garde du corps JWT
    const reponse = await AuthService.apiCall(`${BASE_URL}/api/noeuds/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!reponse.ok) {
      const erreurServeur = await reponse.json()
      console.error("Détails du refus :", erreurServeur)
      throw new Error(`Refus du serveur: ${reponse.status}`)
    }

    // Succès total !
    alert(`L'équipement ${formulaireNoeud.nom_code} a été ancré sur le réseau !`)
    fermerPanneau()

    // on dessine et on Zomm imediatement sur la zone

    if (map.value && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      const nouveauMarqueur = L.circleMarker([lat, lng], {
        color: '#ffffff',
        weight: 3,
        fillColor: '#f59e0b',
        fillOpacity: 1,
        radius: 10
      }).addTo(map.value)

        nouveauMarqueur.bindPopup(`
          <div class="text-gray-900 font-sans min-w-[150px]">
            <b class="text-emerald-700 text-lg flex items-center gap-2">
              🖧 ${formulaireNoeud.nom_code}
            </b>
            <hr class="my-1 border-gray-300">
            <p class="text-sm m-0"><b>Type :</b> ${formulaireNoeud.type_noeud}</p>
          </div>
        `).openPopup()

      nouveauMarqueur.bringToFront()
      map.value.setView([lat, lng], 17, { animate: true })
    }
    
    // On rafraîchit la carte en arrière-plan pour voir le point apparaître !
    chargerInfrastructure() 

  } catch (erreur) {
    console.error("❌ Échec de la sauvegarde :", erreur)
    alert("Erreur lors de la création du nœud. Vérifiez la console F12.")
  }
}





//===============================================
//LE TRADUCTEUR DE COULEURS GESTION DES NORMES
//===============================================

const DICTIONNAIRE_COULEURS: Record<string, { bg: string, border: string, isDashed?: boolean }> = {
  "INCONNUE": { bg: '#9ca3af', border: '#6b7280' },
  "Bleu": { bg: '#3b82f6', border: 'transparent' },
  "Orange": { bg: '#f97316', border: 'transparent' },
  "Vert": { bg: '#22c55e', border: 'transparent' },
  "Marron": { bg: '#8b4513', border: 'transparent' },
  "Gris": { bg: '#64748b', border: 'transparent' },
  "Blanc": { bg: '#ffffff', border: '#cbd5e1' }, // Bordure grise pour voir le blanc
  "Rouge": { bg: '#ef4444', border: 'transparent' },
  "Noir": { bg: '#0f172a', border: 'transparent' },
  "Jaune": { bg: '#eab308', border: 'transparent' },
  "Violet": { bg: '#a855f7', border: 'transparent' },
  "Rose": { bg: '#ec4899', border: 'transparent' },
  "Turquoise": { bg: '#06b6d4', border: 'transparent' },
  // Les spécificités Eneo (Pointillés)
  "Bleu pointillé": { bg: '#3b82f6', border: '#ffffff', isDashed: true },
  "Orange pointillé": { bg: '#f97316', border: '#ffffff', isDashed: true },
  "Vert pointillé": { bg: '#22c55e', border: '#ffffff', isDashed: true },
  "Marron pointillé": { bg: '#8b4513', border: '#ffffff', isDashed: true }
}

//===========================
// BASE DE DONNÉES DES NORMES
//===========================

const CATALOGUE_NORMES : Record<string, string[]> = {
  "EIA-589": ["Bleu", "Orange", "Vert", "Marron", "Gris", "Blanc", "Rouge", "Noir", "Jaune", "Violet", "Rose", "Turquoise"],
  "Câble 6 brins": ["Bleu", "Orange", "Vert", "Marron", "Gris", "Blanc"],
  "IEC 60304": ["Rouge", "Vert", "Bleu", "Jaune", "Blanc", "Gris", "Marron", "Violet", "Turquoise", "Noir", "Orange", "Rose"],
  "FOTAG": ["Rouge", "Bleu", "Vert", "Jaune", "Violet", "Blanc", "Orange", "Gris", "Marron", "Noir", "Turquoise", "Rose"],
  "France": ["Bleu", "Rouge", "Vert", "Jaune", "Violet", "Blanc"],
  "Eneo a 16 fibres": ["Bleu", "Orange", "Vert", "Marron", "Gris", "Blanc", "Rouge", "Noir", "Jaune", "Violet", "Rose", "Turquoise", "Bleu pointillé", "Orange pointillé", "Vert pointillé", "Marron pointillé"]
}


// Elle prend le numéro de la fibre ET le code de la norme du câble
const getCouleurFibre = (numero: number, codeNorme: keyof typeof CATALOGUE_NORMES = "EIA-589") => {
  // On récupère la bonne séquence, ou la séquence par défaut si la norme est inconnue
  const sequence = CATALOGUE_NORMES[codeNorme] || CATALOGUE_NORMES["EIA-589"]
  const tailleSequence = sequence.length
  
  // Le calcul du "Modulo" : Si on a la fibre 13 sur un câble de 12 couleurs, on recommence à l'index 0 !
  const index = (numero - 1) % tailleSequence
  const nomCouleur = sequence[index]
  
  // On calcule le "Tube" (ex: Fibre 13 sur un code de 12 = Tube 2)
  const numeroTube = Math.floor((numero - 1) / tailleSequence) + 1
  
  return {
    nom: nomCouleur,
    tube: numeroTube,
    style: DICTIONNAIRE_COULEURS[nomCouleur] || DICTIONNAIRE_COULEURS["INCONNUE"]
  }
}

// utilise la couleur stockée en BDD ou calcule depuis la norme
const getStyleFibre = (fibre: Fibre, norme: NormeCouleurs | null) => {

  // si la couleur est stocké dans la fibre on l'utilise

  if (fibre.code_couleur_hex){
    const style = DICTIONNAIRE_COULEURS[fibre.code_couleur_hex]
      
    if (style) return style

  }

  // sinon , on calcule depuis la norme
  if (norme?.code) {
    return getCouleurFibre(fibre.numero_fibre, norme.code).style
  }

  // Fallback: couleur inconnue
  return DICTIONNAIRE_COULEURS["INCONNUE"]

}

// Obtenir la couleur d'un tube (même séquence que les fibres)
const getCouleurTube = (numeroTube: number): { nom: string, style: { bg: string, border: string, isDashed?: boolean } } => {
  const norme = cableEnInspection.value?.norme_details
  const sequence = norme?.sequence_couleurs || CATALOGUE_NORMES["EIA-589"]
  
  // Le tube suit la même séquence de couleurs (Tube 1 = couleur 1, Tube 2 = couleur 2, etc.)
  const index = (numeroTube - 1) % sequence.length
  const nomCouleur = sequence[index]
  
  return {
    nom: nomCouleur,
    style: DICTIONNAIRE_COULEURS[nomCouleur] || DICTIONNAIRE_COULEURS["INCONNUE"]
  }
}




// ========================================================
//  INPECTEUR ET GESTIONNAIRE DES NOEUDS
//=========================================================


// Variables réactives
const afficherInspectionNoeud = ref(false)
const noeudEnInspection = ref<NoeudCentreInspection | null>(null)
const chargementInspectionNoeud = ref(false)

// Fermer la fenêtre
const fermerInspectionNoeud = () => {
  afficherInspectionNoeud.value = false
  noeudEnInspection.value = null
}

// Charger les détails du nœud
const inspecterNoeud = async (noeudId: string) => {
  try {
    chargementInspectionNoeud.value = true
    afficherInspectionNoeud.value = true

    const response = await AuthService.apiCall(`${BASE_URL}/api/noeuds/${noeudId}/inspecter/`)
    
    if (!response.ok) throw new Error(`Erreur ${response.status}`)
    
    const data: NoeudCentreInspection = await response.json()
    noeudEnInspection.value = data

    console.log("Données du nœud :", data)
    
  } catch (erreur) {
    console.error("❌ Échec inspection nœud:", erreur)
    alert("Impossible de charger les détails du nœud")
    fermerInspectionNoeud()
  } finally {
    chargementInspectionNoeud.value = false
  }
}

const installerManchon = async (noeudId: string) => {
  // TODO: Ouvrir un formulaire de création de manchon
  // Pour l'instant, juste un placeholder
  alert(`Fonctionnalité à venir : Installer manchon dans le nœud ${noeudId}`)
}

// Déduplique les câbles d'une chambre de tirage par id
// (le backend peut retourner le même câble via les deux requêtes : extrémité + transit géométrique)
const cablesTransitUniques = computed(() => {
  const cables = noeudEnInspection.value?.contenu?.cables ?? []
  const vus = new Set<string>()
  return cables.filter(c => {
    if (vus.has(c.id)) return false
    vus.add(c.id)
    return true
  })
})

// style et types de Noeuds
const styleParType = (type: string): { fillColor: string; radius: number; icone: string; couleurTexte: string } => {
  switch (type) {
    case 'CENTRE':          return { fillColor: '#ef4444', radius: 14, icone: '🏢', couleurTexte: 'text-red-600' }
    case 'CHAMBRE':         return { fillColor: '#3b82f6', radius: 10, icone: '⬛', couleurTexte: 'text-blue-600' }
    case 'MANCHON':         return { fillColor: '#f59e0b', radius: 8,  icone: '🔶', couleurTexte: 'text-amber-600' }
    case 'MANCHON_ENTERRE': return { fillColor: '#78716c', radius: 8,  icone: '🔽', couleurTexte: 'text-stone-600' }
    case 'MANCHON_AERIEN':  return { fillColor: '#a78bfa', radius: 8,  icone: '🔼', couleurTexte: 'text-violet-600' }
    case 'POTEAU':          return { fillColor: '#84cc16', radius: 7,  icone: '🪵', couleurTexte: 'text-lime-600' }
    case 'BTS':             return { fillColor: '#06b6d4', radius: 11, icone: '📡', couleurTexte: 'text-cyan-600' }
    case 'CLIENT':          return { fillColor: '#ec4899', radius: 9,  icone: '🏠', couleurTexte: 'text-pink-600' }
    default:                return { fillColor: '#6b7280', radius: 8,  icone: '🖧',  couleurTexte: 'text-gray-600' }
  }
}


// Dessiner les noeuds sur la cartes (GeoJSON)
const dessinerNoeuds = (donneesGeoJson: any) => {
  const carte = map.value
  if (!carte || !donneesGeoJson) return

  if (calqueNoeuds) carte.removeLayer(calqueNoeuds)

  calqueNoeuds = L.geoJSON(donneesGeoJson, {
    pointToLayer: (feature, latlng) => {
      const type = feature.properties?.type_noeud || ''
      const style = styleParType(type)
      return L.circleMarker(latlng, {
        color: '#ffffff',
        weight: 2,
        fillColor: style.fillColor,
        fillOpacity: 1,
        radius: style.radius
      })
    },
    onEachFeature: (feature, layer) => {
  const infos = feature.properties || {}
  const noeudId = feature.id || infos.id || infos.url?.split('/').filter(Boolean).pop()
  const style = styleParType(infos.type_noeud || '')
  
  // Créer le contenu du popup
  const popupContent = document.createElement('div')
  popupContent.className = 'text-gray-900 font-sans min-w-[180px]'
  popupContent.innerHTML = `
    <div class="flex items-center gap-2 mb-1">
      <span class="text-lg">${style.icone}</span>
      <b class="${style.couleurTexte} text-base">${infos.nom_code || 'Nœud Inconnu'}</b>
    </div>
    <hr class="my-1 border-gray-300">
    <p class="text-xs m-0"><b>Type:</b> ${infos.type_noeud_label || infos.type_noeud || 'N/A'}</p>
    <p class="text-xs m-0"><b>Énergie:</b> ${infos.statut_energie || 'N/A'}</p>
    <p class="text-xs m-0"><b>État:</b> ${infos.statut_operationnel || 'N/A'}</p>
  `
  
  // Bouton Inspecter
  const btnInspecter = document.createElement('button')
  btnInspecter.className = 'mt-2 w-full bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors'
  btnInspecter.textContent = '🔍 Inspecter'
  btnInspecter.onclick = () => {
    if (noeudId) {
      map.value?.closePopup()
      inspecterNoeud(noeudId)
    } else {
      alert("ID du nœud introuvable")
    }
  }
  popupContent.appendChild(btnInspecter)
  
  layer.bindPopup(popupContent)
}
  }).addTo(carte)

  calqueNoeuds.bringToFront()
}



// =====================================================
// FONCTION POUR DESSINER LES FRONTIÈRES (Départements)
//======================================================

const dessinerFrontiere = async () => {
  const carte = map.value
  if (!carte) return

  try {
    console.log("Récupération de la frontière du Nyong-et-So'o...")
    
    // On interroge l'API gratuite d'OpenStreetMap
    const url = "https://nominatim.openstreetmap.org/search?q=Nyong-et-So'o,+Cameroon&format=json&polygon_geojson=1&limit=1"
    const reponse = await fetch(url)
    const data = await reponse.json()

    if (data && data.length > 0 && data[0].geojson) {
      // On extrait le polygone de la réponse
      const frontiereGeoJson = data[0].geojson

      // On le dessine sur la carte
      const calqueDepartement = L.geoJSON(frontiereGeoJson, {
        style: {
          color: '#8b5cf6',       // Bordure Violette (Tailwind violet-500)
          weight: 2,              // Épaisseur de la bordure
          dashArray: '5, 10',     // Ligne en pointillés pour faire "frontière"
          fillColor: '#8b5cf6',   // Remplissage Violet
          fillOpacity: 0.1        // Très transparent (10%) pour ne pas cacher les câbles
        }
      }).addTo(carte)
      
      // On centre automatiquement la carte sur le département !
      carte.fitBounds(calqueDepartement.getBounds())
      
      // On s'assure que le fond violet reste "derrière" les câbles et les nœuds
      calqueDepartement.bringToBack()
    }
  } catch (erreur) {
    console.error("❌ Impossible de charger la frontière :", erreur)
  }
}


//==========================================
// COMMUNICATION AVEC L'API
// LE SUPER-CHARGEUR DE L'INFRASTRUCTURE
//==========================================

const chargerInfrastructure = async () => {
  try {
    console.log("Chargement de l'infrastructure globale...")

    // L'ASTUCE PRO : On lance les deux requêtes en même temps !
    const [reponseCables, reponseNoeuds] = await Promise.all([
      AuthService.apiCall(`${BASE_URL}/api/cables/`),
      AuthService.apiCall(`${BASE_URL}/api/noeuds/`)
    ])
    
    // Si l'une des deux échoue (ex: token expiré)
    if (!reponseCables.ok || !reponseNoeuds.ok) {
      throw new Error(`Erreur serveur - Câbles: ${reponseCables.status}, Nœuds: ${reponseNoeuds.status}`)
    }

    const donneesCables = await reponseCables.json()
    const donneesNoeuds = await reponseNoeuds.json()

    // DÉBALLAGE ET DESSIN DES CÂBLES
    let valiseGeoJson = null
    if (donneesCables.results && donneesCables.results.type === 'FeatureCollection') {
      valiseGeoJson = donneesCables.results
    } else if (donneesCables.type === 'FeatureCollection') {
      valiseGeoJson = donneesCables
    }
    if (valiseGeoJson) dessinerCables(valiseGeoJson)

   // 2. DÉBALLAGE ET DESSIN DES NŒUDS (Mode GeoJSON pur)
    let valiseNoeudsGeoJson = null
    
    // Si la Pagination DRF est activée
    if (donneesNoeuds.results && donneesNoeuds.results.type === 'FeatureCollection') {
      valiseNoeudsGeoJson = donneesNoeuds.results
    } 
    // Si c'est du GeoJSON direct
    else if (donneesNoeuds.type === 'FeatureCollection' || donneesNoeuds.features) {
      valiseNoeudsGeoJson = donneesNoeuds
    }

    if (valiseNoeudsGeoJson) {
      console.log("Radar : Valise GeoJSON de Nœuds trouvée !")
      dessinerNoeuds(valiseNoeudsGeoJson)
    } else {
      console.warn("⚠️ Impossible de lire le format des nœuds :", donneesNoeuds)
    }

    console.log("✅ INFRASTRUCTURE COMPLÈTE CHARGÉE !")

  } catch (erreur) {
    console.error("❌ Échec du chargement :", erreur)
  }
}

// 4. CYCLE DE VIE VUE.JS
onMounted(() => {
  const centreCoordonnees: L.LatLngExpression = [3.8480, 11.5021]

  map.value = L.map('map', {
    center: centreCoordonnees,
    zoom: 13, 
    zoomControl: true 
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20 
  }).addTo(map.value)

  L.circleMarker(centreCoordonnees, {
    color: '#3b82f6', 
    fillColor: '#3b82f6',
    fillOpacity: 0.6,
    radius: 8 
  }).addTo(map.value)
    .bindPopup('<b class="text-gray-900">Nœud Optique Principal</b><br>Yaoundé')

  if (map.value !== null) {
    map.value.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat.toFixed(6)
      const lng = e.latlng.lng.toFixed(6)

      L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div class="text-gray-900 text-center font-sans">
            <b class="text-blue-600">📍 Coordonnées GPS</b><br>
            <span class="text-xs text-gray-500">Lat :</span> ${lat}<br>
            <span class="text-xs text-gray-500">Lng :</span> ${lng}
          </div>
        `)
        .openOn(map.value!) 
    })
  }

  setTimeout(() => {
    if (map.value) map.value.invalidateSize()
  }, 200)


  // On lance le chargement de la frontière OSM
  dessinerFrontiere()

  // On lance l'appel API une fois la carte prête
  chargerInfrastructure()

}) 

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
  }
})
</script>


<template>
  <div class="flex flex-col h-screen w-full bg-gray-100 overflow-hidden font-sans">

    <header class="bg-white shadow-sm border-b border-gray-300 h-14 flex items-center justify-between px-4 z-20 shrink-0">
      <div class="flex items-center gap-4 flex-1">
        <div class="flex items-center gap-2 cursor-pointer shrink-0">
          <span class="text-2xl">🌍</span>
          <span class="text-xl font-bold text-emerald-700 tracking-tight hidden sm:block">Optis_OTN</span>
        </div>
        <div class="flex items-center bg-gray-50 rounded border border-gray-300 px-2 py-1 max-w-sm w-full">
          <span class="text-gray-400 text-sm mr-2">🔍</span>
          <input type="text" placeholder="Rechercher un BPEO, un câble..." class="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 w-full"/>
          <button class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded ml-2 transition-colors">Aller</button>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <nav class="hidden md:flex items-center gap-1 mr-2">
          <button class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50">Éditer ▼</button>
        </nav>
        <div class="w-px h-6 bg-gray-300 mx-1 hidden md:block"></div>
        <button @click="deconnecter" class="px-3 py-1 text-sm font-bold text-gray-600 hover:text-red-600 transition">Déconnexion</button>
      </div>
    </header>

    <main class="relative flex-1 w-full h-full overflow-hidden">
      
      <div id="map" class="absolute inset-0 z-0"></div>

      <!-- LÉGENDE -->
      <div class="absolute bottom-6 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-gray-200 p-3 text-xs">
        <p class="font-bold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">Légende</p>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2"><span class="inline-block w-4 h-4 rounded-full border-2 border-white shadow" style="background:#ef4444"></span><span class="text-gray-700">Centre de Transmission</span></div>
          <div class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-full border-2 border-white shadow" style="background:#06b6d4"></span><span class="text-gray-700">Pylône / BTS</span></div>
          <div class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-full border-2 border-white shadow" style="background:#3b82f6"></span><span class="text-gray-700">Chambre de Tirage</span></div>
          <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full border-2 border-white shadow" style="background:#f59e0b"></span><span class="text-gray-700">Manchon</span></div>
          <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full border-2 border-white shadow" style="background:#78716c"></span><span class="text-gray-700">Manchon Enterré</span></div>
          <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full border-2 border-white shadow" style="background:#a78bfa"></span><span class="text-gray-700">Manchon Aérien</span></div>
          <div class="flex items-center gap-2"><span class="inline-block w-2 h-2 rounded-full border-2 border-white shadow" style="background:#84cc16"></span><span class="text-gray-700">Poteau</span></div>
          <div class="flex items-center gap-2"><span class="inline-block w-3 h-3 rounded-full border-2 border-white shadow" style="background:#ec4899"></span><span class="text-gray-700">Site Client</span></div>
          <hr class="border-gray-200 my-0.5">
          <div class="flex items-center gap-2"><span class="inline-block w-5 h-1 rounded" style="background:#3b82f6"></span><span class="text-gray-700">Câble Optique</span></div>
        </div>
      </div>

  

      <div class="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md rounded shadow flex flex-col gap-0.5 p-1 border border-white/50">
        <button class="p-1.5 hover:bg-white rounded transition text-gray-700"><span class="text-sm">🗺️</span></button>
        <button class="p-1.5 hover:bg-white rounded transition text-gray-700"><span class="text-sm">📏</span></button>
        <div class="h-px w-full bg-gray-300 my-0.5"></div>
        <button @click="ouvrirPanneau" class="p-1.5 hover:bg-emerald-50 rounded transition text-emerald-600" title="Ajouter un Nœud">
          <span class="text-sm font-bold">➕</span>
        </button>
        <button @click="afficherDashboard = true" class="p-1.5 hover:bg-purple-50 rounded transition text-purple-600" title="Performances Système">
          <span class="text-sm">📊</span>
        </button>
        <div class="h-px w-full bg-gray-300 my-0.5"></div>
      </div>

<!-- FENETRE D'INSPECTION DES CABLES -->
<transition 
  enter-active-class="transition-all duration-200"
  enter-from-class="opacity-0 scale-95"
  enter-to-class="opacity-100 scale-100"
  leave-active-class="transition-all duration-150"
  leave-from-class="opacity-100 scale-100"
  leave-to-class="opacity-0 scale-95"
>
  <div v-if="afficherInspection" 
       class="absolute z-[4500] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden pointer-events-auto"
       style="width: 420px; max-height: 80vh;"
       :style="{ left: fenetres.inspection.x + 'px', top: fenetres.inspection.y + 'px' }"
       @mousedown.stop
       @click.stop>

    <!-- Barre de titre draggable -->
    <div @mousedown.stop.prevent="demarrerDrag($event, 'inspection')" 
         class="bg-blue-600 px-4 py-2 cursor-move flex justify-between items-center select-none">
      <h3 class="text-white text-sm font-bold flex items-center gap-2">
        <span>🔍</span> Inspection Câble
      </h3>
      <button @mousedown.stop @click.stop="fermerInspection" 
              class="text-blue-200 hover:text-white text-xl font-bold leading-none p-1">&times;</button>
    </div>

    <!-- Contenu de l'inspecteur -->
    <div class="flex-1 overflow-y-auto" @mousedown.stop>

      <!-- Chargement -->
      <div v-if="chargementInspection" class="p-8 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-gray-500 text-sm mt-3">Chargement des fibres...</p>
      </div>

      <!-- Détail des cables -->
      <div v-else-if="cableEnInspection" class="p-4">
      
        <!-- En-tete câble -->
        <div class="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
          <h4 class="font-bold text-blue-800 text-lg">{{ cableEnInspection.nom_code }}</h4>
          <div class="grid grid-cols-2 gap-2 mt-2 text-xs text-blue-700">
            <p><b>Capacité:</b> {{ cableEnInspection.capacite_fibres }} fibres <span v-if="structureCable" class="text-blue-500">({{ structureCable }})</span></p>
            <p><b>Longueur:</b> {{ formaterLongueur(cableEnInspection.longueur_reelle_metres) }}</p>
            <p><b>Départ:</b> {{ cableEnInspection.noeud_depart_nom || 'N/A' }}</p>
                  <p><b>Arrivée:</b> {{ cableEnInspection.noeud_fin_nom || 'N/A' }}</p>
          </div>
        </div>

        <!-- Norme de couleurs -->
              <div v-if="cableEnInspection.norme_details" class="mb-4">
                <h5 class="text-xs font-bold text-gray-500 uppercase mb-2">
                  Norme: {{ cableEnInspection.norme_details.code }}
                </h5>
                <div class="flex flex-wrap gap-1">
                  <span v-for="(couleur, index) in cableEnInspection.norme_details.sequence_couleurs" 
                        :key="index"
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



        <!-- Liste des fibres par tubes-->
        <div class="space-y-3">
                <div v-for="(fibres, numeroTube) in fibresParTube" :key="numeroTube" 
                     class="rounded-lg p-3 border-2"
                     :style="{
                       backgroundColor: getCouleurTube(Number(numeroTube)).style.bg + '15',
                       borderColor: getCouleurTube(Number(numeroTube)).style.bg
                     }">
                  
                  <h5 class="text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <!-- Pastille couleur du tube -->
                    <span class="w-4 h-4 rounded-full shadow-sm"
                          :style="{
                            backgroundColor: getCouleurTube(Number(numeroTube)).style.bg,
                            borderWidth: '1px',
                            borderStyle: getCouleurTube(Number(numeroTube)).style.isDashed ? 'dashed' : 'solid',
                            borderColor: getCouleurTube(Number(numeroTube)).style.border || 'white'
                          }">
                    </span>
                    <span class="text-gray-700">Tube {{ numeroTube }}</span>
                    <span class="text-gray-400 font-normal">({{ getCouleurTube(Number(numeroTube)).nom }})</span>
                    <span class="text-gray-400 font-normal ml-auto">{{ fibres.length }} fibres</span>
                  </h5>
                  
                  <!-- Grille des fibres -->
                  <div class="grid grid-cols-6 gap-1.5">
                    <div v-for="fibre in fibres" :key="fibre.id"
                         class="relative group">
                      
                      <!-- Pastille de couleur -->
                      <div class="w-8 h-8 rounded-full shadow-md flex items-center justify-center text-[10px] font-bold cursor-pointer transition-transform hover:scale-110"
                           :style="{ 
                             backgroundColor: getStyleFibre(fibre, cableEnInspection?.norme_details || null).bg,
                             borderWidth: '2px',
                             borderStyle: getStyleFibre(fibre, cableEnInspection?.norme_details || null).isDashed ? 'dashed' : 'solid',
                             borderColor: getStyleFibre(fibre, cableEnInspection?.norme_details || null).border || 'white'
                           }"
                           :class="{ 
                             'text-white': ['Bleu', 'Vert', 'Rouge', 'Violet', 'Noir', 'Marron'].includes(fibre.code_couleur_hex || ''),
                             'text-gray-800': !['Bleu', 'Vert', 'Rouge', 'Violet', 'Noir', 'Marron'].includes(fibre.code_couleur_hex || '')
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
            
          
        <!-- Message si pas de fibres -->
              <div v-if="cableEnInspection.fibres.length === 0" 
                   class="text-center py-8 text-gray-400">
                <p class="text-4xl mb-2">📭</p>
                <p class="text-sm">Aucune fibre enregistrée pour ce câble</p>
              </div>
      </div>
    </div>
  </div>
</transition>



      <transition 
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div v-if="panneauOuvert" 
             class="absolute z-[3000] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
             style="width: 320px; max-height: 85vh;"
             :style="{ left: fenetres.creation.x + 'px', top: fenetres.creation.y + 'px' }">
        
           <div @mousedown="demarrerDrag($event, 'creation')" 
                class="bg-gray-50 px-4 py-3 border-b border-gray-200 cursor-move flex justify-between items-center select-none active:bg-gray-100">
             <h3 class="font-bold text-gray-800 text-sm flex items-center gap-2">
               <span class="text-emerald-600">➕</span> Nouveau Nœud
             </h3>
             <button @mousedown.stop @click="fermerPanneau" class="text-gray-400 hover:text-red-500 text-xl font-bold leading-none">&times;</button>
           </div>

           <div class="p-4 flex-1 overflow-y-auto flex flex-col gap-3" @mousedown.stop>
              <p class="text-xs text-gray-500 mb-2 font-medium">Remplissez les informations du nœud à ajouter. Les coordonnées GPS sont essentielles pour l'ancrage sur la carte.</p>
              
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Nom / Code du site</label>
                <input v-model="formulaireNoeud.nom_code" type="text" placeholder="Ex: CT-YAO-01" class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none">
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Type d'infrastructure</label>
                <select v-model="formulaireNoeud.type_noeud" class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none">
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

              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-xs font-bold text-gray-700 mb-1">État</label>
                  <select v-model="formulaireNoeud.statut_operationnel" class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                    <option value="PROJET">En Projet</option>
                    <option value="EN_SERVICE">En Service</option>
                  </select>
                </div>
                <div class="flex-1">
                  <label class="block text-xs font-bold text-gray-700 mb-1">Énergie</label>
                  <select v-model="formulaireNoeud.statut_energie" class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                    <option value="PASSIF">Passif</option>
                    <option value="ACTIF">Actif</option>
                  </select>
                </div>
              </div>

              <div class="bg-gray-50 p-2 rounded border border-gray-200 mt-1">
                  <h4 class="text-[10px] font-bold text-gray-500 mb-2 uppercase">Coordonnées GPS</h4>
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <input v-model="formulaireNoeud.latitude" type="number" step="any" placeholder="Lat (Y)" class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                    </div>
                    <div class="flex-1">
                      <input v-model="formulaireNoeud.longitude" type="number" step="any" placeholder="Lng (X)" class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                    </div>
                  </div>
              </div>
           </div>

           <div class="p-3 border-t border-gray-200 bg-gray-50 flex gap-2 justify-end" @mousedown.stop>
             <button @click="fermerPanneau" class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100">Annuler</button>
             <button @click="sauvegarderNouveauNoeud" class="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700 shadow-sm">Créer Nœud</button>
           </div>
        </div>
      </transition>


      <!-- =====================================================
     FENÊTRE D'INSPECTION NŒUD (CENTRE / BTS / CLIENT)
     ===================================================== -->
<transition
  enter-active-class="transition-transform duration-300 ease-out"
  enter-from-class="-translate-x-full opacity-0"
  enter-to-class="translate-x-0 opacity-100"
  leave-active-class="transition-transform duration-200 ease-in"
  leave-from-class="translate-x-0 opacity-100"
  leave-to-class="-translate-x-full opacity-0"
>
  <div v-if="afficherInspectionNoeud"
       class="absolute z-[4500] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
       style="width: 400px; max-height: 85vh;"
       :style="{ left: fenetres.inspectionNoeud.x + 'px', top: fenetres.inspectionNoeud.y + 'px' }"
       @mousedown.stop @click.stop>
    
    <!-- BARRE DE TITRE (Draggable) -->
    <div @mousedown.stop.prevent="demarrerDrag($event, 'inspectionNoeud')"
         class="px-4 py-3 cursor-move flex justify-between items-center select-none"
         :class="noeudEnInspection ? styleParType(noeudEnInspection.type_noeud).couleurTexte.replace('text-', 'bg-').replace('600', '100') : 'bg-gray-100'">
      
      <h3 class="font-bold text-sm flex items-center gap-2"
          :class="noeudEnInspection ? styleParType(noeudEnInspection.type_noeud).couleurTexte : 'text-gray-800'">
        <span>{{ noeudEnInspection ? styleParType(noeudEnInspection.type_noeud).icone : '🔍' }}</span>
        {{ noeudEnInspection?.nom_code || 'Chargement...' }}
      </h3>
      
      <button @mousedown.stop @click.stop="fermerInspectionNoeud"
              class="text-gray-400 hover:text-red-500 text-xl font-bold leading-none p-1">
        &times;
      </button>
    </div>

    <!-- CONTENU -->
    <div class="flex-1 overflow-y-auto p-4" @mousedown.stop>
      
      <!-- Chargement -->
      <div v-if="chargementInspectionNoeud" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>

      <!-- Données chargées -->
      <div v-else-if="noeudEnInspection">
        
        <!-- EN-TÊTE : Infos générales -->
        <div class="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
          <div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <p><b>Type:</b> {{ noeudEnInspection.type_noeud_label }}</p>
            <p><b>Énergie:</b> {{ noeudEnInspection.statut_energie || 'N/A' }}</p>
            <p><b>État:</b> {{ noeudEnInspection.statut_operationnel || 'N/A' }}</p>
            <p><b>Modifié:</b> {{ noeudEnInspection.date_modification?.split('T')[0] || 'N/A' }}</p>
          </div>
        </div>

        <!-- Contenu selon le type de nœud -->
        <template v-if="noeudEnInspection.type_noeud !== 'CHAMBRE'">

        <!-- ODF / Boîtiers -->
        <div class="mb-4">
          <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
            📦 ODF / Boîtiers
            <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">
              {{ noeudEnInspection.contenu.boitiers.length }}
            </span>
          </h4>
          <div v-if="noeudEnInspection.contenu.boitiers.length > 0" class="space-y-2">
            <div v-for="odf in noeudEnInspection.contenu.boitiers" :key="odf.id"
                 class="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div class="flex justify-between items-center">
                <span class="font-semibold text-blue-800 text-sm">📋 {{ odf.nom_reference || 'Boîtier sans nom' }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full"
                      :class="odf.etat === 'BON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                  {{ odf.etat || 'Inconnu' }}
                </span>
              </div>
              <div class="flex justify-between text-xs text-blue-600 mt-1">
                <span>{{ odf.type_label }}</span>
                <span v-if="odf.nombre_cassettes">{{ odf.nombre_cassettes }} cassette(s)</span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 italic">Aucun boîtier enregistré</p>
        </div>

        <!-- Câbles connectés -->
        <div class="mb-4">
          <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
            🔌 Câbles Connectés
            <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">
              {{ noeudEnInspection.contenu.cables?.length || 0}}
            </span>
          </h4>
          <div v-if="noeudEnInspection.contenu.cables?.length > 0" class="space-y-2">
            <div v-for="cable in noeudEnInspection.contenu.cables" :key="cable.id"
                 class="bg-indigo-50 border border-indigo-200 rounded-lg p-2 cursor-pointer hover:bg-indigo-100 transition-colors"
                 @click="inspecterCable(cable.id)">
              <div class="flex justify-between items-center">
                <span class="font-semibold text-indigo-800 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                <span class="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
                  {{ cable.capacite_fibres }} FO
                </span>
              </div>
              <div class="flex justify-between text-xs text-indigo-600 mt-1">
                <span>{{ cable.technologie_transport || 'N/A' }}</span>
                <span>{{ formaterLongueur(cable.longueur_reelle_metres) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 italic">Aucun câble connecté</p>
        </div>

        <!-- Équipements -->
        <div class="mb-4">
          <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
            ⚙️ Équipements Actifs
            <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">
              {{ noeudEnInspection.contenu.equipements?.length  || 0 }}
            </span>
          </h4>
          <div v-if="noeudEnInspection.contenu.equipements?.length > 0" class="space-y-2">
            <div v-for="equip in noeudEnInspection.contenu.equipements" :key="equip.id"
                 class="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <div class="flex justify-between items-center">
                <span class="font-semibold text-emerald-800 text-sm">{{ equip.nom || 'Équipement sans nom' }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full"
                      :class="equip.statut === 'EN_SERVICE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
                  {{ equip.statut || 'Inconnu' }}
                </span>
              </div>
              <div class="flex justify-between text-xs text-emerald-600 mt-1">
                <span>{{ equip.type || 'Type inconnu' }}</span>
                <span>{{ equip.marque || '' }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 italic">Aucun équipement enregistré</p>
        </div>

        </template><!-- fin v-if !== CHAMBRE -->

        <!-- ========== CONTENU CHAMBRE ========== -->
        <template v-else-if="noeudEnInspection.type_noeud === 'CHAMBRE'">
          
           <!-- SECTION : Câbles qui passent -->
           <div class="mb-4">
              <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
              🔌 Câbles en transit
               <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {{ cablesTransitUniques.length }}
               </span>
             </h4>

             <div v-if="cablesTransitUniques.length > 0" class="space-y-2">
              <div v-for="cable in cablesTransitUniques" :key="cable.id"
                   class="bg-blue-50 border border-blue-200 rounded-lg p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                   @click="inspecterCable(cable.id)">
                <div class="flex justify-between items-center">
                  <span class="font-semibold text-blue-800 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                  <div class="flex items-center gap-1">
                    <span class="text-xs bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">↔ Transit</span>
                    <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                      {{ cable.capacite_fibres }} FO
                    </span>
                  </div>
                </div>
                <div class="flex justify-between text-xs text-blue-600 mt-1">
                  <span>{{ cable.technologie_transport || 'N/A' }}</span>
                  <span>{{ formaterLongueur(cable.longueur_reelle_metres) }}</span>
                </div>
              </div>
            </div>

            <p v-else class="text-xs text-gray-400 italic">Aucun câble ne passe par cette chambre</p>
          </div>

          <!-- SECTION : Aucun manchon -->
          <div class="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p class="text-3xl mb-2">📭</p>
            <p class="text-sm text-gray-500 mb-3">Aucun manchon installé</p>
            <button 
              @click="installerManchon(noeudEnInspection.id)"
              class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-4 rounded transition-colors">
              ➕ Installer un manchon
            </button>
          </div>

        </template><!-- fin v-else-if CHAMBRE -->

      </div>
    </div>
  </div>
</transition>

     
    

      <transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div v-if="afficherDashboard" 
             class="absolute z-[4000] bg-gray-100 rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden transition-shadow"
             style="width: 450px; height: 600px;"
             :style="{ left: fenetres.monitoring.x + 'px', top: fenetres.monitoring.y + 'px' }" @mousedown.stop @click.stop>
          
          <div @mousedown.stop.prevent="demarrerDrag($event, 'monitoring')" 
               class="bg-gray-800 px-4 py-2 cursor-move flex justify-between items-center select-none active:bg-gray-900">
            <h3 class="text-white text-sm font-bold flex items-center gap-2">
              <span class="animate-pulse text-emerald-400">●</span> Performances Système
            </h3>
            <button @mousedown.stop @click.stop="afficherDashboard=false" class="text-gray-400 hover:text-red-500 text-xl font-bold leading-none p-1">&times;</button>
          </div>

          <div class="flex-1 overflow-y-auto p-2" @mousedown.stop>
            <MonitoringDashboard />
          </div>
        </div>
      </transition>

    </main>
  </div>
</template>

<style scoped>
/* Sécurité : On s'assure que Leaflet ne déborde pas */
#map {
  width: 100%;
  height: 100%;
  z-index: 10; 
}
</style>