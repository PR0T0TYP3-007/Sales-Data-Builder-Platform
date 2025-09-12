// Pre-defined workflow step templates
export const workflowTemplates = {
  email: {
    type: 'email',
    defaultTemplate: `Subject: Introduction to {company_name}

Dear {contact_name},

I hope this message finds you well. My name is {your_name} from {your_company}, 
and I'm reaching out to introduce our services that I believe could benefit {company_name}.

{personalized_message}

Best regards,
{your_name}
{your_position}
{your_company}`
  },
  phone_call: {
    type: 'phone_call',
    defaultTemplate: `Call Script: Introduction to {company_name}

1. Introduction: "Hello {contact_name}, this is {your_name} from {your_company}"
2. Purpose: "I'm calling to introduce our services that might benefit {company_name}"
3. Value proposition: "{key_benefit}"
4. Call to action: "Would you be open to a brief conversation next week?"`
  },
  linkedin: {
    type: 'linkedin_message',
    defaultTemplate: `Hi {contact_name},

I came across your profile and noticed your role at {company_name}. 
I'd love to connect and potentially explore how we might help your company with {value_proposition}.

Best,
{your_name}`
  }
};

export const getTemplateForType = (type) => {
  return workflowTemplates[type]?.defaultTemplate || '';
};