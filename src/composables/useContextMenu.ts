import { ref, reactive } from 'vue'

export interface MenuItem {
  icon: string
  label: string
  action: () => void
  variant?: 'default' | 'danger' | 'highlight'
  separateurApres?: boolean  // afficher une ligne de séparation après cet item
}

export function useContextMenu() {
  const visible = ref(false)
  const position = reactive({ x: 0, y: 0 })
  const items = ref<MenuItem[]>([])

  const afficher = (nouveauxItems: MenuItem[], x: number, y: number) => {
    items.value = nouveauxItems
    position.x = x
    position.y = y
    visible.value = true
  }

  const fermer = () => {
    visible.value = false
  }

  const executerItem = (item: MenuItem) => {
    fermer()
    item.action()
  }

  return { visible, position, items, afficher, fermer, executerItem }
}