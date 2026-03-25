// api/pdf.js — Vercel serverless PDF generation
// Requires: npm install @sparticuz/chromium puppeteer-core
// Add to package.json: { "dependencies": { "@sparticuz/chromium": "^123.0.0", "puppeteer-core": "^22.0.0" } }

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { html, filename } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'Missing html body' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set content and wait for fonts/styles
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
      printBackground: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'DebtSnap-Report.pdf'}"`);
    res.send(pdf);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF', detail: error.message });
  } finally {
    if (browser) await browser.close();
  }
}
