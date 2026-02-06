import { db } from './firebase-init.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let todosOsDados = [];
let chartEvolucao = null;
const inputInicio = document.getElementById('data-inicio');
const inputFim = document.getElementById('data-fim');

function obterCorEfic(v) { return v >= 95 ? "#00f2ff" : (v >= 85 ? "#7cc6fe" : "#ff4b66"); }

async function inicializar() {
    const q = query(collection(db, "tratos"), orderBy("dataISO", "asc"));
    try {
        const querySnapshot = await getDocs(q);
        todosOsDados = querySnapshot.docs.map(doc => doc.data());
        if (todosOsDados.length > 0) {
            inputInicio.value = todosOsDados[0].dataISO;
            inputFim.value = todosOsDados[todosOsDados.length - 1].dataISO;
        }
        processar(todosOsDados);
    } catch (e) { console.error(e); }
}

function processar(dados) {
    const receitas = {
        "Trato de Engorda": { r: 0, p: 0, d: 0, q: 0, itens: {} },
        "Trato de Adaptação": { r: 0, p: 0, d: 0, q: 0, itens: {} },
        "Bezerro": { r: 0, p: 0, d: 0, q: 0, itens: {} }
    };
    const rankingGlobal = {};
    let gP = 0, gD = 0, gVal = 0;

    dados.forEach(trato => {
        const rec = trato.receita;
        if (receitas[rec]) {
            receitas[rec].r += trato.prejuizoTotal;
            receitas[rec].q++;
            gVal += trato.prejuizoTotal;
            trato.componentes.forEach(c => {
                if (!receitas[rec].itens[c.nome]) receitas[rec].itens[c.nome] = { p: 0, d: 0, v: 0 };
                const it = receitas[rec].itens[c.nome];
                it.p += c.programado; it.d += c.excesso; it.v += c.prejuizo;
                receitas[rec].p += c.programado; receitas[rec].d += c.excesso;
                gP += c.programado; gD += c.excesso;

                if (!rankingGlobal[c.nome]) rankingGlobal[c.nome] = { kg: 0, valor: 0 };
                rankingGlobal[c.nome].kg += c.excesso;
                rankingGlobal[c.nome].valor += c.prejuizo;
            });
        }
    });

    const efG = gP > 0 ? Math.max(0, (100 - ((gD / gP) * 100))) : 100;
    const bG = document.getElementById('barra-global');
    bG.style.width = efG.toFixed(1) + "%"; bG.innerText = efG.toFixed(1) + "% EFICIÊNCIA TOTAL";
    bG.style.background = obterCorEfic(efG);
    document.getElementById('perda-global').innerText = `R$ ${gVal.toLocaleString('pt-BR')}`;

    atualizarCard("engorda", receitas["Trato de Engorda"]);
    atualizarCard("adaptacao", receitas["Trato de Adaptação"]);
    atualizarCard("bezerro", receitas["Bezerro"]);
    
    renderizarRankings(rankingGlobal);
    // MOSTRA ÚLTIMOS 60 REGISTROS NO GRÁFICO
    renderizarGrafico(dados.slice(-60));
}

function renderizarRankings(ranking) {
    const lista = Object.keys(ranking).map(nome => ({ nome, ...ranking[nome] }));
    const topKG = [...lista].sort((a,b) => b.kg - a.kg).slice(0, 6);
    document.getElementById('rank-kg').innerHTML = topKG.map(i => `<div class="rank-item"><span>${i.nome}</span><span class="txt-erro">${i.kg.toFixed(0)}kg</span></div>`).join('');
    const topR$ = [...lista].sort((a,b) => b.valor - a.valor).slice(0, 6);
    document.getElementById('rank-r$').innerHTML = topR$.map(i => `<div class="rank-item"><span>${i.nome}</span><span class="txt-erro">R$ ${i.valor.toFixed(0)}</span></div>`).join('');
}

function atualizarCard(id, d) {
    const ef = d.p > 0 ? Math.max(0, (100 - ((d.d / d.p) * 100))) : 100;
    const b = document.getElementById(`barra-${id}`);
    b.style.width = ef.toFixed(1) + "%"; b.innerText = ef.toFixed(1) + "%";
    b.style.background = obterCorEfic(ef);
    document.getElementById(`qtd-${id}`).innerText = `${d.q} tratos processados`;
    
    document.getElementById(`itens-${id}`).innerHTML = Object.keys(d.itens).map(n => {
        const i = d.itens[n];
        const e = i.p > 0 ? Math.max(0, (100 - ((i.d / i.p) * 100))) : 100;
        return `<tr><td>${n}</td><td>${i.p.toFixed(0)}</td><td class="txt-erro">${i.d.toFixed(0)}</td><td class="txt-erro">${i.v.toFixed(0)}</td><td class="${e >= 95 ? 'txt-ok' : 'txt-erro'}">${e.toFixed(0)}%</td></tr>`;
    }).join('');
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('graficoEvolucao').getContext('2d');
    const resumo = {};
    dados.forEach(t => {
        if (!resumo[t.dataBR]) resumo[t.dataBR] = { p: 0, d: 0 };
        t.componentes.forEach(c => { resumo[t.dataBR].p += c.programado; resumo[t.dataBR].d += c.excesso; });
    });
    const labels = Object.keys(resumo);
    const valores = labels.map(l => (100 - ((resumo[l].d / resumo[l].p) * 100)).toFixed(1));
    if (chartEvolucao) chartEvolucao.destroy();
    chartEvolucao = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ data: valores, borderColor: '#00f2ff', backgroundColor: 'rgba(0, 242, 255, 0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { min: 60, max: 100, ticks: { color: '#666', font: { size: 9 } } }, x: { ticks: { color: '#666', font: { size: 9 } } } }
        }
    });
}

inputInicio.addEventListener('change', () => processar(todosOsDados.filter(d => d.dataISO >= inputInicio.value && d.dataISO <= inputFim.value)));
inputFim.addEventListener('change', () => processar(todosOsDados.filter(d => d.dataISO >= inputInicio.value && d.dataISO <= inputFim.value)));
document.getElementById('btn-limpar').addEventListener('click', () => inicializar());

inicializar();