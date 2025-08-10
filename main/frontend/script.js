document.addEventListener('DOMContentLoaded', () => {
    const backendBaseUrl = 'https://hahaha-fbgk.onrender.com';
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
    const uploadProgressContainer = document.getElementById('upload-progress-container');
    const uploadProgressBar = document.getElementById('upload-progress-bar');

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
    const openSidebarButton = document.getElementById('open-sidebar-button');
    const closeSidebarButton = document.getElementById('close-sidebar-button');
    const overlay = document.getElementById('overlay');

    const notificationBar = document.getElementById('notification-bar');

    let currentMediaId = null;
    let currentPage = 1;
    const mediaPerPage = 20;

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, { threshold: 0.1 });

    const showNotification = (message, type = 'success') => {
        notificationBar.textContent = message;
        notificationBar.className = `notification-bar visible ${type}`;
        setTimeout(() => {
            notificationBar.classList.remove('visible');
        }, 3000);
    };

    const createVideoThumbnail = (videoFile) => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(videoFile);
            video.preload = 'metadata';
            video.currentTime = 1;
            video.onloadeddata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                URL.revokeObjectURL(video.src);
                resolve(dataUrl);
            };
            video.onerror = () => reject('Fehler beim Laden des Videos.');
        });
    };

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
            let src = item.url;

            if (item.type === 'image') {
                mediaElement = document.createElement('img');
                mediaElement.dataset.src = src;
                mediaElement.alt = item.title;
            } else {
                mediaElement = document.createElement('video');
                mediaElement.dataset.src = src;
                mediaElement.poster = item.thumbnail || 'fallback-thumbnail.png';
                mediaElement.alt = `Thumbnail für ${item.title}`;
            }

            const mediaInfo = document.createElement('div');
            mediaInfo.className = 'media-info';
            mediaInfo.innerHTML = `<span>${item.title}</span>`;

            mediaCard.appendChild(mediaElement);
            mediaCard.appendChild(mediaInfo);
            mediaGrid.appendChild(mediaCard);

            observer.observe(mediaElement);
        });
    };

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

    const updatePaginationControls = (current, total) => {
        pageInfoSpan.textContent = `Seite ${current} von ${total}`;
        prevPageButton.disabled = current <= 1;
        nextPageButton.disabled = current >= total;
        paginationControls.style.display = total > 1 ? 'flex' : 'none';
    };

    const closeAllModals = () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('visible');
        });
        modalViewer.innerHTML = '';
        currentMediaId = null;
    };

    // Sidebar-Logik für Mobilgeräte
    openSidebarButton.addEventListener('click', () => {
        filterSidebar.classList.add('visible');
        overlay.classList.add('visible');
    });
    closeSidebarButton.addEventListener('click', () => {
        filterSidebar.classList.remove('visible');
        overlay.classList.remove('visible');
    });
    overlay.addEventListener('click', () => {
        filterSidebar.classList.remove('visible');
        overlay.classList.remove('visible');
    });

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

    mediaGrid.addEventListener('click', async (event) => {
        const mediaCard = event.target.closest('.media-card');
        if (mediaCard) {
            const mediaId = mediaCard.dataset.id;
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

    uploadButton.addEventListener('click', () => {
        uploadModal.classList.add('visible');
    });

    uploadCloseButton.addEventListener('click', closeAllModals);
    modalCloseButton.addEventListener('click', closeAllModals);
    editCloseButton.addEventListener('click', closeAllModals);

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

        // Zeigt den Fortschrittsbalken an
        uploadProgressContainer.style.display = 'block';

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
        } finally {
            // Setzt den Fortschrittsbalken zurück und versteckt ihn
            uploadProgressBar.style.width = '0%';
            uploadProgressContainer.style.display = 'none';
        }
    });

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

    editButton.addEventListener('click', async () => {
        const mediaItem = await (await fetch(`${backendBaseUrl}/api/media/${currentMediaId}`)).json();

        editTitleInput.value = mediaItem.title;
        editTagsInput.value = mediaItem.tags.join(', ');
        editDescriptionInput.value = mediaItem.description || '';

        mediaModal.classList.remove('visible');
        editModal.classList.add('visible');
    });

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