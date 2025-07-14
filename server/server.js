// server/server.js
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const mongoose  = require('mongoose');
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const { Server } = require('socket.io');

const User        = require('./models/User');
const ServerModel = require('./models/Server');
const Message     = require('./models/Message');

// Map des utilisateurs connectés { userId => count }
const onlineUsers = new Map();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: 'http://localhost:3000' }
});

// Middlewares
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Auth pour les routes HTTP
function authHttp(req, res, next) {
  const token = (req.header('Authorization') || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));

// ========== ROUTES HTTP ==========

// Health check
app.get('/', (req, res) => res.send('🚀 API Clan Chat OK'));

// Signup
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await new User({ username, passwordHash: hash }).save();
    res.status(201).json({ message: 'Utilisateur créé' });
  } catch {
    res.status(400).json({ error: 'Nom déjà pris' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const u = await User.findOne({ username });
  if (!u || !(await bcrypt.compare(password, u.passwordHash)))
    return res.status(401).json({ error: 'Identifiants invalides' });
  const token = jwt.sign({ id: u._id, username }, process.env.JWT_SECRET);
  res.json({ token, username, id: u._id });
});

// Get my servers
app.get('/my-servers', authHttp, async (req, res) => {
  const list = await ServerModel.find({ members: req.user.id }).lean();
  res.json({ servers: list.map(s => ({ name: s.name, code: s.invitationCode })) });
});

// Create server
app.post('/servers', authHttp, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const code = `clan.${name}`;
  try {
    const sv = new ServerModel({
      name,
      owner: req.user.id,
      invitationCode: code,
      members: [req.user.id]
    });
    await sv.save();
    res.status(201).json({ name: sv.name, invitationCode: code });
  } catch {
    res.status(400).json({ error: 'Nom déjà pris' });
  }
});

// Join server
app.post('/servers/join', authHttp, async (req, res) => {
  const { code } = req.body;
  const sv = await ServerModel.findOne({ invitationCode: code });
  if (!sv) return res.status(404).json({ error: 'Code invalide' });
  if (!sv.members.includes(req.user.id)) {
    sv.members.push(req.user.id);
    await sv.save();
  }
  res.json({ name: sv.name });
});

// Liste des canaux et membres d'un serveur
app.get('/servers/:name/details', authHttp, async (req, res) => {
  const sv = await ServerModel.findOne({ name: req.params.name }).populate('members', 'username').lean();
  if (!sv || !sv.members.find(m => m._id.equals(req.user.id))) {
    return res.status(404).json({ error: 'Serveur inconnu' });
  }
  const members = sv.members.map(m => ({
    username: m.username,
    online: onlineUsers.has(String(m._id))
  }));
  res.json({ channels: sv.channels, members, owner: String(sv.owner) });
});

// Créer un canal
app.post('/servers/:name/channels', authHttp, async (req, res) => {
  const { name: channelName } = req.body;
  if (!channelName) return res.status(400).json({ error: 'Nom requis' });
  const sv = await ServerModel.findOne({ name: req.params.name });
  if (!sv) return res.status(404).json({ error: 'Serveur inconnu' });
  if (String(sv.owner) !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });
  if (!sv.channels.includes(channelName)) {
    sv.channels.push(channelName);
    await sv.save();
  }
  res.status(201).json({ channel: channelName });
});

// Récupérer les messages d'un canal
app.get('/servers/:name/messages/:channel', authHttp, async (req, res) => {
  const sv = await ServerModel.findOne({ name: req.params.name });
  if (!sv || !sv.members.includes(req.user.id))
    return res.status(404).json({ error: 'Serveur inconnu' });
  const messages = await Message.find({ server: sv._id, channel: req.params.channel })
    .sort({ createdAt: 1 })
    .lean();
  res.json({ messages: messages.map(m => ({ user: m.user, message: m.message })) });
});

// ========== SOCKET.IO ==========

io.use((socket, next) => {
  try {
    const payload = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    socket.user = payload.username;
    socket.userId = payload.id;
    next();
  } catch {
    next(new Error('Auth failed'));
  }
});

io.on('connection', socket => {
  // marquer l'utilisateur en ligne
  const count = onlineUsers.get(socket.userId) || 0;
  onlineUsers.set(socket.userId, count + 1);

  socket.on('join room', room => {
    for (const r of socket.rooms) if (r !== socket.id) socket.leave(r);
    socket.join(room);
  });
  socket.on('chat message', ({ room, message }) => {
    const [serverName, channel] = room.split('/');
    ServerModel.findOne({ name: serverName }).then(sv => {
      if (sv) {
        new Message({ server: sv._id, channel, user: socket.user, message }).save();
      }
    });
    io.to(room).emit('chat message', { user: socket.user, message, room });
  });

  socket.on('disconnect', () => {
    const cnt = (onlineUsers.get(socket.userId) || 1) - 1;
    if (cnt <= 0) onlineUsers.delete(socket.userId);
    else onlineUsers.set(socket.userId, cnt);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Serveur sur :${PORT}`));

