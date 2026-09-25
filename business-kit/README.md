# Business Kit: find clients in Saudi Arabia & the UAE

| File | What it does |
|---|---|
| `lead_finder.py` | Finds car rental, travel, Umrah and tourism businesses by city using the Google Places API and saves them to a CSV. Businesses with no website are marked **hot**. |
| `lead-tracker.html` | Your mini CRM: import the CSV, send personalised WhatsApp messages (Arabic or English), track status and follow-ups. |
| `profiles-and-templates.md` | Ready-to-paste profiles for Mostaql, Khamsat, Upwork and LinkedIn, plus WhatsApp, email and proposal templates. |

The DriveNow website (`../index.html`) and admin dashboard (`../admin.html`) are the **live demo** you send to clients.

## 1. Find leads with `lead_finder.py`

1. Go to <https://console.cloud.google.com/>, create a project, enable **Places API (New)**, then create an **API key**. Google gives a free monthly credit; after that, requests are billed.
2. Run:

```bash
export GOOGLE_PLACES_API_KEY="your-key"
python3 lead_finder.py --niche "car rental" --city Riyadh --city Jeddah --out riyadh-jeddah.csv
python3 lead_finder.py --niche "travel agency" --niche "umrah company" --city Makkah --city Madinah
python3 lead_finder.py --only-hot            # all default niches and cities, only businesses without a website
python3 lead_finder.py --language ar         # business names and addresses in Arabic
```

With no options, it searches car rental, travel agency, Umrah company and tourism company in Riyadh, Jeddah, Dammam, Makkah, Madinah, Dubai, Abu Dhabi and Sharjah.

Keep your API key private: never commit it or put it in a web page.

## 2. Contact them with `lead-tracker.html`

Open it at `https://<your-render-site>/business-kit/lead-tracker.html`, or just open the file in your browser.

1. Fill in **Your name** and **Demo link**. The messages use them.
2. Click **Import CSV** and choose the file from step 1. Duplicates are skipped automatically.
3. Click 💬 to open WhatsApp with a personalised message. Check it and press send yourself. The lead moves to *Contacted* and gets a follow-up date 3 days later.
4. Tick **Follow-ups due** each morning and send the follow-up templates from `profiles-and-templates.md`.
5. Click **Export CSV** every week as a backup. The tracker saves data only in your browser.

### Stay on the right side of the rules

- Send messages **one by one** and personalise them. No bulk-messaging tools. WhatsApp bans numbers that get reported, and unsolicited bulk commercial messages can break Saudi (CST) and UAE (TDRA) rules.
- Contact 20–30 new businesses a day at most, and never message someone again after they say no.
- Use your own WhatsApp Business number, with a profile photo and a business description.
