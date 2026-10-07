import { type PomsfBalance } from '../../../../../claims';
import { type Scheme } from '../../../../../registry/types';
import { getSchemeBalance } from './pomsf-scheme-balance.util';

function makeScheme(schemeName: string, policyNumber: string): Scheme {
  return {
    schemeName,
    memberType: 'BENEFICIARY',
    coverageType: 'SHIF',
    policy: { startDate: '', endDate: '', number: policyNumber },
    coverage: { startDate: '', endDate: '', message: '', reason: '', possibleSolution: null, status: '1' },
    principalContributor: {
      idNumber: '',
      name: '',
      crNumber: '',
      relationship: '',
      employmentType: '',
      employerDetails: undefined,
    },
  } as Scheme;
}

function makeBalance(): PomsfBalance {
  return {
    memberPolicies: [
      {
        policy: {
          policyId: 'POLICY-1',
          schemeName: 'POMSF',
          policyCode: 'POLICY-1',
        },
        benefit: [
          { benefitCode: 'PMF-12', balance: [{ member: 'self', balance: 100000 }] },
          { benefitCode: 'PMF-07', balance: [{ member: 'self', balance: 50000 }] },
        ],
      },
      {
        policy: {
          policyId: 'POLICY-2',
          schemeName: 'Usalama',
          policyCode: 'POLICY-2',
        },
        benefit: [{ benefitCode: 'PMF-12', balance: [{ member: 'self', balance: 250000 }] }],
      },
    ],
  } as unknown as PomsfBalance;
}

describe('getSchemeBalance', () => {
  it('returns the summed balance for each matching scheme policy', () => {
    const balance = makeBalance();

    expect(getSchemeBalance(balance, makeScheme('POMSF', 'POLICY-1'))).toBe(150000);
    expect(getSchemeBalance(balance, makeScheme('Usalama', 'POLICY-2'))).toBe(250000);
  });
});
