// =====================================================
// INTERFACES PARTAGÉES — Carte réseau optique
// =====================================================

export interface Fibre {
  id: string
  url: string
  numero_tube: number
  numero_fibre: number
  code_couleur_hex: string | null
  etat: string | null
}

export interface NormeCouleurs {
  id: string
  url: string
  code: string
  description: string
  sequence_couleurs: string[]
}

export interface CableInspection {
  id: string
  url: string
  nom_code: string
  capacite_fibres: number
  longueur_reelle_metres: number | null
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

export interface BoitierResum {
  id: string
  url: string
  nom_reference: string | null
  type_boitier: string
  type_label: string
  nombre_cassettes: number | null
  etat: string | null
  date_installation: string | null
}

export interface CableResum {
  id: string
  url: string
  nom_code: string | null
  capacite_fibres: number | null
  technologie_transport: string | null
  statut_physique: string | null
  longueur_reelle_metres: number | null
}

export interface EquipementResum {
  id: string
  nom: string | null
  type: string | null
  statut: string | null
  marque: string | null
}

export interface ManchonResum {
  id: string
  nom_reference: string | null
  type_manchon: string
  type_label: string
  etat: string | null
  capacite_fibres: number | null
}

export interface FibreMatrice {
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

export interface CableMatrice {
  cable_id: string
  cable_url: string
  cable_nom: string
  capacite: number
  fibres: FibreMatrice[]
}

export interface SoudureMatrice {
  id: string
  fibre_entrante_id: string
  fibre_sortante_id: string
  statut: string
}

export interface ContenuMatrice {
  cables: CableMatrice[]
  soudures: SoudureMatrice[]
  stats: {
    total_fibres: number
    fibres_soudees: number
    fibres_libres: number
  }
}

export interface NoeudCentreInspection {
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
