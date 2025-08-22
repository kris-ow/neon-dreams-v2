// Neon Dreams v2 — bootstrap
import './styles/main.css';

const app = document.getElementById('app');
if (app) {
  app.innerHTML = '';
}

console.log('Neon Dreams v2 — clean bootstrap loaded');
// sanity-deploy marker
document.getElementById('app').textContent = 'Deployed via Netlify — ' + new Date().toLocaleString();
