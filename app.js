let logData = [];
let charts = {};
const dayColors = ['#ff4757', '#2e86de', '#8e44ad', '#f368e0', '#ff9f43', '#1dd1a1', '#5f27cd'];

Chart.register(ChartDataLabels);
Chart.defaults.color = '#7f8fa6';
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

document.getElementById('file-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (files.length === 0) return;
    
    logData = [];
    const recipeSet = new Set();
    
    for (const file of files) {
        const text = await readFile(file);
        const parsed = parseDG500(text);
        if (parsed) {
            logData.push(parsed);
            recipeSet.add(parsed.recipe);
        }
    }
    
    const select = document.getElementById('recipe-filter');
    select.innerHTML = '<option value="">TODAS AS DIETAS</option>';
    Array.from(recipeSet).sort().forEach(r => select.innerHTML += `<option value="${r}">${r}</option>`);
    
    document.getElementById('app-viewport').style.display = 'block';
    updateView();
});

function readFile(file) {
    return new Promise(res => {
        const reader = new FileReader();
        reader.readAsText(file, 'ISO-8859-1');
        reader.onload = () => res(reader.result);
    });
}

function parseDG500(text) {
    const lines = text.split('\n').map(l => l.trim());
    try {
        const rIdx = lines.findIndex(l => l.includes('Dados da receita;'));
        const rVals = lines[rIdx + 2].split(';');
        const tIdx = lines.findIndex(l => l.includes('Totais;;Peso programado;Peso carregado;'));
        const tVals = lines[tIdx + 1].split(';');
        const dIdx = lines.findIndex(l => l.includes('Totais;;Peso programado;Peso descarregado;'));
        const dVals = lines[dIdx + 1].split(';');

        const entry = {
            dateStr: rVals[3],
            dateObj: new Date(rVals[3].split('/').reverse().join('-')),
            time: rVals[4].split('.').map(v => v.padStart(2, '0')).join(':'),
            hourLabel: rVals[4].split('.')[0].padStart(2, '0') + 'h',
            recipe: rVals[2].trim(),
            prog: parseFloat(tVals[2].replace(',', '.')),
            load: parseFloat(tVals[3].replace(',', '.')),
            unload: parseFloat(dVals[3].replace(',', '.')),
            errMix: parseFloat(tVals[4].replace(',', '.')),
            components: []
        };
        
        let i = lines.findIndex(l => l.includes('Dados dos componentes;')) + 2;
        while(lines[i] && lines[i].includes(';') && !lines[i].includes('Data;')) {
            const v = lines[i].split(';');
            entry.components.push({ name: v[1], prog: parseFloat(v[2].replace(',','.')), real: parseFloat(v[3].replace(',','.')), err: parseFloat(v[4].replace(',','.')) });
            i++;
        }
        return entry;
    } catch (e) { return null; }
}

function updateView() {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const minErr = parseFloat(document.getElementById('min-error').value) || 0;
    const recipeSel = document.getElementById('recipe-filter').value;

    let filtered = logData.filter(d => {
        const matchErr = Math.abs(d.errMix) >= minErr;
        const matchRec = recipeSel ? d.recipe === recipeSel : true;
        let matchDate = true;
        if(start) matchDate = matchDate && (d.dateObj >= new Date(start));
        if(end) matchDate = matchDate && (d.dateObj <= new Date(end));
        return matchErr && matchRec && matchDate;
    }).sort((a,b) => Math.abs(b.errMix) - Math.abs(a.errMix));

    renderKPIs(filtered);
    renderCharts(filtered);
    renderTable(filtered);
}

function renderKPIs(data) {
    const p = data.reduce((s, d) => s + d.prog, 0);
    const l = data.reduce((s, d) => s + d.load, 0);
    const u = data.reduce((s, d) => s + d.unload, 0);
    const e = data.reduce((s, d) => s + Math.abs(d.errMix), 0) / (data.length || 1);
    
    document.getElementById('log-count').innerText = data.length;
    document.getElementById('total-prog-kg').innerText = p.toLocaleString(undefined, {minimumFractionDigits: 1});
    document.getElementById('total-load-kg').innerText = l.toLocaleString(undefined, {minimumFractionDigits: 1});
    document.getElementById('total-unload-kg').innerText = u.toLocaleString(undefined, {minimumFractionDigits: 1});
    document.getElementById('total-tank-waste').innerText = (l - u).toLocaleString(undefined, {minimumFractionDigits: 1});
    document.getElementById('global-err').innerText = e.toFixed(2) + '%';
}

function renderCharts(data) {
    // TENDÊNCIA DIÁRIA
    const dayMap = {};
    data.forEach(d => { if(!dayMap[d.dateStr]) dayMap[d.dateStr] = { errs: [], dow: d.dateObj.getDay() }; dayMap[d.dateStr].errs.push(Math.abs(d.errMix)); });
    const sortedDays = Object.keys(dayMap).sort((a,b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
    createChart('chart-daily', sortedDays.map(d => d.substring(0,5)), sortedDays.map(d => dayMap[d].errs.reduce((a,b)=>a+b,0)/dayMap[d].errs.length), sortedDays.map(d => dayColors[dayMap[d].dow]), '%');

    // HORAS
    const hrMap = {};
    data.forEach(d => { if(!hrMap[d.hourLabel]) hrMap[d.hourLabel] = []; hrMap[d.hourLabel].push(Math.abs(d.errMix)); });
    const sortedHours = Object.keys(hrMap).sort();
    createChart('chart-hours', sortedHours, sortedHours.map(h => hrMap[h].reduce((a,b)=>a+b,0)/hrMap[h].length), '#00d2ff', '%');

    // INGREDIENTES KG
    const ingKgMap = {};
    data.forEach(d => d.components.forEach(c => { if(!ingKgMap[c.name]) ingKgMap[c.name] = 0; ingKgMap[c.name] += (c.real - c.prog); }));
    const sortedIngs = Object.keys(ingKgMap).sort();
    createChart('chart-ingredients-kg', sortedIngs, sortedIngs.map(k => ingKgMap[k]), '#ffa502', ' kg');
}

function createChart(id, labels, data, color, suffix) {
    const ctx = document.getElementById(id).getContext('2d');
    if(charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 5 }] },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { datalabels: { anchor: 'end', align: 'top', formatter: (v) => v.toFixed(1) + suffix, font: { size: 9, weight: '800' } }, legend: { display: false } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true, grace: '20%' }, x: { grid: { display: false } } }
        }
    });
}

function renderTable(data) {
    const tbody = document.querySelector('#audit-table tbody');
    tbody.innerHTML = data.map(d => {
        const waste = (d.load - d.unload).toFixed(1);
        return `<tr onclick='openModal(${JSON.stringify(d).replace(/'/g, "&apos;")})'>
            <td><b>${d.dateStr}</b><br><small style="color:var(--text-muted)">${d.time}</small></td>
            <td style="color:var(--primary); font-weight:800">${d.recipe}</td>
            <td>${d.prog.toFixed(1)}</td><td>${d.load.toFixed(1)}</td><td>${d.unload.toFixed(1)}</td>
            <td style="color:${d.errMix >= 0 ? 'var(--danger)' : 'var(--primary)'}"><b>${d.errMix >= 0 ? '↑' : '↓'} ${Math.abs(d.errMix).toFixed(2)}%</b></td>
            <td style="color:${waste > 2 ? 'var(--danger)' : 'inherit'}">${waste} kg</td>
            <td><div class="comp-badge-group">${d.components.map(c => `<div class="comp-badge ${c.err >= 0 ? 'up' : 'down'}">${c.name} ${c.err >= 0 ? '+' : ''}${c.err.toFixed(1)}%</div>`).join('')}</div></td>
        </tr>`;
    }).join('');
}

function openModal(d) {
    document.getElementById('modal-body').innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px; margin-bottom:20px">
            <div class="kpi-item"><b>DIETA:</b><br>${d.recipe}</div>
            <div class="kpi-item"><b>CARREGADO:</b><br>${d.load.toFixed(1)} kg</div>
            <div class="kpi-item"><b>COCHO:</b><br>${d.unload.toFixed(1)} kg</div>
        </div>
        <table style="width:100%">
            <thead><tr><th>COMPONENTE</th><th>PROGRAMADO</th><th>CARREGADO</th><th>SALDO (kg)</th><th>ERRO %</th></tr></thead>
            <tbody>${d.components.map(c => `<tr><td><b>${c.name}</b></td><td>${c.prog.toFixed(2)} kg</td><td>${c.real.toFixed(2)} kg</td><td>${(c.real-c.prog).toFixed(2)}</td><td style="color:${c.err >= 0 ? 'var(--danger)' : 'var(--primary)'}"><b>${c.err.toFixed(2)}%</b></td></tr>`).join('')}</tbody>
        </table>`;
    document.getElementById('detail-modal').style.display = "block";
}
function closeModal() { document.getElementById('detail-modal').style.display = "none"; }
function resetFilters() { document.getElementById('start-date').value=''; document.getElementById('end-date').value=''; document.getElementById('recipe-filter').value=''; document.getElementById('min-error').value='0'; updateView(); }
document.querySelectorAll('input, select').forEach(i => i.addEventListener('change', updateView));
