// Common disposable/temporary email providers. This blocks the majority of
// throwaway signups (10minutemail, mailinator, guerrillamail, etc.) but
// CANNOT verify someone actually owns a real address like bob@gmail.com —
// that level of certainty only comes from an email-confirmation click,
// which is intentionally disabled here. This is a first line of defense,
// not full verification.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '20minutemail.com', '33mail.com',
  'anonymbox.com', 'armyspy.com', 'burnermail.io', 'correotemporal.org',
  'crazymailing.com', 'cuvox.de', 'dayrep.com', 'discard.email',
  'discardmail.com', 'dispostable.com', 'dropmail.me', 'e4ward.com',
  'einrot.com', 'emailfake.com', 'emailondeck.com', 'emailtemporario.com.br',
  'fakeinbox.com', 'fake-mail.net', 'fakemailgenerator.com', 'fleckens.hu',
  'getairmail.com', 'getnada.com', 'guerrillamail.com', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamailblock.com', 'gustr.com', 'harakirimail.com',
  'incognitomail.com', 'inboxbear.com', 'jetable.org', 'jourrapide.com',
  'luxusmail.org', 'mailcatch.com', 'maildrop.cc', 'mailexpire.com',
  'mailin8r.com', 'mailinator.com', 'mailinator.net', 'mailinator2.com',
  'mailnesia.com', 'mailnull.com', 'mailslurp.com', 'mailtemp.info',
  'meltmail.com', 'mintemail.com', 'mohmal.com', 'moakt.com', 'mt2014.com',
  'mt2015.com', 'mytemp.email', 'mytrashmail.com', 'no-spam.ws', 'pokemail.net',
  'rhyta.com', 'safetymail.info', 'sharklasers.com', 'sneakemail.com',
  'sogetthis.com', 'spam4.me', 'spamavert.com', 'spambog.com', 'spamcowboy.com',
  'spamex.com', 'spamfree24.org', 'spamgourmet.com', 'superrito.com',
  'teleworm.us', 'temp-mail.io', 'temp-mail.org', 'tempail.com', 'tempemail.co',
  'tempinbox.com', 'tempmail.de', 'tempmail.net', 'tempmailo.com',
  'tempmailaddress.com', 'tempr.email', 'tempymail.com', 'throwam.com',
  'throwawaymail.com', 'tmail.ws', 'tmpeml.com', 'tmpmail.net', 'tmpmail.org',
  'trashmail.com', 'trashmail.me', 'trashmail.net', 'trbvm.com',
  'wegwerfemail.de', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}
