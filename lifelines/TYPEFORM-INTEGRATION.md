# Typeform Integration Guide

## Overview

The LifeLines application integrates with Typeform to receive formation requests through an external form. When someone submits a formation request via Typeform, it's automatically processed and added to the system for review by the formation support team.

## Webhook Endpoint

**URL**: `https://your-domain.com/api/webhooks/typeform`
**Method**: POST
**Authentication**: HMAC-SHA256 signature verification

## Environment Variables

Add these to your `.env.local` file:

```
TYPEFORM_WEBHOOK_SECRET=your_webhook_secret_here
```

The webhook secret is provided by Typeform when you set up the webhook in your form settings.

## Typeform Form Configuration

### Required Questions

Your Typeform must include these questions with the specified reference names:

| Database Field | Typeform Reference | Question Type | Required |
|---|---|---|---|
| `groupLeader` | `group_leader` | Short Text | ✅ |
| `leaderEmail` | `leader_email` | Email | ✅ |
| `cellPhone` | `cell_phone` | Phone Number | ❌ |
| `title` | `lifeline_title` | Short Text | ❌ |
| `description` | `lifeline_description` | Long Text | ❌ |
| `agesStages` | `ages_stages` | Multiple Choice | ❌ |
| `groupType` | `group_type` | Multiple Choice | ❌ |
| `meetingFrequency` | `meeting_frequency` | Multiple Choice | ❌ |
| `dayOfWeek` | `day_of_week` | Multiple Choice | ❌ |
| `meetingTime` | `meeting_time` | Short Text | ❌ |

### Question Setup Examples

#### Group Leader (Required)
- **Type**: Short text
- **Reference**: `group_leader`
- **Question**: "What is your full name?"

#### Leader Email (Required)
- **Type**: Email
- **Reference**: `leader_email`
- **Question**: "What is your email address?"

#### Group Type (Optional)
- **Type**: Multiple choice (single selection)
- **Reference**: `group_type`
- **Question**: "What type of LifeLine group would you like to lead?"
- **Options**:
  - Social/Fellowship
  - Activity Based
  - Scripture Based
  - Sunday Based

#### Meeting Frequency (Optional)
- **Type**: Multiple choice (single selection)
- **Reference**: `meeting_frequency`
- **Question**: "How often would you like to meet?"
- **Options**:
  - Weekly
  - Bi-weekly
  - Monthly
  - Quarterly
  - As Needed

#### Day of Week (Optional)
- **Type**: Multiple choice (single selection)
- **Reference**: `day_of_week`
- **Question**: "What day of the week works best for meetings?"
- **Options**:
  - Sunday
  - Monday
  - Tuesday
  - Wednesday
  - Thursday
  - Friday
  - Saturday
  - Varies

## Webhook Configuration in Typeform

1. Go to your Typeform dashboard
2. Open your formation request form
3. Click "Integrate" in the top menu
4. Select "Webhooks"
5. Add a new webhook with:
   - **URL**: `https://your-domain.com/api/webhooks/typeform`
   - **Secret**: Generate a secure secret and add it to your environment variables
   - **Events**: Select "Form submitted"

## Data Processing Flow

1. **Submission**: User submits Typeform
2. **Webhook**: Typeform sends POST request to webhook endpoint
3. **Verification**: Server verifies HMAC signature
4. **Mapping**: Form answers are mapped to database fields using reference names
5. **Validation**: Required fields are checked
6. **Duplicate Check**: System prevents duplicate submissions within 5 minutes
7. **Creation**: Formation request is created with SUBMITTED status
8. **Scheduling**: Auto-approval is scheduled for 48 hours
9. **Notification**: Formation support team receives email notification

## Data Mapping

### Text Fields
- Direct mapping from Typeform text/long text answers to database strings

### Email Fields
- Direct mapping from Typeform email answers to database strings

### Choice Fields (Single Selection)
- Typeform choice labels are mapped to database enums using the VALUE_MAPPING configuration

### Multiple Choice Fields
- Multiple selections are joined with commas for the agesStages field

## Error Handling

The webhook handles various error scenarios:

- **Invalid Signature**: Returns 401 Unauthorized
- **Malformed JSON**: Returns 400 Bad Request
- **Missing Required Fields**: Returns 400 Bad Request with details
- **Duplicate Submissions**: Returns 200 OK but doesn't create duplicate
- **Database Errors**: Returns 500 Internal Server Error
- **Email Failures**: Logged but doesn't fail the webhook

## Testing

### Development Testing
```bash
curl -X POST https://your-domain.com/api/webhooks/typeform \\
  -H "Content-Type: application/json" \\
  -H "Typeform-Signature: sha256=test-signature" \\
  -d '{
    "event_type": "form_response",
    "form_response": {
      "answers": [
        {
          "field": {"ref": "group_leader"},
          "type": "text",
          "text": "Test Leader"
        },
        {
          "field": {"ref": "leader_email"},
          "type": "email", 
          "email": "test@example.com"
        }
      ]
    }
  }'
```

### Production Testing
1. Create a test form in Typeform with the required field references
2. Configure the webhook to point to your production endpoint
3. Submit a test response
4. Verify the formation request appears in the admin dashboard

## Monitoring

### Logs to Monitor
- Formation request creation success/failure
- Webhook signature verification
- Duplicate submission detection
- Email notification status

### Key Metrics
- Webhook success rate
- Average processing time
- Duplicate submission rate
- Email delivery success rate

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Data**
   - Check Typeform webhook URL configuration
   - Verify server is accessible from internet
   - Check firewall/security settings

2. **Signature Verification Failing**
   - Ensure TYPEFORM_WEBHOOK_SECRET matches Typeform configuration
   - Check that webhook secret hasn't changed in Typeform

3. **Field Mapping Issues**
   - Verify Typeform field references match FIELD_MAPPING configuration
   - Check question types match expected formats
   - Review VALUE_MAPPING for choice fields

4. **Missing Formation Requests**
   - Check webhook endpoint logs
   - Verify required fields are present in Typeform
   - Look for duplicate detection triggers

### Debug Mode
Set `NODE_ENV=development` to enable debug logging and skip signature verification.

## Security Considerations

1. **Always verify webhook signatures** in production
2. **Use HTTPS** for webhook endpoints
3. **Validate and sanitize** all incoming data
4. **Rate limit** webhook endpoints if needed
5. **Monitor for suspicious activity** or malformed requests

## Customization

To modify field mappings:

1. Update `FIELD_MAPPING` object in `/src/app/api/webhooks/typeform/route.ts`
2. Update `VALUE_MAPPING` for enum fields
3. Modify corresponding Typeform field references
4. Test thoroughly before deploying

## Support

For issues with:
- **Typeform Configuration**: Contact Typeform support
- **Webhook Processing**: Check application logs and contact development team
- **Email Notifications**: Verify SendGrid configuration and email templates