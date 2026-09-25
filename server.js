// Punto de entrada para hostings que buscan un archivo en la raíz del
// proyecto (p. ej. Hostinger). Arranca el backend, que también sirve el
// frontend compilado en frontend/dist.
require('./backend/server').startServer();
