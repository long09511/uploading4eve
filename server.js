const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/documentdb');

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    email: String
});
const User = mongoose.model('User', userSchema);

// Document Schema
const docSchema = new mongoose.Schema({
    title: String,
    description: String,
    category: String,
    uploader: String,
    s3Key: String,
    uploadDate: Date,
    downloads: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
    // Add ratings, comments if needed
});
const Document = mongoose.model('Document', docSchema);

// S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const upload = multer({ storage: multer.memoryStorage() });

// Middleware for auth
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Register
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (await User.findOne({ username })) return res.status(400).json({ error: 'Username exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, email });
    await user.save();
    res.status(201).json({ message: 'Registered' });
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    res.json({ token });
});

// Upload
app.post('/api/upload', authenticate, upload.array('files'), async (req, res) => {
    const { title, description, category } = req.body;
    const files = req.files;
    try {
        for (const file of files) {
            const params = {
                Bucket: process.env.S3_BUCKET || 'your-bucket-name',
                Key: `${Date.now()}-${file.originalname}`,
                Body: file.buffer,
                ContentType: file.mimetype
            };
            const s3Result = await s3.upload(params).promise();
            const newDoc = new Document({
                title: title || file.originalname,
                description,
                category,
                uploader: req.user.username,
                s3Key: s3Result.Key,
                uploadDate: new Date()
            });
            await newDoc.save();
        }
        res.status(200).json({ message: 'Uploaded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List documents
app.get('/api/documents', async (req, res) => {
    const docs = await Document.find();
    res.json(docs);
});

// Download signed URL
app.get('/api/download/:id', async (req, res) => {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: doc.s3Key,
        Expires: 3600
    };
    const url = await s3.getSignedUrlPromise('getObject', params);
    res.json({ url });
    // Or redirect: res.redirect(url);
    // But since frontend uses href, can fetch url and set window.location = url
});

// For frontend, serve index.html for /
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});