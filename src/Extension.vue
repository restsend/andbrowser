<script setup>
import './assets/fonts/font.css'
import NavVue from './Nav.vue';
import Phone from './components/Phone.vue'

</script>

<template>
  <div class="max-w-full">
    <NavVue home="/extension.html"/>
    <div class="px-4 py-2  pb-20 lg:pb-30">
      <div class="px-4 py-2">
        <Phone />
      </div>
    </div>
  </div>
</template>

