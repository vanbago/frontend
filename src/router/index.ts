import { createRouter, createWebHistory } from 'vue-router'
import  MonitoringDashboard from  '../Monitoring/MonitoringDashboard.vue'
import  Login from  '../Login.vue'
import AuthService from '../services/auth'



// On définira ces composants juste après
const router = createRouter({
  history: createWebHistory(import .meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Carte',
      component: () => import('../MapView.vue') // Chargement fainéant (rapide)
    },
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    
    {
      path: '/inventaire',
      name: 'Inventaire',
      component: () => import('../InventaireView.vue')
    },
    {
      path: '/monitoring',
      name: 'Monitoring',
      component: MonitoringDashboard
    }
  ]
})

router.beforeEach((to, from, next) => {
  const token = AuthService.getAccessToken()
  if (to.name !== 'Login' && !token) {
    next({name : 'Login'})
  } else {
    next()
  }
})

export default router

