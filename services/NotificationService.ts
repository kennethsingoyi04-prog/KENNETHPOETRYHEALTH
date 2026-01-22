
/**
 * KENNETHPOETRYHEALTH - Notification Service (Placeholder)
 * This service simulates sending email notifications to the system administrator.
 */

export const sendAdminEmailNotification = (subject: string, body: string) => {
  const adminEmail = 'admin@kennethpoetryhealth.mw';
  
  // Simulation of an email service call (like SendGrid, Mailgun, or a backend API)
  console.log(`%c[OUTGOING EMAIL]%c to: ${adminEmail}\nSubject: ${subject}\n\n${body}`, 
    "color: #D21034; font-weight: bold; background: #000; padding: 2px 4px; border-radius: 3px;", 
    "color: inherit;");
    
  // In a real application, this would be an async fetch call to a backend endpoint:
  /*
  fetch('/api/notify-admin', {
    method: 'POST',
    body: JSON.stringify({ subject, body, to: adminEmail })
  });
  */
};

export const notifyNewRegistration = (userName: string, userEmail: string, referralCode: string) => {
  const subject = `New Affiliate Registered: ${userName}`;
  const body = `
    A new user has joined KENNETHPOETRYHEALTH!
    
    Details:
    - Name: ${userName}
    - Email: ${userEmail}
    - Referral Code: ${referralCode}
    - Signup Date: ${new Date().toLocaleString()}
    
    Check the admin dashboard for more details.
  `;
  sendAdminEmailNotification(subject, body);
};

export const notifyWithdrawalRequest = (userName: string, amount: number, method: string) => {
  const subject = `New Withdrawal Request: MWK ${amount.toLocaleString()} - ${userName}`;
  const body = `
    A withdrawal request has been submitted by an affiliate.
    
    Details:
    - User: ${userName}
    - Amount: MWK ${amount.toLocaleString()}
    - Payment Method: ${method}
    - Request Date: ${new Date().toLocaleString()}
    
    Please review the request and proof of identity in the Admin Control Center.
  `;
  sendAdminEmailNotification(subject, body);
};
