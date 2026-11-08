import { exploreLearningGroups, exploreLearningTasks } from '../../chapters/explore/learning-data';
import { exploreLearningTargets } from '../../chapters/explore/learning-targets';

/** Read-only references to the museum's original teaching facts. No model runtime. */
export function getStructureSource() {
  return {
    tasks: exploreLearningTasks,
    groups: exploreLearningGroups,
    targets: exploreLearningTargets,
  } as const;
}
