const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = ['en.json', 'vi.json', 'id.json', 'th.json', 'km.json'];

const tccTranslations = {
  en: {
    app: { tccTemplate: "TCC Template Request" },
    tcc: {
      nav: {
        requestForm: "Request Form",
        tracking: "Tracking",
        adminStatus: "TCC Admin Status",
        dashboard: "Dashboard"
      }
    }
  },
  vi: {
    app: { tccTemplate: "Yêu Cầu Rập TCC" },
    tcc: {
      nav: {
        requestForm: "Đăng Ký Rập",
        tracking: "Tra Cứu",
        adminStatus: "Quản Lý TCC",
        dashboard: "Thống Kê"
      }
    }
  },
  // Default to English for others
  id: {
    app: { tccTemplate: "TCC Template Request" },
    tcc: {
      nav: { requestForm: "Request Form", tracking: "Tracking", adminStatus: "TCC Admin Status", dashboard: "Dashboard" }
    }
  },
  th: {
    app: { tccTemplate: "TCC Template Request" },
    tcc: {
      nav: { requestForm: "Request Form", tracking: "Tracking", adminStatus: "TCC Admin Status", dashboard: "Dashboard" }
    }
  },
  km: {
    app: { tccTemplate: "TCC Template Request" },
    tcc: {
      nav: { requestForm: "Request Form", tracking: "Tracking", adminStatus: "TCC Admin Status", dashboard: "Dashboard" }
    }
  }
};

files.forEach(file => {
  const lang = file.split('.')[0];
  const filePath = path.join(localesDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge app
    if (!data.app) data.app = {};
    data.app.tccTemplate = tccTranslations[lang].app.tccTemplate;

    // Add tcc section
    if (!data.tcc) {
      data.tcc = tccTranslations[lang].tcc;
    } else {
      data.tcc.nav = { ...data.tcc.nav, ...tccTranslations[lang].tcc.nav };
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${file}`);
  } catch (err) {
    console.error(`Error updating ${file}:`, err);
  }
});
