const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const defaultLeads = [
  {
    id: crypto.randomUUID(),
    name: 'Sarah Ahmed',
    email: 'sarah@brightstudio.co',
    source: 'Website Contact Form',
    status: 'new',
    company: 'Bright Studio',
    message: 'Need a landing page and lead capture system for our design agency.',
    notes: [
      {
        id: crypto.randomUUID(),
        text: 'Initial inquiry received from the website.',
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date('2026-03-08T09:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-03-08T09:00:00.000Z').toISOString()
  },
  {
    id: crypto.randomUUID(),
    name: 'David Thomas',
    email: 'david@northstarlogistics.com',
    source: 'Referral',
    status: 'contacted',
    company: 'Northstar Logistics',
    message: 'Looking for a dashboard to track incoming sales leads across multiple channels.',
    notes: [
      {
        id: crypto.randomUUID(),
        text: 'Reached out by email and scheduled a follow-up call.',
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date('2026-03-06T11:30:00.000Z').toISOString(),
    updatedAt: new Date('2026-03-10T14:00:00.000Z').toISOString()
  },
  {
    id: crypto.randomUUID(),
    name: 'Maria Lopez',
    email: 'maria@freshbakeshop.com',
    source: 'Instagram Campaign',
    status: 'converted',
    company: 'Fresh Bake Shop',
    message: 'Interested in automating customer inquiries and lead follow-ups.',
    notes: [
      {
        id: crypto.randomUUID(),
        text: 'Proposal approved. Moving to onboarding stage.',
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date('2026-03-02T16:15:00.000Z').toISOString(),
    updatedAt: new Date('2026-03-11T10:20:00.000Z').toISOString()
  }
];

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(defaultLeads, null, 2));
  }

  if (!fs.existsSync(USERS_FILE)) {
    const users = [
      {
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash: bcrypt.hashSync('admin123', 10)
      }
    ];

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized. Please log in as admin.' });
  }

  next();
}

ensureFiles();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'mini-crm-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ message: 'Mini CRM API is running.' });
});

app.get('/api/auth/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session.user), user: req.session.user || null });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJson(USERS_FILE);
  const user = users.find((item) => item.username === username);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  req.session.user = { id: user.id, username: user.username };
  res.json({ message: 'Login successful.', user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully.' });
  });
});

app.get('/api/leads', requireAuth, (_req, res) => {
  const leads = readJson(LEADS_FILE).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const summary = {
    total: leads.length,
    new: leads.filter((lead) => lead.status === 'new').length,
    contacted: leads.filter((lead) => lead.status === 'contacted').length,
    converted: leads.filter((lead) => lead.status === 'converted').length
  };

  res.json({ leads, summary });
});

app.post('/api/leads', (req, res) => {
  const { name, email, source, company, message } = req.body;

  if (!name || !email || !source) {
    return res.status(400).json({ message: 'Name, email, and source are required.' });
  }

  const leads = readJson(LEADS_FILE);
  const lead = {
    id: crypto.randomUUID(),
    name,
    email,
    source,
    company: company || 'Not provided',
    message: message || 'No message added.',
    status: 'new',
    notes: [
      {
        id: crypto.randomUUID(),
        text: 'Lead created from the contact form.',
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  leads.push(lead);
  writeJson(LEADS_FILE, leads);

  res.status(201).json({ message: 'Lead captured successfully.', lead });
});

app.patch('/api/leads/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ['new', 'contacted', 'converted'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  const leads = readJson(LEADS_FILE);
  const lead = leads.find((item) => item.id === id);

  if (!lead) {
    return res.status(404).json({ message: 'Lead not found.' });
  }

  lead.status = status;
  lead.updatedAt = new Date().toISOString();
  writeJson(LEADS_FILE, leads);

  res.json({ message: 'Lead status updated.', lead });
});

app.post('/api/leads/:id/notes', requireAuth, (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'Note text is required.' });
  }

  const leads = readJson(LEADS_FILE);
  const lead = leads.find((item) => item.id === id);

  if (!lead) {
    return res.status(404).json({ message: 'Lead not found.' });
  }

  const note = {
    id: crypto.randomUUID(),
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  lead.notes.unshift(note);
  lead.updatedAt = new Date().toISOString();
  writeJson(LEADS_FILE, leads);

  res.status(201).json({ message: 'Follow-up note added.', lead, note });
});

app.delete('/api/leads/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const leads = readJson(LEADS_FILE);
  const index = leads.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Lead not found.' });
  }

  const [deletedLead] = leads.splice(index, 1);
  writeJson(LEADS_FILE, leads);

  res.json({ message: 'Lead deleted successfully.', lead: deletedLead });
});
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mini CRM running on http://localhost:${PORT}`);
  console.log('Default admin login -> username: admin | password: admin123');
});


