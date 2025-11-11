const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('jsonFileInput');
const dataTable = document.getElementById('dataTable');
const tbody = dataTable.querySelector('tbody');
const filenameDisplay = document.getElementById('filename-display');

// Click to browse
dropZone.addEventListener('click', () => {
    fileInput.click();
});

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone when dragging over it
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
    }, false);
});

// Handle dropped files
dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Handle file input change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (file.type !== 'application/json') {
        alert('Please upload a valid JSON file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            populateTable(data);
            filenameDisplay.textContent = `${file.name}`;
            filenameDisplay.style.display = 'block';
        } catch (error) {
            alert('Invalid JSON file. Please upload a valid JSON file.');
        }
    };
    reader.readAsText(file);
}

function populateTable(data) {
    tbody.innerHTML = '';

    if (!Array.isArray(data)) {
        alert('JSON data should be an array');
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${item.ToyID || ''}</td>
            <td>${item.ModelName || ''}</td>
            <td>${item.Series || ''}</td>
            <td>${item.SeriesNumber || ''}</td>
            <td><img src="${item.Photo || ''}" alt="Image is loading..."></td>
            <td>${item.Year || ''}</td>
        `;

        tbody.appendChild(row);
    });

    dataTable.style.display = 'table';
}