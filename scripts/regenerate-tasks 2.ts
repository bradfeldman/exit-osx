/**
 * Regenerate tasks for a company using the new tier-based value allocation
 */

import { prisma } from '../src/lib/prisma';
import { generateTasksForCompany } from '../src/lib/playbook/generate-tasks';

async function main() {
  const companyName = process.argv[2] || 'Wednesday';

  // Find the company
  const company = await prisma.company.findFirst({
    where: { name: { contains: companyName } },
    select: { id: true, name: true }
  });

  if (!company) {
    console.error('Company not found:', companyName);
    process.exit(1);
  }

  console.log('Regenerating tasks for:', company.name);
  console.log('Company ID:', company.id);

  // Get the latest completed assessment responses
  const assessment = await prisma.assessment.findFirst({
    where: {
      companyId: company.id,
      completedAt: { not: null }
    },
    orderBy: { completedAt: 'desc' },
    include: {
      responses: {
        include: {
          question: true,
          selectedOption: true
        }
      }
    }
  });

  if (!assessment) {
    console.error('No completed assessment found for company');
    process.exit(1);
  }

  console.log('Found assessment with', assessment.responses.length, 'responses');

  // Get the latest valuation snapshot
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!snapshot) {
    console.error('No valuation snapshot found');
    process.exit(1);
  }

  console.log('Value gap:', Number(snapshot.valueGap).toLocaleString());

  // Regenerate tasks
  const result = await generateTasksForCompany(
    company.id,
    assessment.responses.map(r => ({
      questionId: r.questionId,
      selectedOptionId: r.selectedOptionId,
      question: {
        id: r.question.id,
        questionText: r.question.questionText,
        briCategory: r.question.briCategory,
        issueTier: r.question.issueTier as 'CRITICAL' | 'SIGNIFICANT' | 'OPTIMIZATION',
        maxImpactPoints: r.question.maxImpactPoints
      },
      selectedOption: {
        id: r.selectedOption.id,
        scoreValue: r.selectedOption.scoreValue
      }
    })),
    snapshot
  );

  console.log('\n=== Results ===');
  console.log('Created:', result.created, 'tasks');
  console.log('Skipped:', result.skipped);

  // Display the new tasks
  const newTasks = await prisma.task.findMany({
    where: {
      companyId: company.id,
      status: 'PENDING'
    },
    orderBy: { rawImpact: 'desc' }
  });

  console.log('\n=== New Tasks (sorted by value) ===');
  newTasks.forEach((t, i) => {
    const tierLabel = t.issueTier === 'CRITICAL' ? '🔴' :
                      t.issueTier === 'SIGNIFICANT' ? '🟡' : '🟢';
    console.log(
      (i + 1) + '. ' + tierLabel + ' [' + t.issueTier + ' / ' + t.effortLevel + '] $' +
      Number(t.rawImpact).toLocaleString() + ' - ' + t.title.substring(0, 50)
    );
  });

  console.log('\n=== Value by Tier ===');
  const criticalValue = newTasks.filter(t => t.issueTier === 'CRITICAL').reduce((s, t) => s + Number(t.rawImpact), 0);
  const significantValue = newTasks.filter(t => t.issueTier === 'SIGNIFICANT').reduce((s, t) => s + Number(t.rawImpact), 0);
  const optimizationValue = newTasks.filter(t => t.issueTier === 'OPTIMIZATION').reduce((s, t) => s + Number(t.rawImpact), 0);

  console.log('CRITICAL:     $' + criticalValue.toLocaleString() + ' (' + newTasks.filter(t => t.issueTier === 'CRITICAL').length + ' tasks)');
  console.log('SIGNIFICANT:  $' + significantValue.toLocaleString() + ' (' + newTasks.filter(t => t.issueTier === 'SIGNIFICANT').length + ' tasks)');
  console.log('OPTIMIZATION: $' + optimizationValue.toLocaleString() + ' (' + newTasks.filter(t => t.issueTier === 'OPTIMIZATION').length + ' tasks)');
  console.log('Total:        $' + (criticalValue + significantValue + optimizationValue).toLocaleString());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
