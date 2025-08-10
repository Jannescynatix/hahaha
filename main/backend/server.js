const express = require('express');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Cloudinary-Konfiguration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// In-Memory "Datenbank" für schnellen Start
let mediaData = [];
let mediaId = 1;

// Multer in-memory storage, um Dateien vor dem Upload zu Cloudinary zu speichern
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// POST-Endpunkt zum Hochladen von Dateien
app.post('/api/upload', upload.single('mediaFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Keine Datei hochgeladen.');
    }

    try {
        const result = await cloudinary.uploader.upload(
            `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
            { resource_type: "auto" } // Erkennt automatisch, ob es ein Bild oder Video ist
        );

        const { title, tags, description } = req.body;
        const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';

        const newMedia = {
            id: mediaId++,
            title: title || req.file.originalname,
            description: description || '',
            filename: req.file.originalname,
            type: mediaType,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            uploadDate: new Date().toISOString(),
            url: result.secure_url,
            thumbnail: mediaType === 'video' ? result.secure_url.replace(/\.mp4$/, '.jpg') : null
        };

        mediaData.push(newMedia);
        res.status(201).json(newMedia);
    } catch (error) {
        console.error('Upload zu Cloudinary fehlgeschlagen:', error);
        res.status(500).send('Upload fehlgeschlagen.');
    }
});

// DELETE-Endpunkt zum Löschen eines Mediums
app.delete('/api/media/:id', async (req, res) => {
    const mediaId = parseInt(req.params.id);
    const mediaIndex = mediaData.findIndex(m => m.id === mediaId);

    if (mediaIndex === -1) {
        return res.status(404).send('Medienobjekt nicht gefunden.');
    }

    try {
        // Extrahiert die "public_id" aus der URL, um die Datei zu löschen
        const publicId = mediaData[mediaIndex].url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: mediaData[mediaIndex].type });

        mediaData.splice(mediaIndex, 1);
        res.status(200).send('Medienobjekt erfolgreich gelöscht.');
    } catch (error) {
        console.error('Löschen aus Cloudinary fehlgeschlagen:', error);
        res.status(500).send('Fehler beim Löschen.');
    }
});

// GET-Endpunkt, um Medien abzurufen (mit Suche und Filter)
app.get('/api/media', (req, res) => {
    let filteredMedia = mediaData;
    const { search, type, tags, page = 1, limit = 20 } = req.query;
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

app.get('/api/media/:id', (req, res) => {
    const mediaId = parseInt(req.params.id);
    const media = mediaData.find(m => m.id === mediaId);
    if (!media) {
        return res.status(404).send('Medienobjekt nicht gefunden.');
    }
    res.json(media);
});

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

app.listen(PORT, () => {
    console.log(`Backend-Server läuft auf http://localhost:${PORT}`);
});