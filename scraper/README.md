# Wrestling Boxscore Fantasy League Scraper

This scraper extracts match data from your Wrestling Boxscore website and calculates fantasy league points based on your scoring system.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials:
     ```
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Test connection:**
   ```bash
   npm start
   ```

## Usage

```bash
# Run the scraper
npm start

# Run in dry-run mode (testing)
npm test
```

## Project Structure

```
scraper/
├── src/
│   ├── config/          # Configuration files (Supabase client)
│   ├── extractors/      # Data extraction from Supabase
│   ├── parsers/         # Parse and classify data
│   ├── calculators/     # Calculate fantasy league points
│   ├── exporters/       # Export to CSV/Excel
│   └── utils/           # Utility functions
└── output/              # Generated spreadsheet files
```

## Development Status

🚧 **In Progress** - Currently setting up project structure and basic data extraction.

## Next Steps

- [x] Project setup
- [ ] Data extraction functions
- [ ] Event classification
- [ ] Match parsing
- [ ] Points calculation
- [ ] CSV export
- [ ] Testing

