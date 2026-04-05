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

// Résumé d'un manchon installé dans une chambre
interface ManchonResum {
  id: string
  nom_reference: string | null
  type_manchon: string
  type_label: string
  etat: string | null
  capacite_fibres: number | null
}

// =====================================================
// INTERFACES MATRICE DE SOUDURES
// =====================================================

// Fibre avec info de soudure
interface FibreMatrice {
  fibre_id: string
  numero_tube: number
  numero_fibre: number
  code_couleur_hex: string | null
  etat: string | null
  soudure_id: string | null
  soudure_statut: string | null
  fibre_connectee_id: string | null
  fibre_connectee_cable: string | null
  fibre_connectee_tube: number | null
  fibre_connectee_numero: number | null
}

// Câble dans la matrice
interface CableMatrice {
  cable_id: string
  cable_url: string
  cable_nom: string
  capacite: number
  fibres: FibreMatrice[]
}

// Soudure
interface SoudureMatrice {
  id: string
  fibre_entrante_id: string
  fibre_sortante_id: string
  statut: string
}

// Contenu manchon
interface ContenuMatrice {
  cables: CableMatrice[]
  soudures: SoudureMatrice[]
  stats: {
    total_fibres: number
    fibres_soudees: number
    fibres_libres: number
  }
}

// Réponse de l'API /api/noeuds/{id}/inspecter/
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
    manchons?: ManchonResum[]
  }
}






// URl DE TON API (À METTRE DANS .ENV POUR PLUS DE FLEXIBILITÉ)
const BASE_URL = AuthService.getBaseURL() // Récupère l'URL de base depuis le service d'authentification

// DÉCLARATION DE LA CARTE
const map = shallowRef<L.Map | null>(null)

// GESTIONS DES CALQUES (Nœuds, Câbles, Frontières)
let calqueNoeuds: L.GeoJSON | null = null
let calqueCables: L.GeoJSON | null = null


// GESTION DU PANNEAU LATÉRAL (Création de Nœud)
const panneauOuvert = ref(false)
const panneauCableOuvert = ref(false)



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

// FENETRE D'INSPECTION DES NOEUDS
const afficherInspectionNoeud = ref(false)
const noeudEnInspection = ref<NoeudCentreInspection | null>(null)
const chargementInspectionNoeud = ref(false)

// FENETRE MATRICE DE SOUDURES
const afficherMatrice = ref(false)
const manchonEnMatrice = ref<ContenuMatrice | null>(null)
const manchonNomEnMatrice = ref<string | null>(null)
const manchonIdEnMatrice = ref<string | null>(null)
const chargementMatrice = ref(false)

//FENETRE DE CREATION DES NOEUDS OU CABLES
const menuCreationOuvert = ref(false)

// liste des noeuds disponibles pour les dropdowns
const noeudsDisponibles = ref<{ id: string, nom: string, type: string, coords: [number, number] | null }[]>([])

// liste des normes disponibles
const normesDisponibles = ref<{ id: string, code: string }[]>([])

// Centre de l'utilisateur connecté (rempli automatiquement depuis /me/)
const centreUtilisateurNom = ref<string | null>(null)
const utilisateurNom = ref<string | null>(null)




// Couleurs standard télécom (ITU-T) pour les fibres optiques
const COULEURS_FIBRES: Record<string, string> = {
  BLEU:     '#1d4ed8',
  ORANGE:   '#ea580c',
  VERT:     '#16a34a',
  MARRON:   '#92400e',
  ARDOISE:  '#64748b',
  BLANC:    '#f8fafc',
  ROUGE:    '#dc2626',
  NOIR:     '#171717',
  JAUNE:    '#ca8a04',
  VIOLET:   '#7c3aed',
  ROSE:     '#db2777',
  CYAN:     '#0891b2',
  INCONNUE: '#9ca3af',
}


//================================================
//  MOTEUR DE FENÊTRES FLOTTANTES (DRAG & DROP)
//================================================


const fenetres = reactive({
  monitoring: { x: 20, y: 80 },
  creation: { x: window.innerWidth > 800 ? window.innerWidth - 360 : 20, y: 80 },
  inspection: { x: 60, y: 100 },
  inspectionNoeud: { x: 60, y: 100 },
  matrice: { x: 100, y: 80 },
  creationCable: { x: window.innerWidth > 800 ? window.innerWidth - 380 : 20, y: 80 }  
})

type NomFenetre = 'monitoring' | 'creation' | 'inspection' | 'inspectionNoeud' | 'matrice' | 'creationCable'

let dragInfo = { actif: false, fenetre: '' as NomFenetre, startX: 0, startY: 0, initX: 0, initY: 0 }

const demarrerDrag = (e: MouseEvent, nomFenetre: NomFenetre) => {
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
    style: (_feature) => {
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


//============================================
// GESTION DES FORMULAIRES DE CREATION
//=============================================


const formulaireCable = reactive({
  nom_code: '',
  noeud_depart_id: '',
  noeud_fin_id: '',
  capacite_fibres: 96,
  norme_id: '',
  technologie_transport: 'FO',
  longueur_reelle_metres: '',
  statut_physique: 'EN_SERVICE',
  centre_proprietaire_id: ''
})

const formulaireNoeud = reactive({
  nom_code: '',
  type_noeud: 'MANCHON', // La valeur par défaut de ton backend
  latitude: '',
  longitude: '',
  statut_operationnel: 'EN SERVICE', // En service, Projet, Maintenance...
  statut_energie: 'PASSIF',       // Actif (Alimenté) ou Passif
  est_frontiere: false,
  centre_partenaire_id: ''
})

const ouvrirPanneau = () => panneauOuvert.value = true

// Ouvrir le menu de création
const ouvrirMenuCreation = () => {
  menuCreationOuvert.value = !menuCreationOuvert.value
}

// Choisir le type de création
const choisirCreation = (type: 'noeud' | 'cable') => {
  menuCreationOuvert.value = false
  if (type === 'noeud') {
    ouvrirPanneau()
  } else if (type === 'cable') {
    ouvrirPanneauCable()
  }
}

// Ouvrir le panneau câble
const ouvrirPanneauCable = async () => {
  await Promise.all([chargerNoeuds(), chargerNormes()])

  // Récupérer le centre de l'utilisateur connecté
  const rep = await AuthService.apiCall(`${BASE_URL}/api/utilisateurs/me/`)
  if (rep.ok) {
    const moi = await rep.json()
    console.log('👤 Profil utilisateur /me/ :', moi)
    formulaireCable.centre_proprietaire_id = moi.centre_id ?? ''
    centreUtilisateurNom.value = moi.centre_nom ?? null
  } else {
    console.error('❌ /me/ a retourné :', rep.status, await rep.text())
  }

  panneauCableOuvert.value = true
}

// Fermer le panneau câble
const fermerPanneauCable = () => {
  panneauCableOuvert.value = false
  formulaireCable.nom_code = ''
  formulaireCable.noeud_depart_id = ''
  formulaireCable.noeud_fin_id = ''
  formulaireCable.capacite_fibres = 96
  formulaireCable.norme_id = ''
  formulaireCable.technologie_transport = 'FO'
  formulaireCable.longueur_reelle_metres = ''
  formulaireCable.statut_physique = 'EN_SERVICE'
  formulaireCable.centre_proprietaire_id = ''
}

const fermerPanneau = () => {
  panneauOuvert.value = false
  formulaireNoeud.nom_code = ''
  formulaireNoeud.latitude = ''
  formulaireNoeud.longitude = ''
  formulaireNoeud.est_frontiere = false
  formulaireNoeud.centre_partenaire_id = ''
}


// Charger les nœuds pour les dropdowns
const chargerNoeuds = async () => {
  try {
    const response = await AuthService.apiCall(`${BASE_URL}/api/noeuds/`)
    if (!response.ok) throw new Error(`Erreur ${response.status}`)
    
    const data = await response.json()
    let noeuds = []
    
    if (data.results?.features) {
      noeuds = data.results.features
    } else if (data.features) {
      noeuds = data.features
    }
    
    noeudsDisponibles.value = noeuds.map((n: any) => ({
      id: n.id || n.properties?.id,
      nom: n.properties?.nom_code || 'Nœud sans nom',
      type: n.properties?.type_noeud || '',
      coords: n.geometry?.coordinates ?? null  // [lng, lat]
    }))
    
    console.log("Nœuds chargés:", noeudsDisponibles.value)
  } catch (erreur) {
    console.error("❌ Échec chargement nœuds:", erreur)
  }
}

// Charger les normes de couleurs
const chargerNormes = async () => {
  try {
    const response = await AuthService.apiCall(`${BASE_URL}/api/normes/`)
    if (!response.ok) throw new Error(`Erreur ${response.status}`)
    
    const data = await response.json()
    
    if (data.results) {
      normesDisponibles.value = data.results.map((n: any) => ({ id: n.id, code: n.code }))
    } else if (Array.isArray(data)) {
      normesDisponibles.value = data.map((n: any) => ({ id: n.id, code: n.code }))
    }
    
    console.log("Normes chargées:", normesDisponibles.value)
  } catch (erreur) {
    console.error("❌ Échec chargement normes:", erreur)
  }
}


// Le tireur d'élite (Envoi vers Django)
const sauvegarderNouveauNoeud = async () => {
  try {
    console.log(" Envoi des données a Django...")

    const lat = parseFloat(formulaireNoeud.latitude)
    const lng = parseFloat(formulaireNoeud.longitude)

    // Construction du Payload au standard GeoDjango
    const payload: Record<string, any> = {
      nom_code: formulaireNoeud.nom_code,
      type_noeud: formulaireNoeud.type_noeud,
      statut_operationnel: formulaireNoeud.statut_operationnel,
      statut_energie: formulaireNoeud.statut_energie,
      est_frontiere: formulaireNoeud.est_frontiere,

      // GeoJSON : longitude en premier, latitude en second
      geometrie: {
        type: "Point",
        coordinates: [lng, lat]
      }
    }

    // Ajouter le centre partenaire seulement si c'est une frontière
    if (formulaireNoeud.est_frontiere && formulaireNoeud.centre_partenaire_id) {
      payload.centre_partenaire_id = formulaireNoeud.centre_partenaire_id
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


// Sauvegarder le nouveau câble
// Sauvegarder le nouveau câble
const sauvegarderNouveauCable = async () => {
  // =====================================================
  // VALIDATION OBLIGATOIRE
  // =====================================================

  if (!formulaireCable.nom_code.trim()) {
    alert("⚠️ Veuillez saisir un nom pour le câble")
    return
  }

  if (!formulaireCable.noeud_depart_id) {
    alert("⚠️ Veuillez sélectionner un nœud de départ")
    return
  }

  if (!formulaireCable.noeud_fin_id) {
    alert("⚠️ Veuillez sélectionner un nœud de fin")
    return
  }

  if (formulaireCable.noeud_depart_id === formulaireCable.noeud_fin_id) {
    alert("⚠️ Le nœud de départ et de fin doivent être différents")
    return
  }

  if (!formulaireCable.norme_id) {
    alert("⚠️ Veuillez sélectionner une norme de couleurs")
    return
  }

  if (!formulaireCable.centre_proprietaire_id) {
    alert("⚠️ Veuillez sélectionner un centre propriétaire")
    return
  }

  // =====================================================
  // ENVOI À L'API
  // =====================================================

  try {
    console.log("Envoi du câble à Django...")

    // Générer la géométrie LineString automatiquement depuis les coordonnées des nœuds
    const noeudDepart = noeudsDisponibles.value.find(n => n.id === formulaireCable.noeud_depart_id)
    const noeudFin = noeudsDisponibles.value.find(n => n.id === formulaireCable.noeud_fin_id)

    console.log('📍 noeudDepart:', noeudDepart)
    console.log('📍 noeudFin:', noeudFin)

    const geometrie = noeudDepart?.coords && noeudFin?.coords
      ? { type: 'LineString', coordinates: [noeudDepart.coords, noeudFin.coords] }
      : null

    console.log('📐 geometrie générée:', geometrie)

    const payload: Record<string, any> = {
      nom_code: formulaireCable.nom_code,
      noeud_depart_id: formulaireCable.noeud_depart_id,
      noeud_fin_id: formulaireCable.noeud_fin_id,
      capacite_fibres: formulaireCable.capacite_fibres,
      norme_id: formulaireCable.norme_id,
      technologie_transport: formulaireCable.technologie_transport,
      statut_physique: formulaireCable.statut_physique,
      centre_proprietaire_id: formulaireCable.centre_proprietaire_id,
      longueur_reelle_metres: formulaireCable.longueur_reelle_metres
        ? parseFloat(formulaireCable.longueur_reelle_metres)
        : null
    }

    if (geometrie) payload.geometrie = geometrie

    const response = await AuthService.apiCall(`${BASE_URL}/api/cables/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const erreur = await response.json()
      throw new Error(JSON.stringify(erreur))
    }

    console.log("✅ Câble créé avec succès")
    alert("Câble créé avec succès !")
    fermerPanneauCable()

    // Recharger l'infrastructure
    await chargerInfrastructure()

  } catch (erreur) {
    console.error("❌ Échec de la création du câble:", erreur)
    alert("Erreur lors de la création du câble. Vérifiez la console F12.")
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
  alert(`Fonctionnalité à venir : Installer manchon dans le nœud ${noeudId}`)
}

// =====================================================
// GESTION DE LA MATRICE DE SOUDURES
// =====================================================

// Filtres
const filtreCableSource = ref('')
const filtreEtat = ref('')

// Mode soudure (clic-clic)
const modeSoudure = reactive({
  actif: false,
  cableSource: null as CableMatrice | null,
  fibreSource: null as FibreMatrice | null
})

// Filtrer les fibres selon les critères
const filtrerFibres = (cable: CableMatrice) => {
  let fibres = cable.fibres
  if (filtreCableSource.value && cable.cable_id !== filtreCableSource.value) return []
  if (filtreEtat.value === 'soudees') fibres = fibres.filter(f => f.soudure_id)
  else if (filtreEtat.value === 'libres') fibres = fibres.filter(f => !f.soudure_id)
  return fibres
}

// Sélectionner une fibre (mode clic-clic)
const selectionnerFibre = (cable: CableMatrice, fibre: FibreMatrice) => {
  if (!modeSoudure.actif) {
    modeSoudure.actif = true
    modeSoudure.cableSource = cable
    modeSoudure.fibreSource = fibre
    return
  }
  if (modeSoudure.fibreSource && fibre.fibre_id !== modeSoudure.fibreSource.fibre_id) {
    creerSoudure(modeSoudure.fibreSource.fibre_id, fibre.fibre_id)
  }
}

// Annuler le mode soudure
const annulerSoudure = () => {
  modeSoudure.actif = false
  modeSoudure.cableSource = null
  modeSoudure.fibreSource = null
}

// Créer une soudure via API
const creerSoudure = async (fibreEntranteId: string, fibreSortanteId: string) => {
  try {
    const response = await AuthService.apiCall(`${BASE_URL}/api/soudures/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fibre_entrante_id: fibreEntranteId,
        fibre_sortante_id: fibreSortanteId,
        statut: 'OK'
      })
    })
    if (!response.ok) throw new Error(`Erreur ${response.status}`)
    annulerSoudure()
    if (manchonIdEnMatrice.value) await voirSoudures(manchonIdEnMatrice.value, manchonNomEnMatrice.value ?? undefined)
    console.log('✅ Soudure créée')
  } catch (erreur) {
    console.error('❌ Échec création soudure:', erreur)
    alert('Impossible de créer la soudure')
  }
}

// Supprimer une soudure
const supprimerSoudure = async (soudureId: string) => {
  if (!confirm('Supprimer cette soudure ?')) return
  try {
    const response = await AuthService.apiCall(`${BASE_URL}/api/soudures/${soudureId}/`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error(`Erreur ${response.status}`)
    if (manchonIdEnMatrice.value) await voirSoudures(manchonIdEnMatrice.value, manchonNomEnMatrice.value ?? undefined)
    console.log('✅ Soudure supprimée')
  } catch (erreur) {
    console.error('❌ Échec suppression soudure:', erreur)
    alert('Impossible de supprimer la soudure')
  }
}

// Souder tout 1:1 (automatique)
const souderTout1a1 = async () => {
  if (!confirm('Souder toutes les fibres 1:1 ? (F1↔F1, F2↔F2, etc.)')) return
  // TODO: Appel API batch
  alert('Fonctionnalité à implémenter : soudure batch 1:1')
}

// Désouder tout
const dessouderTout = async () => {
  if (!confirm('Supprimer TOUTES les soudures de ce manchon ?')) return
  // TODO: Appel API batch
  alert('Fonctionnalité à implémenter : suppression batch')
}

// Obtenir la couleur hex d'une fibre par nom
const getCouleurParNom = (nomCouleur: string | null) => {
  return COULEURS_FIBRES[nomCouleur ?? 'INCONNUE'] ?? COULEURS_FIBRES['INCONNUE']
}

const fermerMatrice = () => {
  afficherMatrice.value = false
  manchonEnMatrice.value = null
  manchonNomEnMatrice.value = null
  manchonIdEnMatrice.value = null
  modeSoudure.actif = false
  modeSoudure.cableSource = null
  modeSoudure.fibreSource = null
}

// Voir les soudures d'un manchon — ouvre la matrice de soudures
const voirSoudures = async (manchonId: string, manchonNom?: string) => {
  try {
    chargementMatrice.value = true
    afficherMatrice.value = true
    manchonIdEnMatrice.value = manchonId
    manchonNomEnMatrice.value = manchonNom ?? manchonId

    const response = await AuthService.apiCall(`${BASE_URL}/api/manchons/${manchonId}/matrice/`)
    if (!response.ok) throw new Error(`Erreur ${response.status}`)

    const data: ContenuMatrice = await response.json()
    manchonEnMatrice.value = data

  } catch (erreur) {
    console.error('❌ Échec chargement matrice soudures:', erreur)
    alert('Impossible de charger la matrice de soudures')
    fermerMatrice()
  } finally {
    chargementMatrice.value = false
  }
}

// Ajouter un manchon dans cette chambre
const ajouterManchon = (noeudId: string) => {
  // TODO: Ouvrir formulaire création manchon
  alert(`Ajouter manchon dans le nœud ${noeudId}`)
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


//====================================================
// GESTION DES CENTRES 
//====================================================

// Liste des centres pour le dropdown partenaire
const centresDisponibles = ref<{ id: string, nom: string }[]>([])

// Charger les centres au démarrage
const chargerCentres = async () => {
  try {
    const response = await AuthService.apiCall(`${BASE_URL}/api/centres/`)
    if (!response.ok) throw new Error(`Erreur ${response.status}`)
    
    const data = await response.json()

    // L'API centres retourne un GeoJSON FeatureCollection
    // Cas 1 : pagination DRF  → data.results.features
    // Cas 2 : GeoJSON direct  → data.features
    // Cas 3 : tableau simple  → data
    let liste: any[] = []
    if (data.results?.features) {
      liste = data.results.features
    } else if (data.features) {
      liste = data.features
    } else if (Array.isArray(data.results)) {
      liste = data.results
    } else if (Array.isArray(data)) {
      liste = data
    }

    centresDisponibles.value = liste.map((c: any) => ({
      id: c.id ?? c.properties?.id,
      nom: c.properties?.nom_centre || c.properties?.nom || c.nom_centre || c.nom || 'Centre sans nom'
    }))
    
    console.log("Centres chargés:", centresDisponibles.value)
  } catch (erreur) {
    console.error("❌ Échec chargement centres:", erreur)
  }
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
    console.log("📦 Réponse brute câbles:", donneesCables)
    let valiseGeoJson = null
    if (donneesCables.results && donneesCables.results.type === 'FeatureCollection') {
      valiseGeoJson = donneesCables.results
    } else if (donneesCables.type === 'FeatureCollection') {
      valiseGeoJson = donneesCables
    }
    console.log("🗺️ valiseGeoJson câbles:", valiseGeoJson)
    if (valiseGeoJson) dessinerCables(valiseGeoJson)
    else console.warn("⚠️ Aucun GeoJSON câbles trouvé dans la réponse")

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
onMounted(async () => {
  // Charger le profil utilisateur connecté
  const repMe = await AuthService.apiCall(`${BASE_URL}/api/utilisateurs/me/`)
  if (repMe.ok) {
    const moi = await repMe.json()
    const prenom = moi.first_name?.trim()
    const nom = moi.last_name?.trim()
    utilisateurNom.value = prenom || nom
      ? `${prenom} ${nom}`.trim()
      : moi.username
  }

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

  // chargement des centres
  await chargerCentres()

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
        <span v-if="utilisateurNom" class="text-xs text-gray-500 hidden md:block">👤 {{ utilisateurNom }}</span>
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
        <!-- Bouton + avec menu déroulant (Nœud / Câble) -->
        <div class="relative">
          <button @click="ouvrirMenuCreation"
                  class="p-1.5 hover:bg-emerald-50 rounded transition text-emerald-600" title="Créer...">
            <span class="text-sm font-bold">➕</span>
          </button>

          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-2"
          >
            <div v-if="menuCreationOuvert"
                 class="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[160px] z-10">

              <button @click="choisirCreation('noeud')"
                      class="w-full px-4 py-3 text-left text-sm hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-100">
                <span class="text-lg">📍</span>
                <span class="font-medium text-gray-700">Nouveau Nœud</span>
              </button>

              <button @click="choisirCreation('cable')"
                      class="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 flex items-center gap-3">
                <span class="text-lg">🔌</span>
                <span class="font-medium text-gray-700">Nouveau Câble</span>
              </button>
            </div>
          </transition>
        </div>
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
              
              <!-- Nom du nœud -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Nom / Code du site</label>
                <input v-model="formulaireNoeud.nom_code" type="text" placeholder="Ex: CT-YAO-01" class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none">
              </div>

              <!-- Type d'infrastructure -->
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

              <!-- Option frontière — visible uniquement pour les manchons -->
              <div v-if="['MANCHON', 'MANCHON_ENTERRE', 'MANCHON_AERIEN'].includes(formulaireNoeud.type_noeud)"
                   class="bg-amber-50 p-3 rounded border border-amber-200">

                <!-- Case à cocher point frontière -->
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                         v-model="formulaireNoeud.est_frontiere"
                         class="w-4 h-4 text-amber-600 rounded focus:ring-amber-500">
                  <span class="text-xs font-bold text-amber-700">🏁 Point frontière</span>
                </label>
                <p class="text-[10px] text-amber-600 mt-1 ml-6">
                  Cochez si ce manchon est à la limite de votre zone
                </p>

                <!-- Sélection du centre partenaire — visible si frontière cochée -->
                <div v-if="formulaireNoeud.est_frontiere" class="mt-3 ml-6">
                  <label class="block text-xs font-bold text-amber-700 mb-1">Centre partenaire</label>
                  <select v-model="formulaireNoeud.centre_partenaire_id"
                          class="w-full text-xs p-1.5 border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 outline-none bg-white">
                    <option value="">-- Sélectionner --</option>
                    <option v-for="centre in centresDisponibles" :key="centre.id" :value="centre.id">
                      {{ centre.nom }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- État opérationnel et énergie -->
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

              <!-- Coordonnées GPS -->
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
           FENÊTRE DE CRÉATION DE CÂBLE
      ===================================================== -->
      <transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div v-if="panneauCableOuvert"
             class="absolute z-[3000] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
             style="width: 340px; max-height: 85vh;"
             :style="{ left: fenetres.creationCable.x + 'px', top: fenetres.creationCable.y + 'px' }"
             @mousedown.stop @click.stop>

          <!-- Barre de titre draggable -->
          <div @mousedown.stop.prevent="demarrerDrag($event, 'creationCable')"
               class="bg-blue-50 px-4 py-3 border-b border-blue-200 cursor-move flex justify-between items-center select-none">
            <h3 class="font-bold text-blue-800 text-sm flex items-center gap-2">
              <span class="text-blue-600">🔌</span> Nouveau Câble
            </h3>
            <button @mousedown.stop @click.stop="fermerPanneauCable"
                    class="text-gray-400 hover:text-red-500 text-xl font-bold leading-none">&times;</button>
          </div>

          <!-- Formulaire -->
          <div class="p-4 flex-1 overflow-y-auto flex flex-col gap-3" @mousedown.stop>

            <p class="text-xs text-gray-500 mb-2 font-medium">
              Créez un câble en reliant deux nœuds existants.
            </p>

            <!-- Nom du câble -->
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nom / Code du câble</label>
              <input v-model="formulaireCable.nom_code" type="text" placeholder="Ex: CABLE_MBA_YAO_001"
                     class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none">
            </div>

            <!-- Nœud départ -->
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nœud de départ</label>
              <select v-model="formulaireCable.noeud_depart_id"
                      class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">-- Sélectionner --</option>
                <option v-for="noeud in noeudsDisponibles" :key="noeud.id" :value="noeud.id">
                  {{ noeud.nom }} ({{ noeud.type }})
                </option>
              </select>
            </div>

            <!-- Nœud fin -->
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nœud de fin</label>
              <select v-model="formulaireCable.noeud_fin_id"
                      class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none">
                <option value="">-- Sélectionner --</option>
                <option v-for="noeud in noeudsDisponibles" :key="noeud.id" :value="noeud.id"
                        :disabled="noeud.id === formulaireCable.noeud_depart_id">
                  {{ noeud.nom }} ({{ noeud.type }})
                </option>
              </select>
            </div>

            <!-- Capacité et Norme -->
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-xs font-bold text-gray-700 mb-1">Capacité (fibres)</label>
                <select v-model="formulaireCable.capacite_fibres"
                        class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                  <option :value="6">6 FO</option>
                  <option :value="12">12 FO</option>
                  <option :value="24">24 FO</option>
                  <option :value="48">48 FO</option>
                  <option :value="72">72 FO</option>
                  <option :value="96">96 FO</option>
                  <option :value="144">144 FO</option>
                  <option :value="288">288 FO</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-bold text-gray-700 mb-1">Norme couleurs *</label>
                <select v-model="formulaireCable.norme_id"
                        class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                  <option value="">-- Sélectionner --</option>
                  <option v-for="norme in normesDisponibles" :key="norme.id" :value="norme.id">
                    {{ norme.code }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Technologie et Statut -->
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-xs font-bold text-gray-700 mb-1">Technologie</label>
                <select v-model="formulaireCable.technologie_transport"
                        class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                  <option value="FO">Fibre Optique</option>
                  <option value="FH">Faisceau Hertzien</option>
                  <option value="SAT">Satellite</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-bold text-gray-700 mb-1">Statut</label>
                <select v-model="formulaireCable.statut_physique"
                        class="w-full text-xs p-1.5 border border-gray-300 rounded outline-none">
                  <option value="EN_SERVICE">En service</option>
                  <option value="EN_PROJET">En projet</option>
                  <option value="HORS_SERVICE">Hors service</option>
                </select>
              </div>
            </div>

            <!-- Centre propriétaire — rempli automatiquement depuis le profil utilisateur -->
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Centre propriétaire</label>
              <div v-if="centreUtilisateurNom"
                   class="w-full text-sm p-1.5 border border-gray-200 rounded bg-gray-50 text-gray-600 flex items-center gap-2">
                <span class="text-xs">🏢</span>
                <span>{{ centreUtilisateurNom }}</span>
              </div>
              <div v-else class="w-full text-sm p-1.5 border border-red-200 rounded bg-red-50 text-red-600 text-xs">
                ⚠️ Aucun centre assigné à votre profil — contactez un administrateur
              </div>
            </div>

            <!-- Longueur -->
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Longueur (mètres)</label>
              <input v-model="formulaireCable.longueur_reelle_metres" type="number" placeholder="Ex: 12500"
                     class="w-full text-sm p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none">
            </div>

          </div>

          <!-- Boutons -->
          <div class="p-3 border-t border-gray-200 bg-gray-50 flex gap-2 justify-end" @mousedown.stop>
            <button @click="fermerPanneauCable"
                    class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100">
              Annuler
            </button>
            <button @click="sauvegarderNouveauCable"
                    class="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 shadow-sm">
              Créer Câble
            </button>
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
        <template v-if="!['CHAMBRE', 'MANCHON', 'MANCHON_ENTERRE', 'MANCHON_AERIEN'].includes(noeudEnInspection.type_noeud)">

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

        <!-- ========== CONTENU MANCHON (MANCHON, MANCHON_ENTERRE, MANCHON_AERIEN) ========== -->
        <template v-else-if="['MANCHON', 'MANCHON_ENTERRE', 'MANCHON_AERIEN'].includes(noeudEnInspection.type_noeud)">

          <!-- SECTION : Câbles en transit -->
          <div class="mb-4">
            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
              🔌 Câbles en transit
              <span class="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {{ noeudEnInspection.contenu.cables?.length || 0 }}
              </span>
            </h4>

            <div v-if="noeudEnInspection.contenu.cables?.length > 0" class="space-y-2">
              <div v-for="cable in noeudEnInspection.contenu.cables" :key="cable.id"
                   class="bg-blue-50 border border-blue-200 rounded-lg p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                   @click="inspecterCable(cable.id)">
                <div class="flex justify-between items-center">
                  <span class="font-semibold text-blue-800 text-sm">{{ cable.nom_code || 'Câble sans nom' }}</span>
                  <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                    {{ cable.capacite_fibres }} FO
                  </span>
                </div>
                <div class="flex justify-between text-xs text-blue-600 mt-1">
                  <span>{{ cable.technologie_transport || 'N/A' }}</span>
                  <span>{{ formaterLongueur(cable.longueur_reelle_metres) }}</span>
                </div>
              </div>
            </div>

            <p v-else class="text-xs text-gray-400 italic">Aucun câble en transit</p>
          </div>

          <!-- SECTION : Manchons installés -->
          <div class="mb-4">
            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
              🔶 Manchons installés
              <span class="bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {{ noeudEnInspection.contenu.manchons?.length || 0 }}
              </span>
            </h4>

            <div v-if="(noeudEnInspection.contenu.manchons?.length ?? 0) > 0" class="space-y-2">
              <div v-for="manchon in noeudEnInspection.contenu.manchons" :key="manchon.id"
                   class="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <div class="flex justify-between items-center">
                  <span class="font-semibold text-amber-800 text-sm">🔶 {{ manchon.nom_reference || 'Manchon sans nom' }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full"
                        :class="manchon.etat === 'BON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                    {{ manchon.etat || 'Inconnu' }}
                  </span>
                </div>
                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-amber-600">{{ manchon.type_label }}</span>
                  <button
                    @click="voirSoudures(manchon.id, manchon.nom_reference ?? undefined)"
                    class="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-2 rounded transition-colors">
                    🔍 Soudures
                  </button>
                </div>
              </div>
            </div>

            <p v-else class="text-xs text-gray-400 italic">Aucun manchon installé</p>
          </div>

          <!-- Bouton ajouter manchon -->
          <button
            @click="ajouterManchon(noeudEnInspection.id)"
            class="w-full bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold py-2 px-4 rounded border border-amber-300 transition-colors">
            ➕ Ajouter un manchon
          </button>

        </template><!-- fin v-else-if MANCHON -->

      </div>
    </div>
  </div>
</transition>

     
    

      <!-- ========== PANNEAU MATRICE DE SOUDURES ========== -->
      <transition
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="translate-y-4 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-transform duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-4 opacity-0"
      >
        <div v-if="afficherMatrice"
             class="absolute z-[5000] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden"
             style="width: 520px; max-height: 85vh;"
             :style="{ left: fenetres.matrice.x + 'px', top: fenetres.matrice.y + 'px' }"
             @mousedown.stop @click.stop>

          <!-- Barre de titre draggable -->
          <div @mousedown.stop.prevent="demarrerDrag($event, 'matrice')"
               class="px-4 py-3 cursor-move flex justify-between items-center select-none bg-amber-50 border-b border-amber-200">
            <h3 class="font-bold text-sm text-amber-800 flex items-center gap-2">
              🔶 Matrice de soudures
              <span v-if="manchonNomEnMatrice" class="font-normal text-amber-600">— {{ manchonNomEnMatrice }}</span>
            </h3>
            <button @mousedown.stop @click.stop="fermerMatrice"
                    class="text-gray-400 hover:text-red-500 text-xl font-bold leading-none p-1">&times;</button>
          </div>

          <!-- Contenu -->
          <div class="flex-1 overflow-y-auto p-4" @mousedown.stop>

            <!-- Chargement -->
            <div v-if="chargementMatrice" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent"></div>
            </div>

            <!-- Données chargées -->
            <div v-else-if="manchonEnMatrice">

              <!-- Stats -->
              <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                  <p class="text-lg font-bold text-gray-700">{{ manchonEnMatrice.stats.total_fibres }}</p>
                  <p class="text-[10px] text-gray-500 uppercase">Total fibres</p>
                </div>
                <div class="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                  <p class="text-lg font-bold text-green-700">{{ manchonEnMatrice.stats.fibres_soudees }}</p>
                  <p class="text-[10px] text-green-500 uppercase">Soudées</p>
                </div>
                <div class="bg-orange-50 rounded-lg p-2 text-center border border-orange-200">
                  <p class="text-lg font-bold text-orange-700">{{ manchonEnMatrice.stats.fibres_libres }}</p>
                  <p class="text-[10px] text-orange-500 uppercase">Libres</p>
                </div>
              </div>

              <!-- Filtres -->
              <div class="flex gap-2 mb-3">
                <select v-model="filtreCableSource"
                        class="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-400">
                  <option value="">Tous les câbles</option>
                  <option v-for="c in manchonEnMatrice.cables" :key="c.cable_id" :value="c.cable_id">
                    {{ c.cable_nom }}
                  </option>
                </select>
                <select v-model="filtreEtat"
                        class="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-400">
                  <option value="">Toutes les fibres</option>
                  <option value="soudees">Soudées</option>
                  <option value="libres">Libres</option>
                </select>
              </div>

              <!-- Bannière mode soudure -->
              <div v-if="modeSoudure.actif"
                   class="mb-3 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 flex justify-between items-center">
                <span class="text-xs text-amber-700 font-medium">
                  🔗 Source : <b>{{ modeSoudure.cableSource?.cable_nom }}</b>
                  T{{ modeSoudure.fibreSource?.numero_tube }}-F{{ modeSoudure.fibreSource?.numero_fibre }}
                  — Cliquez la fibre destination
                </span>
                <button @click="annulerSoudure"
                        class="text-xs text-red-500 hover:text-red-700 font-bold">Annuler</button>
              </div>

              <!-- Câbles et fibres -->
              <div v-for="cable in manchonEnMatrice.cables" :key="cable.cable_id" class="mb-4">
                <h4 class="text-xs font-bold text-gray-600 uppercase mb-2 flex items-center gap-2">
                  🔌 {{ cable.cable_nom }}
                  <span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-normal">
                    {{ cable.capacite }} FO
                  </span>
                </h4>

                <div class="space-y-1">
                  <div v-for="fibre in filtrerFibres(cable)" :key="fibre.fibre_id"
                       class="flex items-center gap-2 text-xs rounded px-2 py-1 cursor-pointer transition-colors"
                       :class="[
                         modeSoudure.fibreSource?.fibre_id === fibre.fibre_id
                           ? 'bg-amber-100 border border-amber-400 ring-1 ring-amber-300'
                           : fibre.soudure_id
                             ? 'bg-green-50 border border-green-100 hover:bg-green-100'
                             : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                       ]"
                       @click="selectionnerFibre(cable, fibre)">

                    <!-- Pastille couleur fibre -->
                    <span class="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
                          :style="{ backgroundColor: fibre.code_couleur_hex ?? getCouleurParNom(null) }"></span>

                    <!-- Tube / Fibre -->
                    <span class="text-gray-500 w-16 flex-shrink-0">T{{ fibre.numero_tube }}-F{{ fibre.numero_fibre }}</span>

                    <!-- Connexion -->
                    <span v-if="fibre.fibre_connectee_cable" class="text-green-700 flex-1 truncate">
                      ↔ {{ fibre.fibre_connectee_cable }} T{{ fibre.fibre_connectee_tube }}-F{{ fibre.fibre_connectee_numero }}
                    </span>
                    <span v-else class="text-gray-400 flex-1 italic">Libre</span>

                    <!-- Statut soudure -->
                    <span v-if="fibre.soudure_statut"
                          class="px-1.5 py-0.5 rounded-full text-[10px]"
                          :class="fibre.soudure_statut === 'BON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                      {{ fibre.soudure_statut }}
                    </span>

                    <!-- Bouton supprimer soudure -->
                    <button v-if="fibre.soudure_id"
                            @click.stop="supprimerSoudure(fibre.soudure_id)"
                            class="text-red-400 hover:text-red-600 font-bold text-xs leading-none px-1">✕</button>
                  </div>
                </div>
              </div>

              <!-- Actions batch -->
              <div class="flex gap-2 pt-3 border-t border-gray-200 mt-2">
                <button @click="souderTout1a1"
                        class="flex-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-bold py-1.5 px-3 rounded border border-green-200 transition-colors">
                  ⚡ Souder 1:1
                </button>
                <button @click="dessouderTout"
                        class="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold py-1.5 px-3 rounded border border-red-200 transition-colors">
                  🗑 Tout désouder
                </button>
              </div>

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