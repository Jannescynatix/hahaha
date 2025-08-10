const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-Memory "Datenbank" für schnellen Start
let mediaData = [];
let mediaId = 1;

// Multer in-memory storage für den Upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// MEGA-API-Anmeldedaten
const megaEmail = process.env.MEGA_EMAIL;
const megaPassword = process.env.MEGA_PASSWORD;

// Funktion zum Anmelden bei MEGA und Erhalten des Sitzungstokens
const getMegaToken = async () => {
    // Diese Logik ist vereinfacht und dient nur zur Veranschaulichung.
    // In der Praxis wäre eine robustere API-Integration erforderlich.
    // Die offizielle MEGA-API ist komplex, weshalb wir eine einfachere Methode simulieren.
    // Ein reales Projekt würde hier die offizielle MEGA-API verwenden.
    // Für dieses Beispiel gehen wir davon aus, dass wir ein Token haben.
    console.log('Anmeldung bei MEGA...');
    return 'fake-mega-session-token-12345';
};

// POST-Endpunkt zum Hochladen von Dateien
app.post('/api/upload', upload.single('mediaFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Keine Datei hochgeladen.');
    }

    // In einem realen Szenario würde hier die MEGA-Upload-Logik stehen
    // Wir simulieren den Upload, um die Frontend-Logik zu testen

    // Der Code hier simuliert einen erfolgreichen Upload zu MEGA
    const { title, tags, description } = req.body;
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const fakeFileUrl = `https://mega.nz/file/${mediaId}-${req.file.originalname}`;
    const newMedia = {
        id: mediaId++,
        title: title || req.file.originalname,
        description: description || '',
        filename: req.file.originalname,
        type: mediaType,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        uploadDate: new Date().toISOString(),
        url: fakeFileUrl,
        thumbnail: null
    };

    mediaData.push(newMedia);
    res.status(201).json(newMedia);
});

// GET-Endpunkt, um Medien abzurufen (mit Suche und Filter)
app.get('/api/media', (req, res) => {
    // Diese Logik bleibt unverändert
    let filteredMedia = mediaData;
    const { search, type, tags, page = 1, limit = 20 } = req.query;
    // ... (Logik wie im vorherigen Code)
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;

    if (search) {
        const searchTerm = search.toLowerCase();
        filteredMedia = filteredMedia.filter(media =>
            media.title.toLowerCase().includes(searchTerm) ||
            media.description.toLowerCase().includes(searchTerm) ||
            media.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }
    if (type && type !== 'all') {
        filteredMedia = filteredMedia.filter(media => media.type === type);
    }
    if (tags) {
        const searchTags = tags.split(',').map(tag => tag.trim().toLowerCase());
        filteredMedia = filteredMedia.filter(media =>
            searchTags.every(searchTag => media.tags.some(mediaTag => mediaTag.toLowerCase().includes(searchTag)))
        );
    }

    filteredMedia.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    const paginatedResults = filteredMedia.slice(startIndex, endIndex);
    const totalCount = filteredMedia.length;

    res.json({
        total: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        media: paginatedResults
    });
});

// GET-Endpunkt für ein einzelnes Medium
app.get('/api/media/:id', (req, res) => {
    const media = mediaData.find(m => m.id === parseInt(req.params.id));
    if (!media) {
        return res.status(404).send('Medienobjekt nicht gefunden.');
    }
    res.json(media);
});

// PUT-Endpunkt zum Aktualisieren eines Mediums
app.put('/api/media/:id', (req, res) => {
    const mediaId = parseInt(req.params.id);
    const mediaIndex = mediaData.findIndex(m => m.id === mediaId);
    if (mediaIndex === -1) {
        return res.status(404).send('Medienobjekt nicht gefunden.');
    }

    const { title, tags, description } = req.body;
    mediaData[mediaIndex].title = title || mediaData[mediaIndex].title;
    mediaData[mediaIndex].description = description || mediaData[mediaIndex].description;
    mediaData[mediaIndex].tags = tags ? tags.split(',').map(tag => tag.trim()) : mediaData[mediaIndex].tags;

    res.status(200).json(mediaData[mediaIndex]);
});

// DELETE-Endpunkt zum Löschen eines Mediums
app.delete('/api/media/:id', async (req, res) => {
    const mediaId = parseInt(req.params.id);
    const mediaIndex = mediaData.findIndex(m => m.id === mediaId);

    if (mediaIndex === -1) {
        return res.status(404).send('Medienobjekt nicht gefunden.');
    }

    const mediaToDelete = mediaData[mediaIndex];

    // In einem realen Szenario würde hier die MEGA-Lösch-Logik stehen
    console.log(`Lösche Datei mit URL: ${mediaToDelete.url}`);
    mediaData.splice(mediaIndex, 1);
    res.status(200).send('Medienobjekt erfolgreich gelöscht.');
});

app.listen(PORT, () => {
    console.log(`Backend-Server läuft auf http://localhost:${PORT}`);
});