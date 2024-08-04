const importContainer = document.getElementById('import-container');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const importButton = document.getElementById('import-button');
const chatContainer = document.getElementById('chat-container');
const progressBarContainer = document.getElementById('progressBarContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

importButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => handleFileSelect(event.target.files[0]));

importContainer.addEventListener('dragover', (event) => {
    event.preventDefault();
    importContainer.classList.add('dragover');
});

importContainer.addEventListener('dragleave', () => {
    importContainer.classList.remove('dragover');
});

importContainer.addEventListener('drop', (event) => {
    event.preventDefault();
    importContainer.classList.remove('dragover');
    handleFileSelect(event.dataTransfer.files[0]);
});

function handleFileSelect(file) {
    if (file && file.name.endsWith('.zip')) {
        fileInfo.textContent = `Selected file: ${file.name}`;
        showLoadingAnimation();
        const reader = new FileReader();
        reader.onload = handleZipFile;
        reader.readAsArrayBuffer(file);
    } else {
        fileInfo.textContent = 'Please select a ZIP file.';
    }
}

function showLoadingAnimation() {
    chatContainer.innerHTML = '<div class="loading-animation"><div class="spinner"></div><p>Extracting and loading messages...</p></div>';
}

function updateProgress(processed, total) {
    const percentage = Math.round((processed / total) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    
    if (percentage < 5) {
        progressText.style.color = '#43b581';
    } else {
        progressText.style.color = 'white';
    }
}

async function handleZipFile(event) {
    const zipData = event.target.result;
    const zip = await JSZip.loadAsync(zipData);

    let jsonFile;
    const attachments = {};
    const profilePhotos = {};
    const emojis = {};

    const totalFiles = Object.keys(zip.files).length;
    let processedFiles = 0;

    progressBarContainer.style.display = 'block';

    for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.endsWith('.json')) {
            jsonFile = file;
        } else if (filename.startsWith('attachments/')) {
            const attachmentName = filename.split('/').pop();
            attachments[attachmentName] = file;
        } else if (filename.startsWith('profile_photos/')) {
            const photoName = filename.split('/').pop();
            profilePhotos[photoName] = await file.async('blob');
        } else if (filename.startsWith('emojis/')) {
            const emojiName = filename.split('/').pop();
            if (emojiName.endsWith('.png') || emojiName.endsWith('.gif')) {
                emojis[emojiName] = await file.async('blob');
            }
        }
        processedFiles++;
        updateProgress(processedFiles, totalFiles);
    }

    if (jsonFile) {
        const jsonContent = await jsonFile.async('text');
        const messages = JSON.parse(jsonContent);
        displayMessages(messages, profilePhotos, attachments, emojis);
    } else {
        fileInfo.textContent = 'No JSON file found in the ZIP archive.';
        chatContainer.innerHTML = '';
    }

    progressBarContainer.style.display = 'none';
}

function displayMessages(messages, profilePhotos, attachments, emojis) {
    chatContainer.innerHTML = '';

    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';

        const avatar = document.createElement('img');
        if (message.pfp && profilePhotos[message.pfp]) {
            avatar.src = URL.createObjectURL(profilePhotos[message.pfp]);
        } else {
            avatar.src = 'default_avatar.png';
        }
        avatar.className = 'avatar';
        messageDiv.appendChild(avatar);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = message.username;
        contentDiv.appendChild(usernameSpan);

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = message.time;
        contentDiv.appendChild(timestampSpan);

        if (message.message) {
            const textDiv = document.createElement('div');
            textDiv.className = 'text';
            textDiv.innerHTML = formatMessage(message.message, messages, emojis);
            contentDiv.appendChild(textDiv);
        }

        if (message.attachment && message.attachment.length > 0) {
            message.attachment.forEach(attachmentName => {
                if (attachments[attachmentName]) {
                    loadAndDisplayAttachment(attachmentName, attachments[attachmentName], contentDiv);
                }
            });
        }

        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
    });
}

async function loadAndDisplayAttachment(attachmentName, file, contentDiv) {
    const blob = await file.async('blob');
    const attachmentDiv = createAttachmentElement(attachmentName, blob);
    contentDiv.appendChild(attachmentDiv);
}

function formatMessage(text, messages, emojis) {
    // Split the message into parts (text and mentions)
    const parts = text.split(/(<@\d+>)/g);
    
    // Process each part
    const formattedParts = parts.map(part => {
        // Check if the part is a mention
        const mentionMatch = part.match(/^<@(\d+)>$/);
        if (mentionMatch) {
            const userId = mentionMatch[1];
            const mentionedUser = messages.find(m => m.userid === parseInt(userId));
            return `<span class="mention">@${mentionedUser ? mentionedUser.username : 'unknown'}</span>`;
        }
        
        // If not a mention, process URLs and emojis
        return processTextPart(part, emojis);
    });

    // Join the parts back together
    return formattedParts.join('');
}

function processTextPart(text, emojis) {
    // Escape HTML to prevent XSS
    text = escapeHtml(text);

    // Format URLs
    text = text.replace(/(https?:\/\/[^\s]+)/g, (url) => {
        if (url.match(/\.(jpeg|jpg|png|gif)$/i) !== null) {
            return `<img src="${url}" alt="image" class="inline-image">`;
        } else if (url.includes("tenor.com")) {
            const gifId = url.split('-').pop();
            return `<iframe src="https://tenor.com/embed/${gifId}" class="tenor-gif-embed" frameBorder="0"></iframe>`;
        } else if (url.includes("giphy.com")) {
            return `<iframe src="${url.replace('/gifs/', '/embed/')}" class="giphy-embed" frameBorder="0"></iframe>`;
        } else {
            return `<a href="${url}" target="_blank">${url}</a>`;
        }
    });

    // Format custom emojis
    text = text.replace(/\[EMOJI:(\d+_\w+\.(png|gif))\]/g, (match, emojiFilename) => {
        if (emojis[emojiFilename]) {
            const url = URL.createObjectURL(emojis[emojiFilename]);
            return `<img src="${url}" alt="emoji" class="custom-emoji">`;
        }
        return match;
    });

    return text;
}
// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function createAttachmentElement(fileName, blob) {
    const attachmentDiv = document.createElement('div');
    attachmentDiv.className = 'attachment';

    const fileExtension = fileName.split('.').pop().toLowerCase();
    const url = URL.createObjectURL(blob);

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Image attachment';
        img.className = 'attachment-image';
        attachmentDiv.appendChild(img);
    } else if (fileExtension === 'mp3') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.className = 'attachment-audio';
        const source = document.createElement('source');
        source.src = url;
        source.type = 'audio/mpeg';
        audio.appendChild(source);
        attachmentDiv.appendChild(audio);
    } else if (['mp4', 'webm', 'mov'].includes(fileExtension)) {
        const video = document.createElement('video');
        video.controls = true;
        video.className = 'attachment-video';
        const source = document.createElement('source');
        source.src = url;
        
        if (fileExtension === 'mov') {
            source.type = 'video/quicktime';
        } else {
            source.type = `video/${fileExtension}`;
        }
        
        video.appendChild(source);
        
        // Add fallback message
        const fallbackMessage = document.createElement('p');
        fallbackMessage.textContent = 'Your browser does not support the video tag.';
        video.appendChild(fallbackMessage);
        
        attachmentDiv.appendChild(video);
    } else {
        const downloadButton = document.createElement('a');
        downloadButton.href = url;
        downloadButton.download = fileName;
        downloadButton.className = 'download-button';
        downloadButton.textContent = `Download ${fileName}`;
        attachmentDiv.appendChild(downloadButton);
    }

    return attachmentDiv;
}