export const calculateHealthScore = (vulnerabilities, outdatedPackages) => {
  let score = 100;

  const criticals = vulnerabilities.filter(v => v.severity === 'CRITICAL');
  const highs = vulnerabilities.filter(v => v.severity === 'HIGH');
  const mediums = vulnerabilities.filter(v => v.severity === 'MEDIUM');
  const lows = vulnerabilities.filter(v => v.severity === 'LOW');

  const criticalDeduction = Math.min(criticals.length * 20, 40);
  const highDeduction = Math.min(highs.length * 10, 20);
  const mediumDeduction = Math.min(mediums.length * 5, 10);
  const lowDeduction = Math.min(lows.length * 1, 5);

  const majorOutdated = outdatedPackages.filter(p => p.updateType === 'major');
  const minorOutdated = outdatedPackages.filter(p => p.updateType === 'minor');

  const majorDeduction = Math.min(majorOutdated.length * 3, 15);
  const minorDeduction = Math.min(minorOutdated.length * 1, 5);

  score -= (criticalDeduction + highDeduction + mediumDeduction + lowDeduction + majorDeduction + minorDeduction);
  score = Math.max(0, Math.round(score));

  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return { score, grade };
};
