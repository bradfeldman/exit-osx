/**
 * Update existing questions with their IssueTier classifications
 * Based on M&A buyer risk analysis:
 * - CRITICAL: Deal killers (60% of value gap)
 * - SIGNIFICANT: Major value impact (30% of value gap)
 * - OPTIMIZATION: Nice to have improvements (10% of value gap)
 */

import { prisma } from '../src/lib/prisma';

// Map question text patterns to their issue tiers
const TIER_MAPPINGS: { pattern: string; tier: 'CRITICAL' | 'SIGNIFICANT' | 'OPTIMIZATION' }[] = [
  // CRITICAL - Deal killers
  { pattern: 'diversified is your customer base', tier: 'CRITICAL' },           // Customer concentration
  { pattern: 'accurate and up-to-date are your financial', tier: 'CRITICAL' },  // Financial credibility
  { pattern: 'dependent is the business on you', tier: 'CRITICAL' },            // Owner dependency
  { pattern: 'capable management team', tier: 'CRITICAL' },                     // Management team
  { pattern: 'customer relationships dependent on you', tier: 'CRITICAL' },     // Customer relationships
  { pattern: 'pending litigation', tier: 'CRITICAL' },                          // Legal issues

  // SIGNIFICANT - Major value impact
  { pattern: 'consistent has your revenue been', tier: 'SIGNIFICANT' },         // Revenue consistency
  { pattern: 'recurring sources', tier: 'SIGNIFICANT' },                        // Recurring revenue
  { pattern: 'predictable is the company', tier: 'SIGNIFICANT' },               // Cash flow predictability
  { pattern: 'negative operating cash flow', tier: 'SIGNIFICANT' },             // Negative cash flow
  { pattern: 'documented are your business processes', tier: 'SIGNIFICANT' },   // Process documentation
  { pattern: 'employee retention', tier: 'SIGNIFICANT' },                       // Employee retention
  { pattern: 'clean is your corporate structure', tier: 'SIGNIFICANT' },        // Corporate structure
  { pattern: 'contracts, licenses, and permits', tier: 'SIGNIFICANT' },         // Contracts transferable
  { pattern: 'separated personal and business', tier: 'SIGNIFICANT' },          // Personal/business separation

  // OPTIMIZATION - Nice to have (all others default to this)
  { pattern: 'gross profit margin', tier: 'OPTIMIZATION' },                     // Gross margin
  { pattern: 'scalable is your current business', tier: 'OPTIMIZATION' },       // Scalability
  { pattern: 'technology infrastructure', tier: 'OPTIMIZATION' },               // Technology
  { pattern: 'vendor/supplier agreements', tier: 'OPTIMIZATION' },              // Vendor agreements
  { pattern: 'growth trajectory', tier: 'OPTIMIZATION' },                       // Market growth
  { pattern: 'competitive position', tier: 'OPTIMIZATION' },                    // Competitive position
  { pattern: 'proprietary products, IP', tier: 'OPTIMIZATION' },                // IP/Proprietary
  { pattern: 'exit timeline', tier: 'OPTIMIZATION' },                           // Exit timeline
  { pattern: 'key employees aware', tier: 'OPTIMIZATION' },                     // Employee awareness
];

async function main() {
  console.log('Updating question issue tiers...\n');

  const questions = await prisma.question.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' }
  });

  let criticalCount = 0;
  let significantCount = 0;
  let optimizationCount = 0;

  for (const question of questions) {
    const questionTextLower = question.questionText.toLowerCase();

    // Find matching tier
    let tier: 'CRITICAL' | 'SIGNIFICANT' | 'OPTIMIZATION' = 'OPTIMIZATION'; // Default
    for (const mapping of TIER_MAPPINGS) {
      if (questionTextLower.includes(mapping.pattern.toLowerCase())) {
        tier = mapping.tier;
        break;
      }
    }

    // Update the question
    await prisma.question.update({
      where: { id: question.id },
      data: { issueTier: tier }
    });

    const tierLabel = tier === 'CRITICAL' ? '🔴 CRITICAL' :
                      tier === 'SIGNIFICANT' ? '🟡 SIGNIFICANT' :
                      '🟢 OPTIMIZATION';
    console.log(tierLabel + ': ' + question.questionText.substring(0, 60) + '...');

    if (tier === 'CRITICAL') criticalCount++;
    else if (tier === 'SIGNIFICANT') significantCount++;
    else optimizationCount++;
  }

  console.log('\n=== Summary ===');
  console.log('CRITICAL (60% of value gap):    ' + criticalCount + ' questions');
  console.log('SIGNIFICANT (30% of value gap): ' + significantCount + ' questions');
  console.log('OPTIMIZATION (10% of value gap): ' + optimizationCount + ' questions');
  console.log('Total: ' + questions.length + ' questions');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
