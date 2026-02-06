import { db, auth } from './firebase-init.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { componentesDicionario, receitasDicionario } from './config.js';

const statusMsg = document.getElementById('status');

window.fazerLogin = () => {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    statusMsg.innerText = "Verificando credenciais...";
    signInWithEmailAndPassword(auth, email, senha)
        .catch(error => { statusMsg.style.color = "red"; statusMsg.innerText = "Erro: " + error.message; });
};

window.fazerSair = () => signOut(auth);
window.irParaDashboard = () => { window.location.href = "index.html"; };

onAuthStateChanged(auth, (user) => {
    document.getElementById('area-login').classList.toggle('hidden', !!user);
    document.getElementById('area-upload').classList.toggle('hidden', !user);
});

async function processarArquivoIndividual(file) {
    const idArquivo = file.name.toUpperCase().replace(".CSV", "").trim();
    try {
        const docRef = doc(db, "tratos", idArquivo);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return { sucesso: false };

        return new Promise((resolve, reject) => {
            const leitor = new FileReader();
            leitor.onload = async (e) => {
                try {
                    const texto = e.target.result;
                    const linhas = texto.split('\n').map(l => l.trim());
                    let idReceita = "", dataOriginal = "", componentesEncontrados = [], prejuizoAcumulado = 0;

                    const idxHeaderReceita = linhas.findIndex(l => l.includes("ID da receita;Nome da receita;Data"));
                    if (idxHeaderReceita !== -1) {
                        const colunas = linhas[idxHeaderReceita + 1].split(';');
                        idReceita = colunas[1]?.trim();
                        dataOriginal = colunas[3]?.trim();
                    }

                    const [d, m, a] = dataOriginal.split('/');
                    const dataISO = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

                    const idxHeaderComp = linhas.findIndex(l => l.includes("ID do componente;Nome do componente"));
                    if (idxHeaderComp !== -1) {
                        for (let i = idxHeaderComp + 1; i < linhas.length; i++) {
                            const col = linhas[i].split(';');
                            if (col.length < 4 || isNaN(parseInt(col[0]))) break;

                            const sigla = col[1].trim();
                            const pProg = parseFloat(col[2].replace(',', '.'));
                            const pReal = parseFloat(col[3].replace(',', '.'));
                            
                            // CÁLCULO FORÇADO: Real menos Programado
                            const pExcesso = Math.max(0, pReal - pProg);
                            
                            const config = componentesDicionario[sigla];
                            if (config) {
                                const custo = pExcesso * config.precoKg;
                                componentesEncontrados.push({
                                    nome: config.nome,
                                    programado: pProg,
                                    real: pReal,
                                    excesso: pExcesso,
                                    prejuizo: parseFloat(custo.toFixed(2))
                                });
                                prejuizoAcumulado += custo;
                            }
                        }
                    }

                    await setDoc(docRef, {
                        arquivoOrigem: idArquivo,
                        receita: receitasDicionario[idReceita] || "Receita " + idReceita,
                        dataISO, dataBR: dataOriginal,
                        componentes: componentesEncontrados,
                        prejuizoTotal: parseFloat(prejuizoAcumulado.toFixed(2)),
                        enviadoEm: new Date()
                    });
                    resolve({ sucesso: true });
                } catch (erro) { reject(erro); }
            };
            leitor.readAsText(file, 'ISO-8859-1');
        });
    } catch (err) { throw err; }
}

document.getElementById('btn-enviar').addEventListener('click', async () => {
    const files = document.getElementById('arquivoCsv').files;
    if (files.length === 0) return alert("Selecione arquivos.");
    statusMsg.style.color = "blue";
    let ok = 0, pulei = 0;
    for (let i = 0; i < files.length; i++) {
        statusMsg.innerText = `Processando ${i + 1}/${files.length}...`;
        const res = await processarArquivoIndividual(files[i]);
        res.sucesso ? ok++ : pulei++;
    }
    statusMsg.style.color = "green";
    statusMsg.innerText = `✅ Fim! ${ok} novos, ${pulei} duplicados.`;
});