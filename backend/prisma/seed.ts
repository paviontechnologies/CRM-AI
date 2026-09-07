import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STAGES = [
  { name: 'New', color: '#6b7280', orderIndex: 0 },
  { name: 'Qualified', color: '#3b82f6', orderIndex: 1 },
  { name: 'Contacted', color: '#8b5cf6', orderIndex: 2 },
  { name: 'Replied', color: '#f59e0b', orderIndex: 3 },
  { name: 'Meeting Booked', color: '#ec4899', orderIndex: 4 },
  { name: 'Proposal Sent', color: '#06b6d4', orderIndex: 5 },
  { name: 'Closed Won', color: '#10b981', orderIndex: 6 },
  { name: 'Closed Lost', color: '#ef4444', orderIndex: 7 }
];

const LEADS = [
  { companyName: 'CityHealth Clinic', contactName: 'Dr. Rajesh Sharma', email: 'rajesh@cityhealthclinic.com', phone: '+91-9876543210', website: 'https://www.cityhealthclinic.com', industry: 'Healthcare', city: 'Mumbai', country: 'India', employeeSize: '10-50', source: 'ai_generated', status: 'QUALIFIED', intentScore: 85, icpScore: 78, notes: 'Uses manual appointment book, needs digital CRM.' },
  { companyName: 'MediCare Hospital', contactName: 'Dr. Priya Nair', email: 'priya@medicarehospital.com', phone: '+91-9812345670', website: 'https://www.medicarehospital.com', industry: 'Healthcare', city: 'Mumbai', country: 'India', employeeSize: '50-200', source: 'ai_generated', status: 'CONTACTED', intentScore: 91, icpScore: 88, notes: 'Old HMS system, looking to upgrade.' },
  { companyName: 'Sunrise Diagnostics', contactName: 'Amit Verma', email: 'amit@sunrisediagnostics.com', phone: '+91-9822334455', website: 'https://www.sunrisediagnostics.com', industry: 'Healthcare', city: 'Pune', country: 'India', employeeSize: '10-50', source: 'import', status: 'NEW', intentScore: 62, notes: 'Manual report delivery, needs patient follow-up automation.' },
  { companyName: 'Spice Garden Restaurant', contactName: 'Rahul Mehta', email: 'rahul@spicegarden.com', phone: '+91-9833445566', website: 'https://www.spicegarden.com', industry: 'Restaurant', city: 'Delhi', country: 'India', employeeSize: '10-50', source: 'manual', status: 'NEW', notes: 'No online ordering, losing delivery revenue.' },
  { companyName: 'Biryani House', contactName: 'Salim Khan', email: 'salim@biryanihouse.com', phone: '+91-9844556677', website: 'https://www.biryanihouse.com', industry: 'Restaurant', city: 'Hyderabad', country: 'India', employeeSize: '10-50', source: 'manual', status: 'REPLIED', intentScore: 74, notes: 'No QR menu, manual order taking.' },
  { companyName: 'FastMove Logistics', contactName: 'Arun Kumar', email: 'arun@fastmovelogistics.com', phone: '+91-9855667788', website: 'https://www.fastmovelogistics.com', industry: 'Logistics', city: 'Chennai', country: 'India', employeeSize: '50-200', source: 'ai_generated', status: 'MEETING_BOOKED', intentScore: 88, icpScore: 82, notes: 'Manual tracking, no real-time GPS dashboard.' },
  { companyName: 'ShipRight Services', contactName: 'Deepak Joshi', email: 'deepak@shiprightservices.com', phone: '+91-9866778899', website: 'https://www.shiprightservices.com', industry: 'Logistics', city: 'Mumbai', country: 'India', employeeSize: '10-50', source: 'import', status: 'NEW', notes: 'Uses spreadsheets for fleet management.' },
  { companyName: 'BrightFuture Academy', contactName: 'Neha Sharma', email: 'neha@brightfutureacademy.com', phone: '+91-9877889900', website: 'https://www.brightfutureacademy.com', industry: 'Education', city: 'Bangalore', country: 'India', employeeSize: '10-50', source: 'manual', status: 'QUALIFIED', intentScore: 79, notes: 'Manual fee collection and attendance system.' },
  { companyName: 'LearnSmart Institute', contactName: 'Vijay Patel', email: 'vijay@learnsmartinstitute.com', phone: '+91-9888990011', website: 'https://www.learnsmartinstitute.com', industry: 'Education', city: 'Ahmedabad', country: 'India', employeeSize: '10-50', source: 'ai_generated', status: 'NEW', intentScore: 55, notes: 'No ERP, uses Excel for student management.' },
  { companyName: 'Innovate Tech Solutions', contactName: 'Karan Malhotra', email: 'karan@innovatetechsolutions.com', phone: '+91-9899001122', website: 'https://www.innovatetechsolutions.com', industry: 'Technology', city: 'Bangalore', country: 'India', employeeSize: '10-50', source: 'ai_generated', status: 'PROPOSAL_SENT', intentScore: 93, icpScore: 90, notes: 'Growing fast, needs CRM to manage pipeline.' },
  { companyName: 'CloudBase Systems', contactName: 'Rohit Saxena', email: 'rohit@cloudbasesystems.com', phone: '+91-9900112233', website: 'https://www.cloudbasesystems.com', industry: 'Technology', city: 'Pune', country: 'India', employeeSize: '50-200', source: 'import', status: 'CONTACTED', intentScore: 71, notes: 'No formal lead management process.' },
  { companyName: 'DataEdge Analytics', contactName: 'Sneha Iyer', email: 'sneha@dataedgeanalytics.com', phone: '+91-9911223344', website: 'https://www.dataedgeanalytics.com', industry: 'Technology', city: 'Chennai', country: 'India', employeeSize: '10-50', source: 'manual', status: 'NEW', notes: 'Uses manual spreadsheets for client tracking.' },
  { companyName: 'Apollo Wellness Center', contactName: 'Dr. Sunita Patel', email: 'sunita@apollowellness.com', phone: '+91-9922334455', website: 'https://www.apollowellness.com', industry: 'Healthcare', city: 'Delhi', country: 'India', employeeSize: '10-50', source: 'ai_generated', status: 'CLOSED_WON', intentScore: 95, icpScore: 92, notes: 'No patient follow-up system in place.' },
  { companyName: 'The Curry Club', contactName: 'Anjali Gupta', email: 'anjali@thecurryclub.com', phone: '+91-9933445566', website: 'https://www.thecurryclub.com', industry: 'Restaurant', city: 'Mumbai', country: 'India', employeeSize: '10-50', source: 'manual', status: 'CLOSED_LOST', intentScore: 45, notes: 'No loyalty program or CRM for repeat customers.' },
  { companyName: 'CargoLink India', contactName: 'Pradeep Yadav', email: 'pradeep@cargolinkindia.com', phone: '+91-9944556677', website: 'https://www.cargolinkindia.com', industry: 'Logistics', city: 'Delhi', country: 'India', employeeSize: '50-200', source: 'ai_generated', status: 'QUALIFIED', intentScore: 81, icpScore: 75, notes: 'No WMS, needs warehouse automation.' }
];

async function main() {
  console.log('Seeding database...');

  // Idempotency: wipe demo org if it exists
  const existing = await prisma.organization.findUnique({ where: { slug: 'demo-inc' } });
  if (existing) {
    console.log('Demo org already exists — deleting and re-seeding.');
    await prisma.organization.delete({ where: { id: existing.id } });
    await prisma.user.deleteMany({ where: { email: { in: ['demo@demo.com', 'admin@demo.com'] } } });
  }


  const org = await prisma.organization.create({
    data: { name: 'Demo Inc', slug: 'demo-inc' }
  });

  const demoUser = await prisma.user.create({
    data: { email: 'demo@demo.com', name: 'Demo Admin', isVerified: true, source: 'seed' }
  });
  const superUser = await prisma.user.create({
    data: { email: 'admin@demo.com', name: 'Super Admin', isVerified: true, source: 'seed' }
  });

  const demoMember = await prisma.teamMember.create({
    data: { userId: demoUser.id, organizationId: org.id, role: 'ADMIN' }
  });
  await prisma.teamMember.create({
    data: { userId: superUser.id, organizationId: org.id, role: 'SUPERADMIN' }
  });

  await prisma.subscription.create({
    data: { organizationId: org.id, plan: 'free', status: 'active' }
  });

  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId: org.id,
      name: 'Sales Pipeline',
      isDefault: true,
      stages: { create: STAGES }
    },
    include: { stages: { orderBy: { orderIndex: 'asc' } } }
  });

  const leads = [];
  for (const l of LEADS) {
    leads.push(await prisma.lead.create({ data: { ...l, organizationId: org.id } }));
  }
  await prisma.organization.update({
    where: { id: org.id },
    data: { usedLeadCredits: leads.length }
  });

  // Scores + activities for the hot leads
  for (const lead of leads.filter((l) => (l.intentScore ?? 0) >= 80)) {
    await prisma.leadScore.create({
      data: {
        leadId: lead.id,
        score: lead.intentScore!,
        icpScore: lead.icpScore,
        urgency: 70,
        budgetScore: 65,
        reasons: `${lead.companyName} matches your ICP profile strongly. | Growth signals detected in ${lead.city}. | ${lead.industry} shows high software adoption rate.`,
        recommendation: 'Send personalized demo invite immediately.'
      }
    });
    await prisma.activity.create({
      data: { leadId: lead.id, type: 'ai_score', notes: `AI scored ${lead.intentScore}/100` }
    });
  }

  // Deals across stages
  const stageByName = (name: string) => pipeline.stages.find((s) => s.name === name)!;
  const dealDefs = [
    { title: 'MediCare HMS Upgrade', value: 450000, lead: leads[1], stage: 'Contacted' },
    { title: 'FastMove GPS Dashboard', value: 320000, lead: leads[5], stage: 'Meeting Booked' },
    { title: 'Innovate CRM Rollout', value: 275000, lead: leads[9], stage: 'Proposal Sent' },
    { title: 'Apollo Follow-up System', value: 180000, lead: leads[12], stage: 'Closed Won', status: 'won' },
    { title: 'CargoLink WMS Pilot', value: 520000, lead: leads[14], stage: 'Qualified' }
  ];
  for (const d of dealDefs) {
    await prisma.deal.create({
      data: {
        organizationId: org.id,
        title: d.title,
        value: d.value,
        currency: 'INR',
        status: d.status || 'open',
        closedAt: d.status === 'won' ? new Date() : null,
        stageId: stageByName(d.stage).id,
        leadId: d.lead.id,
        assignedToId: demoMember.id,
        expectedCloseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
      }
    });
  }

  // Tasks: one overdue, one due today, one upcoming
  const today = new Date();
  today.setHours(17, 0, 0, 0);
  await prisma.task.create({
    data: {
      organizationId: org.id, title: 'Follow up with MediCare Hospital', description: 'Priya asked for a demo recording.',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), priority: 'high', assignedToId: demoMember.id,
      leadId: leads[1].id, createdById: demoUser.id
    }
  });
  await prisma.task.create({
    data: {
      organizationId: org.id, title: 'Send proposal to Innovate Tech', dueDate: today,
      priority: 'high', assignedToId: demoMember.id, leadId: leads[9].id, createdById: demoUser.id
    }
  });
  await prisma.task.create({
    data: {
      organizationId: org.id, title: 'Prepare CargoLink WMS pilot scope',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), priority: 'medium',
      assignedToId: demoMember.id, leadId: leads[14].id, createdById: demoUser.id
    }
  });

  // Notes
  await prisma.note.create({
    data: { organizationId: org.id, leadId: leads[1].id, authorId: demoUser.id, body: 'Spoke with Dr. Nair — budget approved for Q3, decision committee meets next week.' }
  });
  await prisma.note.create({
    data: { organizationId: org.id, leadId: leads[9].id, authorId: demoUser.id, body: 'Karan wants multi-branch support and a reporting dashboard in the proposal.' }
  });

  // Campaigns
  const campaign1 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: 'Healthcare Outreach — Mumbai',
      description: 'Cold outreach to clinics and hospitals in Mumbai.',
      status: 'draft',
      targetNiche: 'Clinics', targetCity: 'Mumbai', targetIndustry: 'Healthcare',
      steps: {
        create: [
          { type: 'intro', dayOffset: 0, channel: 'email', subject: 'Quick question for {{companyName}}', content: 'Hi {{contactName}},\n\nI noticed {{companyName}} is growing in {{city}}. We help healthcare providers automate patient follow-ups and appointment scheduling.\n\nWorth a 15-minute call this week?\n\nBest,\nDemo Admin', orderIndex: 0 },
          { type: 'followup', dayOffset: 3, channel: 'email', subject: 'Re: Quick question for {{companyName}}', content: 'Hi {{contactName}},\n\nJust floating this back up. Happy to share a 2-minute demo video if easier.\n\nBest,\nDemo Admin', orderIndex: 1 }
        ]
      }
    }
  });
  await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: 'Logistics Q3 Push',
      description: 'Target logistics companies for the WMS product.',
      status: 'draft',
      targetIndustry: 'Logistics',
      steps: {
        create: [
          { type: 'intro', dayOffset: 0, channel: 'email', subject: 'Fleet visibility for {{companyName}}', content: 'Hi {{contactName}},\n\nSpreadsheet-based fleet tracking breaks past 20 vehicles. We give logistics teams a live dashboard in under a week.\n\nOpen to a quick chat?\n\nBest,\nDemo Admin', orderIndex: 0 }
        ]
      }
    }
  });

  // A logged conversation on a lead
  await prisma.message.create({
    data: { leadId: leads[1].id, direction: 'outbound', channel: 'email', subject: 'Quick question for MediCare Hospital', body: 'Hi Dr. Nair, noticed MediCare is upgrading systems...', status: 'sent' }
  });
  await prisma.message.create({
    data: { leadId: leads[1].id, direction: 'inbound', channel: 'email', subject: 'Re: Quick question', body: 'Interested — can you send more details about pricing?', status: 'logged' }
  });

  // Notifications
  await prisma.notification.create({
    data: { organizationId: org.id, userId: demoUser.id, type: 'task_due', title: 'Task overdue: Follow up with MediCare Hospital', link: '/tasks' }
  });
  await prisma.notification.create({
    data: { organizationId: org.id, userId: demoUser.id, type: 'lead_assigned', title: 'You were assigned CargoLink India', link: `/leads/${leads[14].id}` }
  });

  // Niche templates
  const templates = [
    { name: 'Clinic Intro Email', niche: 'Healthcare', channel: 'email', subject: 'Digitize {{companyName}} patient follow-ups', content: 'Hi {{contactName}}, we help clinics automate appointment reminders and patient follow-ups...', isDefault: true },
    { name: 'Restaurant QR Pitch', niche: 'Restaurant', channel: 'email', subject: 'QR menus + online ordering for {{companyName}}', content: 'Hi {{contactName}}, we set up QR menus and online ordering for restaurants like {{companyName}} in 48 hours...', isDefault: true },
    { name: 'Logistics ERP Intro', niche: 'Logistics', channel: 'email', subject: 'Fleet visibility for {{companyName}}', content: 'Hi {{contactName}}, spreadsheets stop working past 20 vehicles. Here is how we fix that...', isDefault: true }
  ];
  for (const t of templates) {
    await prisma.nicheTemplate.create({ data: t });
  }

  console.log('Seed complete.');
  console.log('  Login:      demo@demo.com / Demo1234!');
  console.log('  Superadmin: admin@demo.com / Demo1234!');
  console.log(`  Org: ${org.name} — ${leads.length} leads, ${dealDefs.length} deals, 2 campaigns (campaign1: ${campaign1.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
