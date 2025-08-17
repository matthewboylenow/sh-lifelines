# Typeform Integration Guide

## 🔗 **Form URL**
**Production Typeform**: https://sainthelen.typeform.com/to/SD7a7QhM

## ⚙️ **Webhook Configuration**

### **1. Webhook Endpoint**
- **URL**: `https://yourdomain.com/api/webhooks/typeform`
- **Method**: POST
- **Content-Type**: application/json

### **2. Environment Variables Required**
```bash
# Add to your .env.local file
TYPEFORM_WEBHOOK_SECRET=your-typeform-webhook-secret-here
```

### **3. Typeform Setup Steps**

1. **Log into Typeform** and go to your form dashboard
2. **Navigate to Connect > Webhooks**
3. **Add New Webhook**:
   - URL: `https://yourdomain.com/api/webhooks/typeform`
   - Secret: Generate a secure secret and add to your environment variables
   - Events: Select "Form response submitted"

4. **Test the webhook** using the test button in Typeform

### **4. Field Mapping Configuration**

The webhook expects the following field references in your Typeform:

| Database Field | Typeform Field Ref | Type | Required |
|---|---|---|---|
| `groupLeader` | `group_leader` | Short text | ✅ Required |
| `leaderEmail` | `leader_email` | Email | ✅ Required |
| `cellPhone` | `cell_phone` | Phone number | Optional |
| `title` | `lifeline_title` | Short text | Optional |
| `description` | `lifeline_description` | Long text | Optional |
| `agesStages` | `ages_stages` | Multiple choice | Optional |
| `groupType` | `group_type` | Dropdown | Optional |
| `meetingFrequency` | `meeting_frequency` | Dropdown | Optional |
| `dayOfWeek` | `day_of_week` | Dropdown | Optional |
| `meetingTime` | `meeting_time` | Short text | Optional |

### **5. Dropdown Value Mapping**

**Group Types** (map to these exact labels):
- Social/Fellowship → `SOCIAL`
- Activity Based → `ACTIVITY` 
- Scripture Based → `SCRIPTURE_BASED`
- Sunday Based → `SUNDAY_BASED`

**Meeting Frequency** (map to these exact labels):
- Weekly → `WEEKLY`
- Bi-weekly → `MONTHLY`
- Monthly → `MONTHLY` 
- Quarterly → `SEASONALLY`
- As Needed → `SEASONALLY`

**Day of Week** (map to these exact labels):
- Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Varies

## 🔄 **Workflow Process**

1. **User submits Typeform** → Webhook triggered
2. **Formation request created** → Status: `SUBMITTED`
3. **Email notification sent** → To formation support team
4. **48-hour review period** → Automatic approval if no objections
5. **Upon approval** → LifeLine created, Leader account created
6. **Welcome email sent** → To new leader with login credentials

## 🛠️ **Troubleshooting**

### **Check Webhook Health**
Visit: `https://yourdomain.com/api/webhooks/typeform` (GET request)
- Should return: `{"success": true, "message": "Typeform webhook endpoint is configured correctly"}`

### **Common Issues**
1. **Invalid signature**: Check `TYPEFORM_WEBHOOK_SECRET` environment variable
2. **Missing required fields**: Ensure `group_leader` and `leader_email` field refs exist
3. **Duplicate submissions**: System ignores submissions within 5 minutes of same email

### **Logs**
Check server logs for detailed webhook processing information:
- Formation request creation logs
- Field mapping validation
- Email notification status

## 🔐 **Security Notes**

- Webhook signature verification prevents unauthorized submissions
- Duplicate detection prevents spam/resubmissions
- All email addresses are validated before processing
- Auto-approval has built-in safeguards and manual override capability

---

**✅ Integration Status: FULLY IMPLEMENTED**
- Webhook endpoint: Ready ✅
- Field mapping: Configured ✅
- Email notifications: Active ✅
- Auto-approval logic: Implemented ✅