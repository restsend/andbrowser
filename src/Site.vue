<script setup>
import './assets/fonts/font.css'
import Phone from './components/Phone.vue'
import NavVue from './Nav.vue';
import FooterVue from './Footer.vue';

</script>

<template>
  <div class="max-w-full">
    <NavVue/>
    <div class="px-4 py-2  pb-20 lg:pb-30">
      <div class="px-4 py-2">
        <router-view/>
      </div>
    </div>
    <FooterVue/>
  </div>
</template>
