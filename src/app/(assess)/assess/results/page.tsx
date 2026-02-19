import { AssessmentFlow } from '@/components/assess/AssessmentFlow'

export default function AssessResultsPage() {
  // Results page renders the same flow but starts at the results step.
  // The AssessmentFlow component reads session storage to determine state.
  return <AssessmentFlow initialStep="results" />
}
