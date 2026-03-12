const loginForm = document.getElementById('loginForm');
const logoutButton = document.getElementById('logoutButton');
const leadForm = document.getElementById('leadForm');
const leadList = document.getElementById('leadList');
const leadDetails = document.getElementById('leadDetails');
const detailTitle = document.getElementById('detailTitle');
const statusSelect = document.getElementById('statusSelect');
const noteForm = document.getElementById('noteForm');
const noteText = document.getElementById('noteText');
const deleteLeadButton = document.getElementById('deleteLeadButton');
const leadFormMessage = document.getElementById('leadFormMessage');
const dashboardMessage = document.getElementById('dashboardMessage');
const searchInput = document.getElementById('searchInput');

let leads = [];
let selectedLeadId = null;
let isAuthenticated = false;

function setStatusMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? '#c45353' : '#8d95a3';
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function updateStats(summary) {
  document.getElementById('totalLeads').textContent = summary.total;
  document.getElementById('newLeads').textContent = summary.new;
  document.getElementById('contactedLeads').textContent = summary.contacted;
  document.getElementById('convertedLeads').textContent = summary.converted;
}

function getSelectedLead() {
  return leads.find((lead) => lead.id === selectedLeadId) || null;
}

function renderLeadDetails() {
  const lead = getSelectedLead();

  if (!lead) {
    detailTitle.textContent = 'Select a lead';
    leadDetails.className = 'detail-body empty-state';
    leadDetails.textContent = 'Select a lead to review its details, update status, and record follow-up activity.';
    statusSelect.disabled = true;
    noteForm.classList.add('hidden');
    deleteLeadButton.classList.add('hidden');
    return;
  }

  detailTitle.textContent = lead.name;
  statusSelect.disabled = !isAuthenticated;
  statusSelect.value = lead.status;
  noteForm.classList.toggle('hidden', !isAuthenticated);
  deleteLeadButton.classList.toggle('hidden', !isAuthenticated);

  leadDetails.className = 'detail-body';
  leadDetails.innerHTML = `
    <div class="detail-card">
      <div class="detail-row">
        <strong class="detail-title">${lead.company}</strong>
        <span class="badge ${lead.status}">${lead.status}</span>
      </div>
      <p class="detail-meta">${lead.email} · ${lead.source}</p>
      <p>${lead.message}</p>
      <p class="detail-meta">Created: ${formatDate(lead.createdAt)}</p>
      <p class="detail-meta">Updated: ${formatDate(lead.updatedAt)}</p>
    </div>
    <div class="detail-card">
      <h3>Follow-up Notes</h3>
      <div class="notes-list">
        ${lead.notes.length ? lead.notes.map((note) => `
          <div class="note-item">
            <p>${note.text}</p>
            <small class="note-time">${formatDate(note.createdAt)}</small>
          </div>
        `).join('') : '<p class="empty-state">No notes yet.</p>'}
      </div>
    </div>
  `;
}

function renderLeadList() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = leads.filter((lead) => {
    const haystack = `${lead.name} ${lead.email} ${lead.company} ${lead.source}`.toLowerCase();
    return haystack.includes(query);
  });

  if (!isAuthenticated) {
    leadList.className = 'lead-list empty-state';
    leadList.textContent = 'Sign in to access your lead pipeline.';
    renderLeadDetails();
    return;
  }

  if (!filtered.length) {
    leadList.className = 'lead-list empty-state';
    leadList.textContent = 'No leads match your search right now.';
    renderLeadDetails();
    return;
  }

  leadList.className = 'lead-list';
  leadList.innerHTML = filtered.map((lead) => `
    <article class="lead-item ${lead.id === selectedLeadId ? 'active' : ''}" data-id="${lead.id}">
      <div class="lead-top">
        <strong>${lead.name}</strong>
        <span class="badge ${lead.status}">${lead.status}</span>
      </div>
      <p>${lead.company}</p>
      <p class="lead-meta">${lead.email}</p>
      <p class="lead-meta">${lead.source}</p>
    </article>
  `).join('');

  document.querySelectorAll('.lead-item').forEach((item) => {
    item.addEventListener('click', () => {
      selectedLeadId = item.dataset.id;
      renderLeadList();
      renderLeadDetails();
    });
  });

  if (!getSelectedLead() && filtered[0]) {
    selectedLeadId = filtered[0].id;
    renderLeadList();
    return;
  }

  renderLeadDetails();
}

async function fetchLeads() {
  if (!isAuthenticated) {
    leads = [];
    updateStats({ total: 0, new: 0, contacted: 0, converted: 0 });
    renderLeadList();
    return;
  }

  const response = await fetch('/api/leads');
  const data = await response.json();

  if (!response.ok) {
    setStatusMessage(dashboardMessage, data.message || 'Unable to load leads.', true);
    return;
  }

  leads = data.leads;
  updateStats(data.summary);

  if (selectedLeadId && !getSelectedLead()) {
    selectedLeadId = leads[0]?.id || null;
  }

  renderLeadList();
}

async function checkSession() {
  const response = await fetch('/api/auth/session');
  const data = await response.json();

  isAuthenticated = data.authenticated;
  logoutButton.classList.toggle('hidden', !isAuthenticated);
  loginForm.classList.toggle('hidden', isAuthenticated);
  setStatusMessage(dashboardMessage, isAuthenticated ? `Logged in as ${data.user.username}.` : 'Sign in to manage and update leads.');
  await fetchLeads();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: formData.get('username'),
      password: formData.get('password')
    })
  });

  const data = await response.json();

  if (!response.ok) {
    setStatusMessage(dashboardMessage, data.message || 'Login failed.', true);
    return;
  }

  loginForm.reset();
  await checkSession();
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  selectedLeadId = null;
  await checkSession();
});

leadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(leadForm);
  const payload = Object.fromEntries(formData.entries());

  const response = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    setStatusMessage(leadFormMessage, data.message || 'Could not capture lead.', true);
    return;
  }

  leadForm.reset();
  setStatusMessage(leadFormMessage, 'Lead saved successfully.');
  if (isAuthenticated) {
    selectedLeadId = data.lead.id;
    await fetchLeads();
  }
});

statusSelect.addEventListener('change', async () => {
  if (!selectedLeadId) return;

  const response = await fetch(`/api/leads/${selectedLeadId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: statusSelect.value })
  });

  const data = await response.json();

  if (!response.ok) {
    setStatusMessage(dashboardMessage, data.message || 'Status update failed.', true);
    return;
  }

  setStatusMessage(dashboardMessage, 'Lead status updated.');
  await fetchLeads();
});

noteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedLeadId) return;

  const response = await fetch(`/api/leads/${selectedLeadId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: noteText.value })
  });

  const data = await response.json();

  if (!response.ok) {
    setStatusMessage(dashboardMessage, data.message || 'Could not add note.', true);
    return;
  }

  noteText.value = '';
  setStatusMessage(dashboardMessage, 'Follow-up note added.');
  await fetchLeads();
});

deleteLeadButton.addEventListener('click', async () => {
  if (!selectedLeadId) return;

  const lead = getSelectedLead();
  const confirmed = window.confirm(`Delete ${lead.name} from the CRM?`);
  if (!confirmed) return;

  const response = await fetch(`/api/leads/${selectedLeadId}`, {
    method: 'DELETE'
  });

  const data = await response.json();

  if (!response.ok) {
    setStatusMessage(dashboardMessage, data.message || 'Could not delete lead.', true);
    return;
  }

  selectedLeadId = null;
  setStatusMessage(dashboardMessage, 'Lead deleted successfully.');
  await fetchLeads();
});

searchInput.addEventListener('input', () => {
  renderLeadList();
});

checkSession();
