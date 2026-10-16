// Proxy de desarrollo: el navegador llama a /api (mismo origen que ng serve) y el dev-server
// reenvía al backend. Así no se depende de CORS ni se quema el puerto en el código.
//   BACKEND_URL=http://localhost:8081 npm start
const target = process.env.BACKEND_URL || 'http://localhost:8080';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    // Igual que nginx: se elimina Origin para que el filtro CORS del backend no rechace los POST
    // cuando ng serve corre en un puerto distinto a los orígenes permitidos (p. ej. --port 4300).
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
    },
  },
};
