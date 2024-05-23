const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown', err);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // React app URL
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/leaderboardDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000 // 45 seconds
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
  process.exit(1);
});

const teamSchema = new mongoose.Schema({
  rank: Number,
  teamName: String,
  totalGamesPlayed: Number,
  score: Number,
  avatarUrl: String,
  badge: String
});

const Team = mongoose.model('Team', teamSchema);

app.get('/api/leaderboard', async (req, res) => {
  try {
    const teams = await Team.find().sort({ rank: 1 });
    res.json(teams);
  } catch (err) {
    console.error('Failed to fetch leaderboard data', err);
    res.status(500).send('Internal server error');
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('updateLeaderboard', async () => {
    try {
      const teams = await Team.find().sort({ rank: 1 });
      io.emit('leaderboardData', teams);
    } catch (err) {
      console.error('Failed to update leaderboard', err);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
