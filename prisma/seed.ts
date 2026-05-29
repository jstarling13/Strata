import { PrismaClient } from "@prisma/client";

type ShiftSlot = "morning" | "lunch" | "afternoon" | "evening";

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

const prisma = new PrismaClient();

const STAFF = [
  { displayName: "Maria Santos", role: "Server", hourlyRate: 14 },
  { displayName: "James Lee", role: "Server", hourlyRate: 13 },
  { displayName: "Priya Patel", role: "Barista", hourlyRate: 16 },
  { displayName: "Devon Clark", role: "Server", hourlyRate: 14 },
  { displayName: "Sam Torres", role: "Host", hourlyRate: 13 },
];

const SHIFT_SLOTS: { slot: ShiftSlot; startHour: number }[] = [
  { slot: "morning", startHour: 7 },
  { slot: "lunch", startHour: 12 },
  { slot: "afternoon", startHour: 15 },
  { slot: "evening", startHour: 19 },
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate realistic repeat customer pools per staff member
// Maria and Priya have high repeat rates, Devon has low
const REPEAT_RATES: Record<string, number> = {
  "Maria Santos": 0.68,
  "Priya Patel": 0.61,
  "James Lee": 0.45,
  "Devon Clark": 0.22,
  "Sam Torres": 0.38,
};

async function main() {
  console.log("🌱 Seeding Strata with realistic fake data...");

  // Create seed org
  const org = await prisma.organization.upsert({
    where: { clerkUserId: "seed_user_001" },
    create: {
      clerkUserId: "seed_user_001",
      name: "The Corner Table",
      type: "restaurant",
      locationCount: 1,
      staffCount: STAFF.length,
      laborCostTarget: 0.3,
      plan: "standard",
      onboardingDone: true,
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
    },
    update: {},
  });

  console.log(`✓ Org created: ${org.name} (${org.id})`);

  // Create staff
  const staffMembers: Array<{ id: string; displayName: string; repeatRate: number }> = [];
  for (const s of STAFF) {
    const member = await prisma.staffMember.create({
      data: { orgId: org.id, displayName: s.displayName, role: s.role, hourlyRate: s.hourlyRate },
    });
    staffMembers.push({ id: member.id, displayName: s.displayName, repeatRate: REPEAT_RATES[s.displayName] || 0.35 });
  }
  console.log(`✓ Created ${staffMembers.length} staff members`);

  // Build customer pools (each staff member "owns" some regulars)
  const allCustomerIds: string[] = Array.from({ length: 400 }, (_, i) => `CUST${String(i + 1).padStart(4, "0")}`);
  const staffCustomerPools: Record<string, string[]> = {};
  for (const s of staffMembers) {
    const poolSize = Math.floor(80 + Math.random() * 60);
    staffCustomerPools[s.id] = allCustomerIds.slice(0, poolSize).map((id) => `${id}_${s.id.slice(-4)}`);
  }

  // Generate 90 days of transactions
  const txCount = { total: 0 };
  const customerLastSeen: Record<string, Date> = {};

  for (let day = 89; day >= 0; day--) {
    const date = startOfDay(subDays(new Date(), day));
    const dayOfWeek = date.getDay();

    // Fewer transactions on Sunday/Monday
    const dayMultiplier = dayOfWeek === 0 ? 0.5 : dayOfWeek === 1 ? 0.7 : dayOfWeek === 5 || dayOfWeek === 6 ? 1.3 : 1.0;
    const Thursday = dayOfWeek === 4;

    for (const { slot, startHour } of SHIFT_SLOTS) {
      // Thursday lunch is deliberately slow (loss leader scenario)
      const slotMultiplier = Thursday && slot === "lunch" ? 0.3 : 1.0;
      const txPerSlot = Math.floor(rand(8, 20) * dayMultiplier * slotMultiplier);

      for (let t = 0; t < txPerSlot; t++) {
        const staff = pick(staffMembers);
        const txTime = addHours(date, startHour + rand(0, 3));
        const pool = staffCustomerPools[staff.id];

        // Determine if repeat customer based on staff's repeat rate
        const useRepeat = Math.random() < staff.repeatRate && Object.keys(customerLastSeen).length > 0;
        let customerId: string;

        if (useRepeat) {
          // Pick a customer this staff has served before
          const seenBefore = pool.filter((c) => customerLastSeen[c] !== undefined);
          customerId = seenBefore.length > 0 ? pick(seenBefore) : pick(pool);
        } else {
          customerId = pick(pool);
        }

        const saleAmount = rand(18, 65);
        const tip = Math.random() < 0.75 ? saleAmount * rand(0.15, 0.22) : 0;

        await prisma.transaction.create({
          data: {
            orgId: org.id,
            staffId: staff.id,
            customerId,
            saleAmount: Math.round(saleAmount * 100) / 100,
            tip: Math.round(tip * 100) / 100,
            transactedAt: txTime,
            shiftSlot: slot,
          },
        });

        customerLastSeen[customerId] = txTime;
        txCount.total++;
      }
    }
  }

  console.log(`✓ Generated ${txCount.total} transactions over 90 days`);
  console.log(`\n🎯 Test scenarios seeded:`);
  console.log(`   - Maria Santos: ~68% repeat rate (star performer)`);
  console.log(`   - Priya Patel: ~61% repeat rate (strong performer)`);
  console.log(`   - Devon Clark: ~22% repeat rate (low performer)`);
  console.log(`   - Thursday lunch: deliberately slow (loss-leader shift)`);
  console.log(`\n📊 Run the insight agent to generate the first digest:`);
  console.log(`   curl "http://localhost:3000/api/agents/weekly-digest?orgId=${org.id}&secret=$CRON_SECRET"`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
