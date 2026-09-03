const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { publicUrl } = require('./config');

const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const usersFilePath = path.join(dataDir, 'users.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(usersFilePath)) {
  fs.writeFileSync(usersFilePath, '[]');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

async function refreshStoredQrCodes() {
  const users = loadUsers();
  let changed = false;

  for (const user of users) {
    const qrCode = await QRCode.toDataURL(`${publicUrl}/users/${user.id}`);
    if (user.qrCode !== qrCode) {
      user.qrCode = qrCode;
      changed = true;
    }
  }

  if (changed) {
    saveUsers(users);
  }
}

function buildUserDetails(user) {
  return [
    { "section1": {name: "بيانات التصريح", rows: {"Permit Number": user.permitNumberAr, "Permit Type": user.permitTypeAr,"Permit Start Date": user.startDateAr, "Permit End Date": user.endDateAr}}},
    { "section2": {name: "بيانات العامل", rows: 
      {"Worker Name": user.workerNameAr, 
        "ID / Residence Number": user.workerIdAr,
        "Nationality": user.nationalityAr,
        "Occupation": user.occupationAr,
        "Gender": user.genderAr,
        "Date of Birth": user.birthDateAr
      }}},
    { "section3": {name: "بيانات المنشأة",rows: {"Establishment Number": user.establishmentNumberAr, "Establishment Name": user.establishmentNameAr}}}
  ];
}




app.get('/', (req, res) => {
  const users = loadUsers().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.render('index', { users, pageTitle: 'نظام التصاريح' });
});

app.get('/users/new', (req, res) => {
  res.render('add-user', { user: null, details: [], pageTitle: 'إضافة مستخدم جديد' });
});

app.post('/users', async (req, res) => {
  const user = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    permitNumberAr: req.body.permitNumberAr || '',
    permitNumberEn: req.body.permitNumberEn || '',
    permitTypeAr: req.body.permitTypeAr || '',
    permitTypeEn: req.body.permitTypeEn || '',
    startDateAr: req.body.startDateAr || '',
    startDateEn: req.body.startDateEn || '',
    endDateAr: req.body.endDateAr || '',
    endDateEn: req.body.endDateEn || '',
    workerNameAr: req.body.workerNameAr || '',
    workerNameEn: req.body.workerNameEn || '',
    workerIdAr: req.body.workerIdAr || '',
    workerIdEn: req.body.workerIdEn || '',
    nationalityAr: req.body.nationalityAr || '',
    nationalityEn: req.body.nationalityEn || '',
    occupationAr: req.body.occupationAr || '',
    occupationEn: req.body.occupationEn || '',
    genderAr: req.body.genderAr || '',
    genderEn: req.body.genderEn || '',
    birthDateAr: req.body.birthDateAr || '',
    birthDateEn: req.body.birthDateEn || '',
    establishmentNumberAr: req.body.establishmentNumberAr || '',
    establishmentNumberEn: req.body.establishmentNumberEn || '',
    establishmentNameAr: req.body.establishmentNameAr || '',
    establishmentNameEn: req.body.establishmentNameEn || ''
  };

  const qrCode = await QRCode.toDataURL(`${publicUrl}/users/${user.id}`);
  user.qrCode = qrCode;

  const users = loadUsers();
  users.push(user);
  saveUsers(users);

  res.redirect(`/users/${user.id}/created`);
});

app.get('/users/:id/created', (req, res) => {
  const user = loadUsers().find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).send('User not found');
  }

  res.render('add-user', {
    user,
    details: buildUserDetails(user),
    pageTitle: 'تم إنشاء المستخدم'
  });
});

app.get('/users/:id', (req, res) => {
  const user = loadUsers().find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).send('User not found');
  }

  res.render('user', {
    user,
    details: buildUserDetails(user),
    pageTitle: 'تفاصيل المستخدم'
  });
});

app.get('/usersqr/:id', (req, res) => {
  const user = loadUsers().find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).send('User not found');
  }

  res.render('userqr', {
    user,
    details: buildUserDetails(user),
    pageTitle: 'تفاصيل المستخدم'
  });
});

if (require.main === module) {
  refreshStoredQrCodes()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server running at ${publicUrl}`);
      });
    })
    .catch((error) => {
      console.error('Unable to refresh stored QR codes:', error);
      process.exitCode = 1;
    });
}

module.exports = app;
