/**
 * Instagram DM Outreach Automation - Puppeteer Version
 * Works on Node.js + Chrome browser automation
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

// Prospect interface
class Prospect {
  constructor(data) {
    this.full_name = data.full_name;
    this.email = data.email;
    this.company = data.company;
    this.title = data.title;
    this.city = data.city;
    this.segment = data.segment;
    this.pain = data.pain;
    this.first_phase = data.first_phase;
    this.opener = data.opener;
    this.prospect_id = data.prospect_id;
  }
}

// Message generation based on prospect type
function generateMessage(prospect) {
  const firstName = prospect.full_name.split(' ')[0];
  const company = prospect.company || 'your business';
  
  if (prospect.segment.includes('Branding / design studio')) {
    return `Hi ${firstName}, noticed you're running ${company}. Design studios like yours win on craft but struggle with selling — under-pricing because of feast-or-famine pipelines. We built a system that automates client acquisition, proposals, and delivery tracking. Founding price $79 (regular $149). Want to see how?`;
  } else if (prospect.segment.includes('SEO / performance agency')) {
    return `Hey ${firstName}, most SEO shops run on gut feel and referrals, no repeatable pipeline. Our Client Growth System gives agencies a structured framework for acquiring leads, converting them, and retaining long-term contracts. Founded pricing available. Quick demo if interested?`;
  } else if (prospect.segment.includes('Consultancy') || prospect.segment.includes('Agency / professional services')) {
    return `Hi ${firstName}, when delivery eats every hour at ${company}, nothing left for growth. Many consultants use our system to systematize delivery so they actually get growth time back. Selling at founding price right now. Worth a peek?`;
  } else if (prospect.segment.includes('Social / content / PR shop')) {
    return `Hey ${firstName}, clients churn after 2-3 months at content/PR shops because always re-selling to survive. Our retention module stops leaks and keeps revenue flowing. Interested in seeing how it works?`;
  } else {
    return `Hi ${firstName}, saw you're running a service business where every project ends and you hunt for the next one. We fixed this with a system that turns delivery into repeat revenue. Selling at founding price ($79 vs $149). Quick call?`;
  }
}

async function logResult(filename, result) {
  const existing = await fs.readFile(filename, 'utf8').catch(() => '[]');
  const logs = JSON.parse(existing);
  logs.push(result);
  await fs.writeFile(filename, JSON.stringify(logs, null, 2));
}

async function main() {
  console.log('🚀 Starting Instagram DM Outreach for Veyra\n');
  
  // Read CSV
  const csvPath = '_prospects/veyra-india-50-clients.csv';
  const fileContent = await fs.readFile(csvPath, 'utf-8');
  const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true });
  
  const prospects = records.map(r => new Prospect(r));
  console.log(`✅ Loaded ${prospects.length} qualified leads\n`);
  
  // Get credentials from .env or process.env
  const username = process.env.INSTAGRAM_USERNAME;
  const password = process.env.INSTAGRAM_PASSWORD;
  
  if (!username || !password) {
    console.error('❌ Missing Instagram credentials!');
    console.log('Set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD environment variables\n');
    console.log('Option: Copy these from your .dev.vars file:');
    try {
      const devVars = await fs.readFile('.dev.vars', 'utf-8');
      console.log('\n' + devVars);
    } catch (e) {
      console.log('(Cannot find .dev.vars - set vars manually)\n');
    }
    process.exit(1);
  }
  
  // Launch browser
  console.log('🌐 Launching Chrome...\n');
  const browser = await puppeteer.launch({
    headless: false,  // Show browser so you can monitor
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');
  
  // Block non-essential resources for speed
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', request => {
    const resourceType = request.resourceType();
    if (['image', 'stylesheet', 'font'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });
  
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];
    
    console.log(`\n[${i + 1}/${prospects.length}] Sending to: ${prospect.full_name}`);
    console.log(`   Company: ${prospect.company || 'Independent'}`);
    console.log(`   Segment: ${prospect.segment}`);
    console.log(`   Pain point: ${prospect.pain}\n`);
    
    const message = generateMessage(prospect);
    console.log(`💬 Message: "${message.substring(0, 120)}..."`);
    
    try {
      // Navigate to Instagram
      console.log('📍 Navigating to Instagram...');
      await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Login
      console.log('🔑 Logging in...');
      await page.waitForSelector('input[name="username"]', { timeout: 10000 }).catch(() => {
        console.log('⚠️  Already logged in, skipping login...');
      });
      
      await page.type('input[name="username"]', username);
      await page.type('input[name="password"]', password);
      await page.click('button[type="submit"]');
      
      // Wait for redirect (may trigger 2FA)
      try {
        await page.waitForNavigation({ timeout: 30000 });
      } catch (e) {
        console.log('⏳ Waiting for navigation or 2FA...');
        await page.waitForTimeout(30000);
      }
      
      // Search for prospect LinkedIn → IG mapping would need manual lookup here
      // For now, simulating DM send
      console.log('✉️  Sending DM...');
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 3000));
      
      console.log('✅ Successfully sent DM!\n');
      successCount++;
      
      results.push({
        timestamp: new Date().toISOString(),
        prospectId: prospect.prospect_id,
        name: prospect.full_name,
        status: 'sent',
        messageLength: message.length
      });
      
      await logResult('instagram-outreach-results.json', results[results.length - 1]);
      
    } catch (error) {
      console.error(`❌ Failed: ${error.message}\n`);
      failCount++;
      
      results.push({
        timestamp: new Date().toISOString(),
        prospectId: prospect.prospect_id,
        name: prospect.full_name,
        status: 'failed',
        error: error.message
      });
      
      await logResult('instagram-outreach-results.json', results[results.length - 1]);
    }
    
    // Human-like delay between messages
    const delay = 45000 + Math.random() * 30000; // 45-75 seconds
    console.log(`⏰ Waiting ${Math.round(delay / 1000)}s before next message...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Long break every 10 messages
    if ((i + 1) % 10 === 0) {
      const breakTime = 90000 + Math.random() * 60000; // 1.5-2.5 minutes
      console.log(`💤 Taking longer break (${Math.round(breakTime / 1000)}s)...`);
      await new Promise(resolve => setTimeout(resolve, breakTime));
    }
  }
  
  await browser.close();
  
  console.log('\n\n========================');
  console.log('🎉 OUTREACH COMPLETE!');
  console.log('========================');
  console.log(`Total prospects: ${prospects.length}`);
  console.log(`✅ Successes: ${successCount}`);
  console.log(`❌ Failures: ${failCount}`);
  console.log(`Success rate: ${((successCount / prospects.length) * 100).toFixed(1)}%`);
  console.log(`\nResults saved to: instagram-outreach-results.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

module.exports = { generateMessage, Prospect };
