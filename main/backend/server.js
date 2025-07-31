const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = 3001; // Beibehalten des Ports 3001

// Verzeichnisse erstellen
const uploadDir = path.join(__dirname, 'uploads');
const thumbnailDir = path.join(__dirname, 'uploads/thumbnails');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// In-Memory "Datenbank" für schnellen Start
let mediaData = [];
let mediaId = 1;

// Multer Storage Konfiguration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Funktion zum Generieren von Video-Thumbnails
const generateThumbnail = (videoPath, thumbnailName) => {
    return new Promise((resolve, reject) => {
        const outputFilePath = path.join(thumbnailDir, thumbnailName);
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ['50%'],
                filename: thumbnailName,
                folder: thumbnailDir,
                size: '320x240'
            })
            .on('end', () => resolve(outputFilePath))
            .on('error', err => reject(err));
    });
};

// POST-Endpunkt zum Hochladen von Dateien
app.post('/api/upload', upload.single('mediaFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Keine Datei hochgeladen.');
    }

    const { title, tags, description } = req.body;
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    let thumbnailUrl = null;

    if (mediaType === 'video') {
        const thumbnailName = path.parse(req.file.filename).name + '.png';
        try {
            await generateThumbnail(req.file.path, thumbnailName);
            thumbnailUrl = `http://localhost:${PORT}/uploads/thumbnails/${thumbnailName}`;
        } catch (error) {
            console.error('Fehler beim Generieren des Thumbnails:', error);
            // Thumbnail-Erstellung ist fehlgeschlagen, wir fahren trotzdem fort
        }
    }

    const newMedia = {
        id: mediaId++,
        title: title || req.file.originalname,
        description: description || '',
        filename: req.file.filename,
        type: mediaType,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        uploadDate: new Date().toISOString(),
        url: `http://localhost:${PORT}/uploads/${req.file.filename}`,
        thumbnail: thumbnailUrl
    };

    mediaData.push(newMedia);
    res.status(201).json(newMedia);
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

// GET-Endpunkt für ein einzelnes Medium
app.get('/api/media/:id', (req, res) => {
    const mediaId = parseInt(req.params.id);
    const media = mediaData.find(m => m.id === mediaId);
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
app.delete('/api/media/:id', (req, res) => {
    const mediaId = parseInt(req.params.id);
    const mediaIndex = mediaData.findIndex(m => m.id === mediaId);

    if (mediaIndex === -1) {
        return res.status(404).send('Medienobjekt nicht gefunden.');
    }

    const mediaToDelete = mediaData[mediaIndex];
    const filePath = path.join(uploadDir, mediaToDelete.filename);

    fs.unlink(filePath, (err) => {
        if (err) console.error('Fehler beim Löschen der Datei:', err);
    });

    if (mediaToDelete.type === 'video' && mediaToDelete.thumbnail) {
        const thumbnailPath = path.join(thumbnailDir, path.basename(mediaToDelete.thumbnail));
        fs.unlink(thumbnailPath, (err) => {
            if (err) console.error('Fehler beim Löschen des Thumbnails:', err);
        });
    }

    mediaData.splice(mediaIndex, 1);
    res.status(200).send('Medienobjekt erfolgreich gelöscht.');
});

app.listen(PORT, () => {
    console.log(`Backend-Server läuft auf http://localhost:${PORT}`);
});