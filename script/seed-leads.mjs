import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: "postgresql://postgres:admin123@127.0.0.1:5432/crmdb" });
await client.connect();

// Get admin user id
const { rows: [admin] } = await client.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
const adminId = admin?.id;

const leads = [
  { full_name: "Ravi Kumar",     phone: "9876543210", email: "ravi@gmail.com",  city: "Chennai",     source: "meta_ads",  stage: "new",        lead_score: 72 },
  { full_name: "Priya Sharma",   phone: "9876543211", email: "priya@gmail.com", city: "Coimbatore",  source: "website",   stage: "contacted",  lead_score: 85 },
  { full_name: "Arjun Nair",     phone: "9876543212", email: null,              city: "Madurai",     source: "walk_in",   stage: "qualified",  lead_score: 60 },
  { full_name: "Deepa Reddy",    phone: "9876543213", email: "deepa@gmail.com", city: "Trichy",      source: "referral",  stage: "demo",       lead_score: 91 },
  { full_name: "Suresh Babu",    phone: "9876543214", email: null,              city: "Salem",       source: "phone",     stage: "interested", lead_score: 55 },
  { full_name: "Anjali Singh",   phone: "9876543215", email: "anjali@yahoo.com",city: "Vellore",     source: "meta_ads",  stage: "payment",    lead_score: 78 },
  { full_name: "Mohammed Hasan", phone: "9876543216", email: "hasan@gmail.com", city: "Chennai",     source: "website",   stage: "admitted",   lead_score: 88 },
  { full_name: "Kavitha Devi",   phone: "9876543217", email: null,              city: "Erode",       source: "walk_in",   stage: "lost",       lead_score: 40 },
  { full_name: "Vikram Pandey",  phone: "9876543218", email: "vikram@gmail.com",city: "Tirunelveli", source: "referral",  stage: "new",        lead_score: 66 },
  { full_name: "Lakshmi Iyer",   phone: "9876543219", email: "lax@gmail.com",   city: "Kanchipuram", source: "meta_ads",  stage: "contacted",  lead_score: 80 },
  { full_name: "Karthik Raja",   phone: "9876543220", email: null,              city: "Dindigul",    source: "phone",     stage: "qualified",  lead_score: 58 },
  { full_name: "Meena Krishnan", phone: "9876543221", email: "meena@gmail.com", city: "Nagercoil",   source: "website",   stage: "demo",       lead_score: 75 },
];

let count = 0;
for (const lead of leads) {
  const leadNo = `LEAD-${String(Date.now()).slice(-6)}-${count + 1}`;

  await client.query(
    `INSERT INTO leads (lead_no, full_name, phone, email, city, source, stage, lead_score, assigned_to, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW() - ($10 || ' days')::interval, NOW())
     ON CONFLICT DO NOTHING`,
    [leadNo, lead.full_name, lead.phone, lead.email, lead.city, lead.source, lead.stage, lead.lead_score, adminId, count * 2]
  );
  count++;
}

const { rows: [{ count: total }] } = await client.query("SELECT COUNT(*) FROM leads");
console.log(`✅ Seeded ${count} leads. Total in DB: ${total}`);
await client.end();
