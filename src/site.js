import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import Site from './Site.vue'
import Phone from './components/Phone.vue'
import Privacy from "./Privacy.vue";
import Terms from "./Terms.vue";

const router = createRouter({
    history: createWebHistory('/'),
    routes: [
        { path: "/", name: "Phone", component: Phone, },
        { path: "/privacy", name: "Privacy", component: Privacy, },
        { path: "/terms", name: "Terms", component: Terms, },
    ],
});

createApp(Site).use(router).mount('#app')
