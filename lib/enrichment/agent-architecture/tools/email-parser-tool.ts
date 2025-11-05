import { parseEmail } from '../../utils/email-detection';
import type { EmailContext } from '../core/types';

export function parseEmailContext(email: string): EmailContext {
  const parsed = parseEmail(email);
  if (!parsed) {
    throw new Error(`Invalid email: ${email}`);
  }

  const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com'];
  const isPersonalEmail = personalDomains.includes(parsed.domain.toLowerCase());

  return {
    email,
    domain: parsed.domain,
    companyDomain: isPersonalEmail ? undefined : parsed.domain,
    personalName: parsed.firstName && parsed.lastName 
      ? `${parsed.firstName} ${parsed.lastName}` 
      : undefined,
    companyNameGuess: parsed.companyName,
    isPersonalEmail,
  };
}

