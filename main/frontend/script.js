document.addEventListener('DOMContentLoaded', () => {
    const backendBaseUrl = 'http://localhost:3001';
    const mediaGrid = document.getElementById('media-grid');
    const searchBar = document.getElementById('search-bar');
    const filterType = document.getElementById('filter-type');
    const filterTags = document.getElementById('filter-tags');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noMediaMessage = document.getElementById('no-media-message');

    const uploadButton = document.getElementById('upload-button');
    const uploadModal = document.getElementById('upload-modal');
    const uploadCloseButton = document.getElementById('upload-close-button');
    const uploadForm = document.getElementById('upload-form');

    const mediaModal = document.getElementById('media-modal');
    const modalCloseButton = document.getElementById('modal-close-button');
    const modalViewer = document.getElementById('modal-viewer');
    const modalTitle = document.getElementById('modal-title');
    const modalTags = document.getElementById('modal-tags');
    const modalDescription = document.getElementById('modal-description');
    const modalDate = document.getElementById('modal-date');
    const editButton = document.getElementById('edit-button');
    const deleteButton = document.getElementById('delete-button');

    const editModal = document.getElementById('edit-modal');
    const editCloseButton = document.getElementById('edit-close-button');
    const editForm = document.getElementById('edit-form');
    const editTitleInput = document.getElementById('edit-title-input');
    const editTagsInput = document.getElementById('edit-tags-input');
    const editDescriptionInput = document.getElementById('edit-description-input');

    const paginationControls = document.getElementById('pagination-controls');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfoSpan = document.getElementById('page-info');

    const filterSidebar = document.getElementById('filter-sidebar');
    const toggleFilterButton = document.getElementById('toggle-filter-button');

    const notificationBar = document.getElementById('notification-bar');

    let currentMediaId = null;
    let currentPage = 1;
    const mediaPerPage = 20;

    // Funktion zur Anzeige von Benachrichtigungen
    const showNotification = (message, type = 'success') => {
        notificationBar.textContent = message;
        notificationBar.className = `notification-bar visible ${type}`;
        setTimeout(() => {
            notificationBar.classList.remove('visible');
        }, 3000);
    };

    // Funktion zum Rendern der Medien-Cards
    const renderMedia = (media) => {
        mediaGrid.innerHTML = '';
        if (media.length === 0) {
            noMediaMessage.textContent = 'Keine Medien gefunden.';
            noMediaMessage.style.display = 'block';
            return;
        }
        noMediaMessage.style.display = 'none';

        media.forEach(item => {
            const mediaCard = document.createElement('div');
            mediaCard.className = 'media-card';
            mediaCard.dataset.id = item.id;
            mediaCard.dataset.type = item.type;

            let mediaElement;
            const src = item.type === 'video' && item.thumbnail ? item.thumbnail : item.url;

            if (item.type === 'image') {
                mediaElement = document.createElement('img');
                mediaElement.src = src;
                mediaElement.alt = item.title;
            } else {
                mediaElement = document.createElement('video');
                mediaElement.src = src;
                mediaElement.poster = item.thumbnail; // Verwende Thumbnail als Poster
            }

            const mediaInfo = document.createElement('div');
            mediaInfo.className = 'media-info';
            mediaInfo.innerHTML = `<span>${item.title}</span>`;

            mediaCard.appendChild(mediaElement);
            mediaCard.appendChild(mediaInfo);
            mediaGrid.appendChild(mediaCard);
        });
    };

    // Funktion zum Abrufen der Medien vom Backend
    const fetchMedia = async () => {
        loadingSpinner.style.display = 'block';
        mediaGrid.innerHTML = '';

        const searchTerm = searchBar.value;
        const mediaType = filterType.value;
        const tagFilter = filterTags.value;

        const url = new URL(`${backendBaseUrl}/api/media`);
        url.searchParams.append('page', currentPage);
        url.searchParams.append('limit', mediaPerPage);
        if (searchTerm) url.searchParams.append('search', searchTerm);
        if (mediaType && mediaType !== 'all') url.searchParams.append('type', mediaType);
        if (tagFilter) url.searchParams.append('tags', tagFilter);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Netzwerkfehler');
            const data = await response.json();
            renderMedia(data.media);
            updatePaginationControls(data.currentPage, data.totalPages);
        } catch (error) {
            console.error('Fehler beim Abrufen der Medien:', error);
            noMediaMessage.textContent = 'Fehler beim Laden der Medien. Bitte prüfen Sie, ob der Server läuft.';
            noMediaMessage.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    };

    // Funktion zur Aktualisierung der Paginierungs-Controls
    const updatePaginationControls = (current, total) => {
        pageInfoSpan.textContent = `Seite ${current} von ${total}`;
        prevPageButton.disabled = current <= 1;
        nextPageButton.disabled = current >= total;
        if (total > 1) {
            paginationControls.style.display = 'flex';
        } else {
            paginationControls.style.display = 'none';
        }
    };

    // Modal-Funktionen
    const closeAllModals = () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('visible');
        });
        modalViewer.innerHTML = '';
        currentMediaId = null;
    };

    // Event-Listener für die Paginierung
    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchMedia();
        }
    });

    nextPageButton.addEventListener('click', () => {
        currentPage++;
        fetchMedia();
    });

    // Event-Listener für die Sidebar auf Mobilgeräten
    toggleFilterButton.addEventListener('click', () => {
        filterSidebar.classList.toggle('visible');
    });

    // Event-Listener für Klicks auf die Media-Grid
    mediaGrid.addEventListener('click', async (event) => {
        const mediaCard = event.target.closest('.media-card');
        if (mediaCard) {
            const mediaId = parseInt(mediaCard.dataset.id);
            try {
                const response = await fetch(`${backendBaseUrl}/api/media/${mediaId}`);
                if (!response.ok) throw new Error('Medienobjekt nicht gefunden');
                const mediaItem = await response.json();

                currentMediaId = mediaItem.id;
                modalViewer.innerHTML = '';
                let mediaElement;
                if (mediaItem.type === 'image') {
                    mediaElement = document.createElement('img');
                    mediaElement.src = mediaItem.url;
                } else {
                    mediaElement = document.createElement('video');
                    mediaElement.src = mediaItem.url;
                    mediaElement.setAttribute('controls', '');
                }

                modalViewer.appendChild(mediaElement);
                modalTitle.textContent = mediaItem.title;
                modalTags.textContent = mediaItem.tags.join(', ');
                modalDescription.textContent = mediaItem.description || 'Keine Beschreibung vorhanden.';
                modalDate.textContent = new Date(mediaItem.uploadDate).toLocaleString();
                mediaModal.classList.add('visible');
            } catch (error) {
                console.error('Fehler beim Laden des Mediums:', error);
                showNotification('Fehler beim Laden des Mediums.', 'error');
            }
        }
    });

    // Event-Listener für das Öffnen des Upload-Modals
    uploadButton.addEventListener('click', () => {
        uploadModal.classList.add('visible');
    });

    // Event-Listener für das Schließen der Modals
    uploadCloseButton.addEventListener('click', closeAllModals);
    modalCloseButton.addEventListener('click', closeAllModals);
    editCloseButton.addEventListener('click', closeAllModals);

    // Event-Listener für das Absenden des Upload-Formulars
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fileInput = document.getElementById('file-input');
        if (!fileInput.files.length) {
            showNotification('Bitte eine Datei auswählen.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('mediaFile', fileInput.files[0]);
        formData.append('title', uploadForm['title-input'].value);
        formData.append('tags', uploadForm['tags-input'].value);
        formData.append('description', uploadForm['description-input'].value);

        try {
            await fetch(`${backendBaseUrl}/api/upload`, {
                method: 'POST',
                body: formData,
            });
            closeAllModals();
            uploadForm.reset();
            currentPage = 1;
            fetchMedia();
            showNotification('Medien erfolgreich hochgeladen!');
        } catch (error) {
            console.error('Upload fehlgeschlagen:', error);
            showNotification('Upload fehlgeschlagen. Bitte versuche es erneut.', 'error');
        }
    });

    // Event-Listener für den Löschen-Button im Modal
    deleteButton.addEventListener('click', async () => {
        if (confirm('Bist du sicher, dass du dieses Medium löschen möchtest?')) {
            try {
                await fetch(`${backendBaseUrl}/api/media/${currentMediaId}`, {
                    method: 'DELETE',
                });
                closeAllModals();
                fetchMedia();
                showNotification('Medium erfolgreich gelöscht.');
            } catch (error) {
                console.error('Löschen fehlgeschlagen:', error);
                showNotification('Löschen fehlgeschlagen.', 'error');
            }
        }
    });

    // Event-Listener für den Bearbeiten-Button
    editButton.addEventListener('click', async () => {
        const mediaItem = await (await fetch(`${backendBaseUrl}/api/media/${currentMediaId}`)).json();

        editTitleInput.value = mediaItem.title;
        editTagsInput.value = mediaItem.tags.join(', ');
        editDescriptionInput.value = mediaItem.description || '';

        mediaModal.classList.remove('visible');
        editModal.classList.add('visible');
    });

    // Event-Listener für das Absenden des Bearbeiten-Formulars
    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const updatedData = {
            title: editTitleInput.value,
            tags: editTagsInput.value,
            description: editDescriptionInput.value,
        };

        try {
            await fetch(`${backendBaseUrl}/api/media/${currentMediaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            closeAllModals();
            fetchMedia();
            showNotification('Medium erfolgreich aktualisiert.');
        } catch (error) {
            console.error('Aktualisierung fehlgeschlagen:', error);
            showNotification('Aktualisierung fehlgeschlagen.', 'error');
        }
    });

    // Initiales Laden der Medien und Event-Listener für Suche/Filter
    fetchMedia();
    searchBar.addEventListener('input', () => {
        currentPage = 1;
        fetchMedia();
    });
    filterType.addEventListener('change', () => {
        currentPage = 1;
        fetchMedia();
    });
    filterTags.addEventListener('input', () => {
        currentPage = 1;
        fetchMedia();
    });
});