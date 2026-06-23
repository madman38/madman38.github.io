let itemMap = {};
let recipes = {};
let scale = 1.0;
let translateX = 0;
let translateY = 0;

const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;

const viewport = document.getElementById('viewport');
const zoomWrapper = document.getElementById('zoomWrapper');
const treeContent = document.getElementById('treeContent');
const searchInput = document.getElementById('sidebarSearch');
const clearSearchBtn = document.getElementById('clearSearch');
const emptyState = document.getElementById('emptyState');
const treeControls = document.getElementById('treeControls');
const zoomPercentText = document.getElementById('zoomPercent');

// 1. Load Data
async function loadData() {
    try {
        const response = await fetch('recipes.json');
        recipes = await response.json();
        Object.keys(recipes).forEach(tier => {
            recipes[tier].forEach(item => { itemMap[item.item] = item; });
        });
        initSidebar();
    } catch (e) { console.error("Could not load recipes.json", e); }
}

// 2. Sidebar Logic
function initSidebar() {
    const listContainer = document.getElementById('fullItemList');
    listContainer.innerHTML = ''; 
    Object.keys(recipes).forEach(tierName => {
        const tierGroup = document.createElement('div');
        tierGroup.className = 'tier-group';
        const header = document.createElement('div');
        header.className = 'tier-header';
        header.innerHTML = `<span>${tierName}</span> <span class="arrow">▼</span>`;
        const content = document.createElement('div');
        content.className = 'tier-content';

        recipes[tierName].forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'item-btn';
            btn.innerHTML = `<img src="${item.image_path}" draggable="false"><span>${item.item}</span>`;
            btn.onclick = () => renderTree(item.item);
            content.appendChild(btn);
        });

        header.onclick = () => tierGroup.classList.toggle('collapsed');
        tierGroup.appendChild(header);
        tierGroup.appendChild(content);
        listContainer.appendChild(tierGroup);
    });
}

// 3. Tree Rendering
function buildPlaceholderHTML(name) {
    return `<div class="node no-children placeholder-node">
        <div class="item-card placeholder-card">
            <div class="placeholder-icon">?</div>
            <span class="item-name">${name}</span>
            <div class="source-info">Base Item</div>
        </div>
    </div>`;
}

function renderChild(seedName, foundItem) {
    return foundItem ? buildTreeHTML(seedName) : buildPlaceholderHTML(seedName);
}

function buildTreeHTML(itemName) {
    const item = itemMap[itemName];
    if (!item) return '';
    const s1 = itemMap[item.seed1];
    const s2 = itemMap[item.seed2];
    const hasChildren = !!s1; 
    const nodeClass = !hasChildren ? 'node no-children' : 'node is-collapsed';
    
    let html = `<div class="${nodeClass}">
        <div class="item-card" ondblclick="toggleNode(this)">
            <img src="${item.image_path}" draggable="false">
            <span class="item-name">${item.item}</span>
            ${!hasChildren ? `<div class="source-info">${item.seed1 || 'Base Item'}</div>` : ''}
            ${hasChildren ? `<button class="toggle-btn" onclick="toggleNode(this); event.stopPropagation();">+</button>` : ''}
        </div>`;
    if (hasChildren) {
        html += `<div class="children collapsed">
            <div class="child-container">${renderChild(item.seed1, s1)}</div>`;
        if (item.seed2) {
            html += `<div class="child-container">${renderChild(item.seed2, s2)}</div>`;
        }
        html += `</div>`;
    }
    html += `</div>`;
    return html;
}

function renderTree(itemName) {
    emptyState.style.display = 'none';
    treeControls.style.display = 'flex';
    treeContent.innerHTML = buildTreeHTML(itemName);
    scale = 1.0;
    setTimeout(() => centerOnRoot(), 50);

    // Highlight the active sidebar button
    document.querySelectorAll('.item-btn').forEach(btn => {
        btn.classList.toggle('active', btn.querySelector('span')?.textContent === itemName);
    });
}

// 4. Navigation (Center, Zoom, Pan)
function updateTransform() {
    zoomWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomPercentText.innerText = Math.round(scale * 100) + '%';
}

function centerOnRoot() {
    const rootCard = treeContent.querySelector('.node > .item-card');
    if (!rootCard) return;
    const cardCenterInTree = rootCard.offsetLeft + (rootCard.offsetWidth / 2);
    translateX = (viewport.offsetWidth / 2) - (cardCenterInTree * scale);
    translateY = 80; 
    updateTransform();
}

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(MIN_SCALE, scale * delta), MAX_SCALE);
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    translateX = mouseX - (mouseX - translateX) * (newScale / scale);
    translateY = mouseY - (mouseY - translateY) * (newScale / scale);
    scale = newScale;
    updateTransform();
}, { passive: false });

let isPanning = false, startX, startY;
viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('.control-group, .item-btn, .toggle-btn')) return;
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    viewport.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
});
window.addEventListener('mouseup', () => { isPanning = false; viewport.style.cursor = 'grab'; });

// 5. Interactions
function toggleNode(caller) {
    const node = caller.closest('.node');
    const childrenDiv = node.querySelector('.children');
    if (!childrenDiv) return;
    const card = node.querySelector('.item-card');
    const btn = card.querySelector('.toggle-btn');
    const rectBefore = card.getBoundingClientRect();
    const isNowCollapsed = childrenDiv.classList.toggle('collapsed');
    node.classList.toggle('is-collapsed');
    if (btn) btn.innerText = isNowCollapsed ? '+' : '-';
    const rectAfter = card.getBoundingClientRect();
    translateX += (rectBefore.left - rectAfter.left);
    translateY += (rectBefore.top - rectAfter.top);
    updateTransform();
}

function expandAll() {
    treeContent.querySelectorAll('.node').forEach(node => {
        const childrenDiv = node.querySelector('.children');
        if (childrenDiv) {
            childrenDiv.classList.remove('collapsed');
            node.classList.remove('is-collapsed');
            const btn = node.querySelector('.toggle-btn');
            if (btn) btn.innerText = '-';
        }
    });
    setTimeout(() => centerOnRoot(), 50);
}

function collapseAll() {
    treeContent.querySelectorAll('.node').forEach(node => {
        const childrenDiv = node.querySelector('.children');
        if (childrenDiv) {
            childrenDiv.classList.add('collapsed');
            node.classList.add('is-collapsed');
            const btn = node.querySelector('.toggle-btn');
            if (btn) btn.innerText = '+';
        }
    });
    setTimeout(() => centerOnRoot(), 50);
}

function changeZoom(delta) {
    const oldScale = scale;
    scale = Math.min(Math.max(MIN_SCALE, scale + delta), MAX_SCALE);
    const centerX = viewport.offsetWidth / 2, centerY = viewport.offsetHeight / 2;
    translateX = centerX - (centerX - translateX) * (scale / oldScale);
    translateY = centerY - (centerY - translateY) * (scale / oldScale);
    updateTransform();
}

function resetZoom() { scale = 1.0; centerOnRoot(); }

// 6. Search
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    clearSearchBtn.style.display = term ? 'block' : 'none';
    document.querySelectorAll('.tier-group').forEach(group => {
        let match = false;
        group.querySelectorAll('.item-btn').forEach(btn => {
            const m = btn.innerText.toLowerCase().includes(term);
            btn.style.display = m ? 'flex' : 'none';
            if (m) match = true;
        });
        group.style.display = match ? 'block' : 'none';
    });
});
clearSearchBtn.onclick = () => { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); };

loadData();