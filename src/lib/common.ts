/**
 * A few beginner phrases are split into separate words by the frequency corpus,
 * which makes them rank poorly. Give them an explicit high priority.
 */
export const COMMON_FREQUENCY: Record<string, number> = {
  你好: 1,
  谢谢: 2,
  再见: 3,
  对不起: 4,
  没关系: 5,
  请问: 6,
  不客气: 7,
  晚安: 8,
  早安: 9,
  好久不见: 10,
};
