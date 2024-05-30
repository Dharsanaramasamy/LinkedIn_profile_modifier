document.getElementById('change-pictures').addEventListener('click', () => {
    const imageUrlInput = document.getElementById('image-url').value;
    const imageUploadInput = document.getElementById('image-upload').files[0];
    const statusElement = document.getElementById('status');

    if (imageUrlInput) {
        // Use the URL provided
        updateProfilePictures(imageUrlInput);
    } else if (imageUploadInput) {
        // Use the uploaded image file
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Data = event.target.result;
            const CHUNK_SIZE = chrome.storage.sync.QUOTA_BYTES_PER_ITEM - 1024; // adjust the chunk size to fit within the limit

            // Split the data into chunks and store them
            const chunks = [];
            for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
                chunks.push(base64Data.substring(i, i + CHUNK_SIZE));
            }

            // Store the chunks in storage
            storeImageChunks(chunks).then(() => {
                updateProfilePictures(base64Data);
            }).catch((error) => {
                setStatus('Failed to store image chunks: ' + error, false);
            });
        };
        reader.readAsDataURL(imageUploadInput);
    } else {
        setStatus('Please provide an image URL or upload an image file.', false);
    }
});

function storeImageChunks(chunks) {
    return new Promise((resolve, reject) => {
        const promises = chunks.map((chunk, index) => {
            return new Promise((resolve, reject) => {
                const key = `imageChunk${index}`;
                const data = {};
                data[key] = chunk;
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
        });

        Promise.all(promises).then(resolve).catch(reject);
    });
}

function updateProfilePictures(imageUrl) {
    // Store the image URL in Chrome storage
    chrome.storage.local.set({ imageUrl }, () => {
        // Query the active tab and check if it's a LinkedIn feed page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].url.includes('linkedin.com/feed')) {
                // Send a message to the content script to replace profile pictures
                chrome.tabs.sendMessage(tabs[0].id, { action: 'replacePictures', imageUrl }, (response) => {
                    if (chrome.runtime.lastError) {
                        setStatus(`Error: ${chrome.runtime.lastError.message}`, false);
                    } else if (response && response.success) {
                        setStatus('Profile pictures updated!', true);
                    } else {
                        setStatus('Failed to update profile pictures.', false);
                    }
                });
            } else {
                setStatus('Please open LinkedIn feed page.', false);
            }
        });
    });
}

function setStatus(message, isSuccess) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.style.color = isSuccess ? 'green' : 'red';
    statusElement.classList.add('show');
    setTimeout(() => {
        statusElement.classList.remove('show');
    }, 3000);
}
