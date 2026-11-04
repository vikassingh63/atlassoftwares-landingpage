/**
 * Landing page lead handler  ->  POST /api/submit-landing-lead
 * Same MongoDB (atlas_softwares_db.leads), same Namecheap mail and same
 * Make.com webhook as the main website's api/submit-lead.js.
 */
const { MongoClient } = require("mongodb");
const nodemailer = require("nodemailer");

const uri = process.env.MONGODB_URI;
const dbName = "atlas_softwares_db";
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  if (!uri) throw new Error("MONGODB_URI environment variable missing");
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

// Option values of the form's dropdowns -> readable labels
const PROJECT_TYPES = {
  "website-development": "Website Development",
  "ui-ux-frontend": "UI/UX & Frontend Development",
  "web-applications": "Web Application Development",
  "backend-development": "Backend Development",
  "database-development": "Database Development & Management",
  "cms-development": "CMS Development",
  "ecommerce-development": "E-commerce Development",
  "api-integrations": "API & Third-Party Integrations",
  "business-software": "Business Software Development",
  "hosting-devops": "Web Hosting, Deployment & DevOps",
  "security-qa": "Website Security & Quality Assurance",
  "optimization-support": "Website Optimization & Ongoing Support",
  other: "Something else",
};

const BUDGETS = {
  "under-25k": "Under ₹25,000",
  "25k-75k": "₹25,000 – ₹75,000",
  "75k-2l": "₹75,000 – ₹2,00,000",
  "2l-plus": "₹2,00,000+",
  "not-sure": "Not sure yet",
};

const ALLOWED_ORIGINS = [
  "https://atlassoftwares.com",
  "https://www.atlassoftwares.com",
  "http://localhost:3000",
  "http://localhost",
];

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").trim();

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};

  // Honeypot: bots fill the hidden field. Pretend success, store nothing.
  if (body.website) {
    return res.status(200).json({ success: true, message: "Lead processed successfully!" });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const projectType = String(body.projectType || "").trim();
  const budget = String(body.budget || "").trim();
  const message = String(body.message || "").trim();
  const pageSource = oneLine(body.pageSource).slice(0, 100) || "Landing Page - Web Development";

  // ---- Server-side validation (never trust the browser) ----
  const fail = (msg) => res.status(400).json({ success: false, message: msg });

  if (!name || name.length > 100) return fail("Please enter your name.");
  if (!email || email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail("Please enter a valid email address.");
  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone))
    return fail("Please enter a valid phone number.");
  if (!PROJECT_TYPES[projectType]) return fail("Please choose a project type.");
  if (budget && !BUDGETS[budget]) return fail("Invalid budget option.");
  if (message.length < 20 || message.length > 3000)
    return fail("Please describe your project in 20 to 3000 characters.");

  const projectTypeLabel = PROJECT_TYPES[projectType];
  const budgetLabel = budget ? BUDGETS[budget] : "Not specified";

  try {
    // ---- STEP 1: MONGODB SAVE ----
    let dbSaved = false;
    try {
      const client = await connectToDatabase();
      await client.db(dbName).collection("leads").insertOne({
        name,
        email,
        phone,
        projectType,
        projectTypeLabel,
        budget,
        budgetLabel,
        message,
        pageSource,
        createdAt: new Date(),
      });
      dbSaved = true;
    } catch (dbErr) {
      console.error("MongoDB Error:", dbErr);
    }

    // ---- STEP 2: NAMECHEAP MAIL TRIGGER ----
    let mailSent = false;
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "mail.privateemail.com",
        port: Number(process.env.EMAIL_PORT || 465),
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const row = (label, value) =>
        `<p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong style="color: #111;">${label}:</strong> ${esc(value) || "-"}</p>`;

      await transporter.sendMail({
        from: `"Atlas Softwares Leads" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        replyTo: email,
        subject: `🔥 New Lead: ${oneLine(projectTypeLabel)} (${oneLine(pageSource)})`,
        html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background-color: #fafafa; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #111; margin: 0; font-size: 24px; font-weight: 700;">Atlas Softwares</h2>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Inbound Lead Engine Notification</p>
          </div>

          <div style="background: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #111;">
            ${row("Source Page", pageSource)}
            ${row("Client Name", name)}
            ${row("Email Address", email)}
            ${row("Phone Number", phone || "Not provided")}
            ${row("Project Type", projectTypeLabel)}
            ${row("Budget", budgetLabel)}

            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
              <strong style="display: block; margin-bottom: 8px; color: #111; font-size: 14px;">Project Requirements:</strong>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${esc(message)}</div>
            </div>
          </div>
        </div>
      `,
      });
      mailSent = true;
    } catch (mailErr) {
      console.error("Mail Error:", mailErr);
    }

    // Lead is lost only if BOTH the database and the email failed.
    if (!dbSaved && !mailSent) {
      return res
        .status(500)
        .json({ success: false, message: "Could not process your enquiry. Please try again." });
    }

    // ---- STEP 3: MAKE.COM WEBHOOK TRIGGER (Fail-Safe Wrapper) ----
    if (process.env.MAKE_WEBHOOK_URL) {
      try {
        await fetch(process.env.MAKE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone: phone || "Not provided",
            projectType: projectTypeLabel,
            budget: budgetLabel,
            message,
            pageSource,
            submittedAt: new Date().toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            }),
          }),
        });
      } catch (webhookErr) {
        console.error("Webhook execution bypassed:", webhookErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Lead processed successfully!",
    });
  } catch (error) {
    console.error("Backend Processing Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
