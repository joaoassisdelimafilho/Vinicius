// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBP_0G13P-jJAaZe0XFi_0Mtp3l02-cAc4",
  authDomain: "fazenda-e5e25.firebaseapp.com",
  projectId: "fazenda-e5e25",
  storageBucket: "fazenda-e5e25.firebasestorage.app",
  messagingSenderId: "531227081563",
  appId: "1:531227081563:web:391f17caa7e7be090d387e"
};

// Inicialização (Será completada nos arquivos HTML)
const costs = { 
    'BAGAÇO DE CANA': 0.10, 
    'BOLACHA': 0.95, 
    'SOJA': 1.38, 
    'MANDIOCA': 0.10, 
    'LARANJA': 0.06, 
    'SAL': 3.16, 
    'UREIA': 2.90 
};

const aliasMap = { 
    'BAG': 'BAGAÇO DE CANA', 
    'BOL': 'BOLACHA', 
    'S': 'SAL', 
    'M': 'MANDIOCA', 
    'L': 'LARANJA' 
};
