<script>
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import TechGridBackground from './components/TechGridBackground.vue';

export default defineComponent({
  name: 'App',
  components: {
    TechGridBackground
  },
  setup() {
    const router = useRouter();
    return {
      router
    };
  }
});
</script>

<template>
  <div class="app-container">
    <TechGridBackground />
    <router-view />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
}

.app-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  height: auto;
  background: transparent;
}

:root {
  --primary-color: #4CAF50;
  --error-color: #e74c3c;
  --background-color: transparent;
  --surface-color: rgba(20, 30, 60, 0.3);
  --text-color: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --border-color: rgba(30, 144, 255, 0.5);
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: transparent;
  color: var(--text-color);
}

.panel {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  backdrop-filter: blur(1px);
  box-shadow: 0 0 15px rgba(30, 144, 255, 0.3);
}

.panel-header {
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.tech-text {
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}
</style>
