import { historyLearningContent } from '../../chapters/history/learning-data';
import { historyExhibits } from '../../chapters/history/data';

/** The museum's pure teaching data remains the only historical fact source. */
export function getHistorySource() {
  return { learning: historyLearningContent, exhibits: historyExhibits as readonly (typeof historyExhibits)[number][] } as const;
}
