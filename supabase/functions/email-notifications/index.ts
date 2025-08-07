import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailNotificationRequest {
  type: 'lead_assigned' | 'deal_won' | 'project_due' | 'task_assigned' | 'activity_reminder';
  recipient_id: string;
  data: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, recipient_id, data } = await req.json() as EmailNotificationRequest;

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get recipient user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', recipient_id)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${recipient_id}`);
    }

    // Generate email content based on type
    const emailContent = generateEmailContent(type, user, data);

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'ACE CRM <notifications@acewebdesigners.com>',
        to: [user.email],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const emailResult = await resendResponse.json();

    // Log the notification
    await supabase
      .from('activities')
      .insert([{
        type_id: null, // System notification
        subject: `Email Notification: ${emailContent.subject}`,
        body: `Email sent to ${user.email}`,
        activity_date: new Date().toISOString(),
        related_to_type: 'user',
        related_to_id: recipient_id,
        created_by: null, // System
      }]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailResult.id,
        message: 'Email notification sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email notification error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateEmailContent(type: string, user: any, data: any) {
  const userName = `${user.first_name} ${user.last_name}`;

  switch (type) {
    case 'lead_assigned':
      return {
        subject: 'New Lead Assigned to You',
        html: `
          <h2>Hello ${userName},</h2>
          <p>A new lead has been assigned to you:</p>
          <ul>
            <li><strong>Lead:</strong> ${data.lead_title}</li>
            <li><strong>Company:</strong> ${data.company_name}</li>
            <li><strong>Estimated Value:</strong> $${data.estimated_value}</li>
            <li><strong>Priority:</strong> ${data.priority}</li>
          </ul>
          <p>Please review the lead details and follow up promptly.</p>
          <p><a href="${data.dashboard_url}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Lead</a></p>
          <p>Best regards,<br>ACE CRM Team</p>
        `,
        text: `Hello ${userName},\n\nA new lead has been assigned to you:\n\nLead: ${data.lead_title}\nCompany: ${data.company_name}\nEstimated Value: $${data.estimated_value}\nPriority: ${data.priority}\n\nPlease review the lead details and follow up promptly.\n\nView Lead: ${data.dashboard_url}\n\nBest regards,\nACE CRM Team`
      };

    case 'deal_won':
      return {
        subject: 'Congratulations! Deal Won',
        html: `
          <h2>Congratulations ${userName}!</h2>
          <p>Your deal has been marked as won:</p>
          <ul>
            <li><strong>Deal:</strong> ${data.deal_title}</li>
            <li><strong>Company:</strong> ${data.company_name}</li>
            <li><strong>Value:</strong> $${data.deal_value}</li>
            <li><strong>Close Date:</strong> ${data.close_date}</li>
          </ul>
          <p>Great job closing this deal! 🎉</p>
          <p><a href="${data.dashboard_url}" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Deal</a></p>
          <p>Best regards,<br>ACE CRM Team</p>
        `,
        text: `Congratulations ${userName}!\n\nYour deal has been marked as won:\n\nDeal: ${data.deal_title}\nCompany: ${data.company_name}\nValue: $${data.deal_value}\nClose Date: ${data.close_date}\n\nGreat job closing this deal!\n\nView Deal: ${data.dashboard_url}\n\nBest regards,\nACE CRM Team`
      };

    case 'project_due':
      return {
        subject: 'Project Due Date Approaching',
        html: `
          <h2>Hello ${userName},</h2>
          <p>A project you're managing is approaching its due date:</p>
          <ul>
            <li><strong>Project:</strong> ${data.project_name}</li>
            <li><strong>Company:</strong> ${data.company_name}</li>
            <li><strong>Due Date:</strong> ${data.due_date}</li>
            <li><strong>Days Remaining:</strong> ${data.days_remaining}</li>
            <li><strong>Completion:</strong> ${data.completion_percentage}%</li>
          </ul>
          <p>Please review the project status and ensure timely completion.</p>
          <p><a href="${data.project_url}" style="background-color: #F59E0B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Project</a></p>
          <p>Best regards,<br>ACE CRM Team</p>
        `,
        text: `Hello ${userName},\n\nA project you're managing is approaching its due date:\n\nProject: ${data.project_name}\nCompany: ${data.company_name}\nDue Date: ${data.due_date}\nDays Remaining: ${data.days_remaining}\nCompletion: ${data.completion_percentage}%\n\nPlease review the project status and ensure timely completion.\n\nView Project: ${data.project_url}\n\nBest regards,\nACE CRM Team`
      };

    case 'task_assigned':
      return {
        subject: 'New Task Assigned',
        html: `
          <h2>Hello ${userName},</h2>
          <p>A new task has been assigned to you:</p>
          <ul>
            <li><strong>Task:</strong> ${data.task_title}</li>
            <li><strong>Project:</strong> ${data.project_name}</li>
            <li><strong>Due Date:</strong> ${data.due_date}</li>
            <li><strong>Priority:</strong> ${data.priority}</li>
            <li><strong>Estimated Hours:</strong> ${data.estimated_hours}</li>
          </ul>
          <p>Description: ${data.description || 'No description provided.'}</p>
          <p><a href="${data.task_url}" style="background-color: #8B5CF6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a></p>
          <p>Best regards,<br>ACE CRM Team</p>
        `,
        text: `Hello ${userName},\n\nA new task has been assigned to you:\n\nTask: ${data.task_title}\nProject: ${data.project_name}\nDue Date: ${data.due_date}\nPriority: ${data.priority}\nEstimated Hours: ${data.estimated_hours}\n\nDescription: ${data.description || 'No description provided.'}\n\nView Task: ${data.task_url}\n\nBest regards,\nACE CRM Team`
      };

    case 'activity_reminder':
      return {
        subject: 'Activity Reminder',
        html: `
          <h2>Hello ${userName},</h2>
          <p>This is a reminder about your upcoming activity:</p>
          <ul>
            <li><strong>Activity:</strong> ${data.activity_subject}</li>
            <li><strong>Type:</strong> ${data.activity_type}</li>
            <li><strong>Date & Time:</strong> ${data.activity_date}</li>
            <li><strong>Related to:</strong> ${data.related_entity}</li>
          </ul>
          <p>Notes: ${data.notes || 'No additional notes.'}</p>
          <p><a href="${data.activity_url}" style="background-color: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Activity</a></p>
          <p>Best regards,<br>ACE CRM Team</p>
        `,
        text: `Hello ${userName},\n\nThis is a reminder about your upcoming activity:\n\nActivity: ${data.activity_subject}\nType: ${data.activity_type}\nDate & Time: ${data.activity_date}\nRelated to: ${data.related_entity}\n\nNotes: ${data.notes || 'No additional notes.'}\n\nView Activity: ${data.activity_url}\n\nBest regards,\nACE CRM Team`
      };

    default:
      return {
        subject: 'Notification from ACE CRM',
        html: `
          <h2>Hello ${userName},</h2>
          <p>You have a new notification from ACE CRM.</p>
          <p><a href="${data.dashboard_url}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
          <p>Best regards,<br>ACE CRM Team</p>
        `,
        text: `Hello ${userName},\n\nYou have a new notification from ACE CRM.\n\nView Dashboard: ${data.dashboard_url}\n\nBest regards,\nACE CRM Team`
      };
  }
}