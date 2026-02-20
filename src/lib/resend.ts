import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export async function sendTeamInviteEmail(
  email: string,
  inviterName: string,
  orgName: string,
  inviteUrl: string,
) {
  if (!process.env.RESEND_API_KEY) {
    console.log("⚠️ Resend Key missing. Logging email instead:");
    console.log(`To: ${email}, Link: ${inviteUrl}`);
    return { success: true };
  }

  try {
    const data = await resend.emails.send({
      from: `AdSync <${FROM_EMAIL}>`,
      to: [email],
      subject: `${inviterName} invited you to join ${orgName} on AdSync`,
      // For MVP, using simple HTML. In Phase 2, use React Email components.
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Join ${orgName} on AdSync</h2>
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to collaborate on ad campaigns.</p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Or copy this link: <br />
            <a href="${inviteUrl}">${inviteUrl}</a>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 40px;">
            If you didn't expect this invitation, you can ignore this email.
          </p>
        </div>
      `,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Resend Error:", error);
    return { success: false, error };
  }
}
