const STAFF_EMAIL_DOMAIN = import.meta.env.STAFF_EMAIL_DOMAIN ?? 'staff.invalid'

export function buildStaffEmail(username: string, slug: string) {
  return `${username}@${slug}.${STAFF_EMAIL_DOMAIN}`
}
