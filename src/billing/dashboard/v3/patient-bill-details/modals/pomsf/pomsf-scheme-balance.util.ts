import { type PomsfBalance } from '../../../../../../claims';
import { type Scheme } from '../../../../../../registry/types';

export function getSchemeBalance(pomsfBalance: PomsfBalance | null | undefined, scheme: Scheme): number {
  if (!pomsfBalance) {
    return 0;
  }

  const matchingPolicy = pomsfBalance.memberPolicies?.find((memberPolicy) => {
    const policyId = memberPolicy.policy?.policyId;
    const policyCode = memberPolicy.policy?.policyCode;
    const policyNumber = scheme.policy?.number;

    return (
      memberPolicy.policy?.schemeName?.trim().toLowerCase() === scheme.schemeName.trim().toLowerCase() &&
      Boolean(policyNumber && (policyId === policyNumber || policyCode === policyNumber))
    );
  });

  return (
    matchingPolicy?.benefit?.reduce(
      (total, benefit) =>
        total + (benefit.balance?.reduce((balance, item) => balance + Number(item.balance ?? 0), 0) ?? 0),
      0,
    ) ?? 0
  );
}
