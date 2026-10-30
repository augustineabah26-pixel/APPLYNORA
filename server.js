const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const adminRoutes = require('./src/routes/adminRoutes');
const cvRoutes = require('./src/routes/cvRoutes');

app.use('/api/admin', adminRoutes);
app.use('/api/cv', cvRoutes);

// Simple test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// For tests, we might want to export the app rather than listening immediately
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
