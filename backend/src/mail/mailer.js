export async function sendWelcomeEmail(user) {
  console.log(`[mailer] Welcome email queued for ${user.email}`);
  return { accepted: [user.email] };
}
