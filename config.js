// Configuração do Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyCj4MjRuBDuuB64uDP842lQmPRiDZFkdzs",
  authDomain: "gestaofazenda-eafe6.firebaseapp.com",
  projectId: "gestaofazenda-eafe6",
  storageBucket: "gestaofazenda-eafe6.firebasestorage.app",
  messagingSenderId: "578761466518",
  appId: "1:578761466518:web:acf098f3f4f99ffd23d8b7"
};

// Mapeamento das Receitas
export const receitasDicionario = {
  "1": "Trato de Engorda",
  "2": "Trato de Adaptação",
  "3": "Bezerro",
  "BEZERRO": "Bezerro"
};

// Mapeamento de Componentes e Preços por KG
export const componentesDicionario = {
  "BAG": { nome: "Bagaço de Cana", precoKg: 0.10 },
  "BOL": { nome: "Farelo de Arroz/Bolacha", precoKg: 0.95 },
  "S":   { nome: "Soja", precoKg: 1.38 },
  "L":   { nome: "Laranja", precoKg: 0.06 },
  "M":   { nome: "Mandioca", precoKg: 0.10 },
  "SILO": { nome: "Silo", precoKg: 0.01 } // Atualizar preço quando tiver
};